from rest_framework import status
from django.utils import timezone
from rest_framework.decorators import api_view, parser_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import HttpResponse
from datetime import datetime, timedelta
import traceback
from django.conf import settings
import os
from .permissions_utils import get_user_permissions, update_user_permissions, check_permission

from reportlab.lib.pagesizes import A4, letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, inch
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from io import BytesIO
from django.core.files.base import ContentFile
from mongoengine.connection import get_db

from .models import (
    SuperAdmin,
    User, Student, Company, Admin, InternshipOffer, Application,
    OTPVerification, PendingApproval, Notification, ActivityLog, UserPermission,
    CompanyProfile, UniversityProfile, ChatMessage, PrivateChatMessage,
    CvHistory, GroupChatMessage,
)
from .serializers import (
    StudentRegistrationSerializer,
    CompanyRegistrationSerializer,
    AdminRegistrationSerializer,
    InternshipOfferSerializer,
    ApplicationSerializer,
)
from .auth import create_token
from .otp_utils import create_otp_verification, send_otp_email, verify_otp_code, create_otp_for_password_change
from .email_utils import (
    send_email, send_approval_email, send_rejection_email,
    send_proof_request_email, send_proof_received_confirmation,
    send_application_confirmation_student, send_application_notification_company,
    send_company_response_email, send_validation_pending_to_co_dept,
    send_convention_validated_email, send_convention_rejected_email,
    send_recovery_email_confirmation, send_recovery_email_removed_confirmation,
    send_password_reset_via_recovery_email,
)
from .decorators import jwt_authenticated, role_required
from .activity_logger import log_activity


def cleanup_pending_approval(user_id):
    try:
        pending = PendingApproval.objects(user_id=user_id).first()
        if pending:
            pending.delete()
    except Exception as e:
        print(f"Warning: cleanup failed: {e}")


def _get_user_company(user):
    """Return the Company object for the authenticated company user."""
    if user.sub_role == 'hiring_manager':
        if not user.pending_company_id:
            return None
        try:
            return Company.objects(id=user.pending_company_id).first()
        except Exception:
            return None
    return Company.objects(user=user).first()


# ==================== AUTH ====================

@api_view(['POST'])
def register_student(request):
    serializer = StudentRegistrationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({'success': False, 'errors': serializer.errors},
                        status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    if 'univ' not in data['email'] or '.dz' not in data['email']:
        return Response({'success': False,
                         'errors': {'email': ['Email must contain "univ" and ".dz".']}},
                        status=status.HTTP_400_BAD_REQUEST)

    try:
        if User.objects(email=data['email']).first():
            return Response({'success': False, 'errors': {'email': ['Email already in use.']}},
                            status=status.HTTP_400_BAD_REQUEST)
        if User.objects(username=data['username']).first():
            return Response({'success': False, 'errors': {'username': ['Username already taken.']}},
                            status=status.HTTP_400_BAD_REQUEST)

        user = User(
            username=data['username'],
            email=data['email'],
            role='student',
            sub_role='',
            status=True,
            is_university_email=True,
        )
        user.set_password(data['password'])
        user.save()

        student = Student(
            user=user,
            full_name=data['full_name'],
            wilaya=data['wilaya'],
            skills=data['skills'],
            github=data.get('github', ''),
            portfolio=data.get('portfolio', ''),
            education_level=data['education_level'],
            university=data['university'],
            major=data['major'],
            graduation_year=data['graduation_year'],
        )
        student.save()

        token = create_token(user)
        return Response({
            'success': True,
            'message': 'Registration successful!',
            'token': token,
            'user': {
                'id': str(user.id),
                'email': user.email,
                'role': user.role,
                'full_name': student.full_name,
            },
            'redirect_url': '/student/dashboard',
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        traceback.print_exc()
        if 'user' in locals():
            try:
                user.delete()
            except Exception:
                pass
        return Response({'success': False, 'errors': {'non_field_errors': [str(e)]}},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def register_company(request):
    serializer = CompanyRegistrationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({'success': False, 'errors': serializer.errors},
                        status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    try:
        if User.objects(email=data['email']).first():
            return Response({'success': False, 'errors': {'email': ['Email already in use.']}},
                            status=status.HTTP_400_BAD_REQUEST)
        if User.objects(username=data['username']).first():
            return Response({'success': False, 'errors': {'username': ['Username already taken.']}},
                            status=status.HTTP_400_BAD_REQUEST)

        parent_company = None
        if data['sub_role'] == 'hiring_manager':
            manager_user = User.objects(
                email=data['company_manager_email'],
                role='company',
                sub_role='company_manager',
                status=True,
            ).first()
            if not manager_user:
                return Response({'success': False,
                                 'errors': {'company_manager_email': ['No approved company manager found.']}},
                                status=status.HTTP_400_BAD_REQUEST)
            parent_company = Company.objects(user=manager_user).first()
            if not parent_company:
                return Response({'success': False,
                                 'errors': {'company_manager_email': ['Company profile not found.']}},
                                status=status.HTTP_400_BAD_REQUEST)

        user = User(
            username=data['username'],
            email=data['email'],
            role='company',
            sub_role=data['sub_role'],
            status=False,
        )
        user.set_password(data['password'])
        user.save()

        company = Company(
            user=user,
            company_name=data['company_name'],
            description=data['description'],
            location=data['location'],
            website=data.get('website', ''),
            industry=data['industry'],
            parent_company=parent_company,
        )
        company.save()

        return Response({
            'success': True,
            'pending': True,
            'message': 'Account created and pending approval.'
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        traceback.print_exc()
        if 'user' in locals():
            try:
                user.delete()
            except Exception:
                pass
        return Response({'success': False, 'errors': {'non_field_errors': [str(e)]}},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def register_admin(request):
    serializer = AdminRegistrationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({'success': False, 'errors': serializer.errors},
                        status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    try:
        if data['sub_role'] == 'co_dept_head':
            matching_admin = Admin.objects(university=data['university']).first()
            admin_user = None
            if matching_admin:
                admin_user = User.objects(
                    id=matching_admin.user.id,
                    role='admin',
                    sub_role='admin',
                    status=True,
                ).first()
            if not admin_user:
                return Response({'success': False,
                                 'errors': {'university': ['No approved admin for this university.']}},
                                status=status.HTTP_400_BAD_REQUEST)

        user = User(
            username=data['username'],
            email=data['email'],
            role='admin',
            sub_role=data['sub_role'],
            status=False,
            is_university_email='univ' in data['email'] and '.dz' in data['email'],
        )
        user.set_password(data['password'])
        user.save()

        try:
            admin_profile = Admin(
                user=user,
                full_name=data['full_name'],
                wilaya=data['wilaya'],
                university=data['university'],
            )
            admin_profile.save()
        except Exception as e:
            user.delete()
            raise e

        return Response({
            'success': True,
            'pending': True,
            'message': 'Account created and pending approval.'
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        traceback.print_exc()
        if 'user' in locals():
            try:
                user.delete()
            except Exception:
                pass
        return Response({'success': False, 'errors': {'non_field_errors': [str(e)]}},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def login(request):
    email = request.data.get('email')
    password = request.data.get('password')
    
    if not email or not password:
        return Response({'success': False, 'errors': {'non_field_errors': ['Email and password required.']}},
                        status=status.HTTP_400_BAD_REQUEST)

    user = User.objects(email=email).first()
    if not user or not user.check_password(password):
        return Response({'success': False, 'errors': {'non_field_errors': ['Invalid credentials.']}},
                        status=status.HTTP_401_UNAUTHORIZED)

    if not user.status:
        return Response({'success': False, 'errors': {'non_field_errors': ['Account pending approval.']}},
                        status=status.HTTP_403_FORBIDDEN)

    # ========== SUPER ADMIN LOGIN ==========
    # Super Admin - OTP required for each login
    if user.is_super_admin or user.role == 'super_admin':
        temp_data = {
            'action': 'super_admin_login',
            'user_id': str(user.id),
            'email': email
        }
        code = create_otp_verification(email, temp_data)
        send_otp_email(email, code, "login_2fa")
        
        # طباعة الكود في الكونسول للتصحيح
        print(f"\n🔐 SUPER ADMIN LOGIN")
        print(f"   Email: {email}")
        print(f"   OTP Code: {code}")
        print(f"   User ID: {user.id}\n")
        
        return Response({
            'success': True,
            'requires_otp': True,
            'message': 'Verification code sent to your email',
            'email': email
        })

    if user.two_fa_enabled:
        temp_data = {
            'action': 'login_2fa',
            'user_id': str(user.id),
            'email': email
        }
        code = create_otp_verification(email, temp_data)
        send_otp_email(email, code, "login_2fa")
        
        return Response({
            'success': True,
            'requires_2fa': True,
            'message': 'Verification code sent to your email',
            'email': email
        })

    token = create_token(user)
    redirect_urls = {
        'student': '/student/dashboard',
        'company': '/company/dashboard',
        'admin': '/admin/dashboard',
        'super_admin': '/super-admin/dashboard',
    }
    
    user_data = {
        'id': str(user.id),
        'username': user.username,  
        'email': user.email,
        'role': user.role,
        'sub_role': user.sub_role,
        'profile_picture': user.profile_picture,
        'bio': user.bio,
        'phone': user.phone
    }
    
    if user.role == 'student':
        student = Student.objects(user=user).first()
        if student:
            user_data['full_name'] = student.full_name
            user_data['university'] = student.university
    elif user.role == 'company':
        company = _get_user_company(user) 
        if company:
            user_data['company_name'] = company.company_name
    elif user.role == 'admin':
        admin = Admin.objects(user=user).first()
        if admin:
            user_data['full_name'] = admin.full_name
            user_data['university'] = admin.university
    elif user.role == 'super_admin':
        super_admin_obj = SuperAdmin.objects(user=user).first()
        if super_admin_obj:
            user_data['full_name'] = super_admin_obj.full_name
        else:
            user_data['full_name'] = user.username

    return Response({
        'success': True,
        'message': 'Login successful',
        'token': token,
        'user': user_data,
        'redirect_url': redirect_urls.get(user.role, '/dashboard'),
    })
@api_view(['POST'])
def initiate_signup(request):
    import traceback
    try:
        role = request.data.get('role')
        clean_data = {k: v for k, v in request.data.items() if k != 'role'}

        # ============ VALIDATION DU RÔLE ============
        if role == 'student':
            serializer = StudentRegistrationSerializer(data=clean_data)
        elif role == 'company':
            serializer = CompanyRegistrationSerializer(data=clean_data)
        elif role == 'admin':
            serializer = AdminRegistrationSerializer(data=clean_data)
        else:
            return Response({
                'success': False, 
                'errors': {'role': ['❌ Invalid role. Please select Student, Company, or Administration.']}
            }, status=status.HTTP_400_BAD_REQUEST)

        # ============ VALIDATION DU SERIALIZER ============
        if not serializer.is_valid():
            # Renvoyer les erreurs du serializer directement
            return Response({
                'success': False, 
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        email = data['email']
        username = data['username']

        # ============ VÉRIFICATION EMAIL EXISTANT ============
        if User.objects(email=email).first():
            return Response({
                'success': False, 
                'errors': {'email': ['❌ This email is already in use. Please use a different email or login.']}
            }, status=status.HTTP_400_BAD_REQUEST)

        # ============ VÉRIFICATION USERNAME EXISTANT ============
        if User.objects(username=username).first():
            return Response({
                'success': False, 
                'errors': {'username': ['❌ This username is already taken. Please choose another username.']}
            }, status=status.HTTP_400_BAD_REQUEST)

        # ============ VALIDATION EMAIL ÉTUDIANT ============
        if role == 'student':
            if 'univ' not in email.lower() or '.dz' not in email.lower():
                return Response({
                    'success': False, 
                    'errors': {
                        'email': ['❌ University email required. Email must contain "univ" and end with ".dz"']
                    }
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if not data.get('skills') or len(data.get('skills', [])) == 0:
                return Response({
                    'success': False, 
                    'errors': {
                        'skills': ['❌ At least one skill is required. Type a skill and press Enter or click "Add"']
                    }
                }, status=status.HTTP_400_BAD_REQUEST)

        # ============ VALIDATION COMPANY MANAGER ============
        if role == 'company' and data.get('sub_role') == 'company_manager':
            required_fields = ['company_name', 'description', 'location', 'industry']
            missing = [f for f in required_fields if not data.get(f)]
            if missing:
                field_names = {
                    'company_name': 'Company Name',
                    'description': 'Description',
                    'location': 'Location (Wilaya)',
                    'industry': 'Industry'
                }
                errors = {}
                for field in missing:
                    errors[field] = [f'❌ {field_names.get(field, field)} is required for Company Manager.']
                return Response({'success': False, 'errors': errors}, status=status.HTTP_400_BAD_REQUEST)

        # ============ VALIDATION HIRING MANAGER ============
        if role == 'company' and data.get('sub_role') == 'hiring_manager':
            manager_email = data.get('company_manager_email')
            company_name = data.get('company_name_for_hiring')
            
            if not manager_email:
                return Response({
                    'success': False, 
                    'errors': {
                        'company_manager_email': ['❌ Company Manager Email is required for Hiring Manager.']
                    }
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if not company_name:
                return Response({
                    'success': False, 
                    'errors': {
                        'company_name_for_hiring': ['❌ Company Name is required for Hiring Manager.']
                    }
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Vérifier si l'email du manager existe
            manager_user = User.objects(
                email=manager_email,
                role='company',
                sub_role='company_manager',
                status=True
            ).first()
            
            if not manager_user:
                return Response({
                    'success': False, 
                    'errors': {
                        'company_manager_email': [f'❌ No approved Company Manager found with email "{manager_email}". Please verify the email.']
                    }
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Récupérer l'entreprise du manager
            manager_company = Company.objects(user=manager_user).first()
            if not manager_company:
                return Response({
                    'success': False, 
                    'errors': {
                        'company_manager_email': [f'❌ The Company Manager "{manager_email}" does not have a company profile.']
                    }
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Vérifier si le nom de l'entreprise correspond
            if manager_company.company_name.lower() != company_name.lower():
                return Response({
                    'success': False, 
                    'errors': {
                        'company_name_for_hiring': [
                            f'❌ Company name "{company_name}" does not match.\n'
                            f'📌 The Company Manager belongs to: "{manager_company.company_name}"\n'
                            f'✅ Please enter exactly: "{manager_company.company_name}"'
                        ]
                    }
                }, status=status.HTTP_400_BAD_REQUEST)

        # ============ VALIDATION DEPARTMENT HEAD ============
        if role == 'admin' and data.get('sub_role') == 'admin':
            required_fields = ['full_name', 'wilaya', 'university']
            missing = [f for f in required_fields if not data.get(f)]
            if missing:
                field_names = {
                    'full_name': 'Full Name',
                    'wilaya': 'Wilaya',
                    'university': 'University'
                }
                errors = {}
                for field in missing:
                    errors[field] = [f' {field_names.get(field, field)} is required for Department Head.']
                return Response({'success': False, 'errors': errors}, status=status.HTTP_400_BAD_REQUEST)
            
            
        # ============ VALIDATION CO DEPARTMENT HEAD ============
        if role == 'admin' and data.get('sub_role') == 'co_dept_head':
            dept_head_email = data.get('dept_head_email')
            university_name = data.get('university_for_verification')
            
            if not dept_head_email:
                return Response({
                    'success': False, 
                    'errors': {
                        'dept_head_email': [' Department Head Email is required for Co Department Head.']
                    }
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if not university_name:
                return Response({
                    'success': False, 
                    'errors': {
                        'university_for_verification': [' University name is required for Co Department Head.']
                    }
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Vérifier si l'email du Department Head existe
            dept_head_user = User.objects(
                email=dept_head_email,
                role='admin',
                sub_role='admin',
                status=True
            ).first()
            
            if not dept_head_user:
                return Response({
                    'success': False, 
                    'errors': {
                        'dept_head_email': [f' No approved Department Head found with email "{dept_head_email}". Please verify the email.']
                    }
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Récupérer le profil admin du Department Head
            dept_head_admin = Admin.objects(user=dept_head_user).first()
            if not dept_head_admin:
                return Response({
                    'success': False, 
                    'errors': {
                        'dept_head_email': [f'❌ The Department Head "{dept_head_email}" does not have an admin profile.']
                    }
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Vérifier si le nom de l'université correspond
            if dept_head_admin.university.lower() != university_name.lower():
                return Response({
                    'success': False, 
                    'errors': {
                        'university_for_verification': [
                            f'❌ University name "{university_name}" does not match.\n'
                            f'📌 The Department Head is affiliated with: "{dept_head_admin.university}"\n'
                            f'✅ Please enter exactly: "{dept_head_admin.university}"'
                        ]
                    }
                }, status=status.HTTP_400_BAD_REQUEST)

        # ============ CRÉATION OTP ============
        # 🔥 ON ARRIVE ICI SEULEMENT SI TOUTES LES VALIDATIONS SONT RÉUSSIES
        temp_data = {'role': role, 'data': data}
        code = create_otp_verification(email, temp_data)
        
        # Toujours retourner succès (l'email peut échouer mais on garde le code dans la console)
        print(f"\n🔐 ===== NEW SIGNUP =====\n📧 Email: {email}\n📝 Role: {role}\n🔑 OTP Code: {code}\n{'='*30}\n")
        
        try:
            send_otp_email(email, code, "inscription")
        except Exception as e:
            print(f"⚠️ Email sending error (ignored): {e}")
        
        return Response({
            'success': True, 
            'message': '✅ Verification code sent! Check your email (and spam folder).',
            'email': email
        })

    except Exception as e:
        traceback.print_exc()
        return Response({
            'success': False, 
            'message': f'❌ Internal server error: {str(e)}'
        }, status=500)

@api_view(['POST'])
def complete_signup(request):
    email = request.data.get('email')
    code = request.data.get('code')
    if not email or not code:
        return Response({'success': False, 'message': 'Email and code required'}, status=400)

    temp_data, error = verify_otp_code(email, code)
    if error:
        return Response({'success': False, 'message': error, 'code_invalid': True}, status=400)

    role = temp_data.get('role')
    data = temp_data.get('data')
    try:
        if role == 'student':
            if User.objects(username=data['username']).first():
                return Response({'success': False, 'errors': {'username': ['Username already taken.']}}, status=400)

            user = User(
                username=data['username'],
                email=email,
                role='student',
                sub_role='',
                status=True,
                is_university_email=True,
            )
            user.set_password(data['password'])
            user.save()

            student = Student(
                user=user,
                full_name=data['full_name'],
                wilaya=data['wilaya'],
                skills=data['skills'],
                github=data.get('github', ''),
                portfolio=data.get('portfolio', ''),
                education_level=data['education_level'],
                university=data['university'],
                major=data['major'],
                graduation_year=data['graduation_year'],
            )
            student.save()

            token = create_token(user)
            return Response({
                'success': True,
                'message': 'Registration successful!',
                'token': token,
                'user': {
                    'id': str(user.id),
                    'email': user.email,
                    'role': user.role,
                    'full_name': student.full_name,
                },
                'redirect_url': '/student/dashboard',
            }, status=201)

        elif role == 'company':
            if User.objects(username=data['username']).first():
                return Response({'success': False, 'errors': {'username': ['Username already taken.']}}, status=400)

            if data['sub_role'] == 'company_manager':
                user = User(
                    username=data['username'],
                    email=email,
                    role='company',
                    sub_role='company_manager',
                    status=False,
                )
                user.set_password(data['password'])
                user.save()

                company = Company(
                    user=user,
                    company_name=data['company_name'],
                    description=data['description'],
                    location=data['location'],
                    website=data.get('website', ''),
                    industry=data['industry'],
                    parent_company=None,
                )
                company.save()

                pending = PendingApproval(
                    user_id=str(user.id),
                    email=user.email,
                    username=user.username,
                    role='company',
                    sub_role='company_manager',
                    full_name=user.username,
                    company_name=data['company_name'],
                    description=data['description'],
                    location=data['location'],
                    website=data.get('website', ''),
                    industry=data['industry'],
                    created_at=datetime.now()
                )
                pending.save()

                return Response({
                    'success': True,
                    'pending': True,
                    'message': 'Account created. Pending approval.',
                    'sub_role': 'company_manager',
                }, status=201)

            else:  # hiring_manager
                manager_user = User.objects(
                    email=data['company_manager_email'],
                    role='company',
                    sub_role='company_manager',
                    status=True,
                ).first()
                if not manager_user:
                    return Response({'success': False, 'errors': {'company_manager_email': ['No approved manager found.']}},
                                    status=400)
                parent_company = Company.objects(user=manager_user).first()
                if not parent_company:
                    return Response({'success': False, 'errors': {'company_manager_email': ['Company profile not found.']}},
                                    status=400)
                if parent_company.company_name.lower() != data.get('company_name_for_hiring', '').lower():
                    return Response({'success': False,
                                     'errors': {'company_name_for_hiring': ['Company name does not match.']}},
                                    status=400)

                user = User(
                    username=data['username'],
                    email=email,
                    role='company',
                    sub_role='hiring_manager',
                    status=False,
                )
                user.pending_company_id = str(parent_company.id)
                user.set_password(data['password'])
                user.save()

                return Response({
                    'success': True,
                    'pending': True,
                    'message': f'Account created. Waiting for approval by {manager_user.username}.',
                    'sub_role': 'hiring_manager',
                }, status=201)

        elif role == 'admin':
            if User.objects(username=data['username']).first():
                return Response({'success': False, 'errors': {'username': ['Username already taken.']}}, status=400)

            if data['sub_role'] == 'admin':
                user = User(
                    username=data['username'],
                    email=email,
                    role='admin',
                    sub_role='admin',
                    status=False,
                    is_university_email='univ' in email and '.dz' in email,
                )
                user.set_password(data['password'])
                user.save()

                admin_profile = Admin(
                    user=user,
                    full_name=data['full_name'],
                    wilaya=data['wilaya'],
                    university=data['university'],
                )
                admin_profile.save()

                pending = PendingApproval(
                    user_id=str(user.id),
                    email=user.email,
                    username=user.username,
                    role='admin',
                    sub_role='admin',
                    full_name=data['full_name'],
                    university=data['university'],
                    wilaya=data['wilaya'],
                    created_at=datetime.now()
                )
                pending.save()

                return Response({
                    'success': True,
                    'pending': True,
                    'message': 'Account created. Pending approval.',
                    'sub_role': 'admin',
                }, status=201)

            else:  # co_dept_head
                dept_head_user = User.objects(
                    email=data['dept_head_email'],
                    role='admin',
                    sub_role='admin',
                    status=True,
                ).first()
                if not dept_head_user:
                    return Response({'success': False, 'errors': {'dept_head_email': ['No approved department head found.']}},
                                    status=400)
                parent_admin = Admin.objects(user=dept_head_user).first()
                if not parent_admin:
                    return Response({'success': False, 'errors': {'dept_head_email': ['Admin profile not found.']}},
                                    status=400)
                if parent_admin.university.lower() != data.get('university_for_verification', '').lower():
                    return Response({'success': False,
                                     'errors': {'university_for_verification': ['University name does not match.']}},
                                    status=400)

                user = User(
                    username=data['username'],
                    email=email,
                    role='admin',
                    sub_role='co_dept_head',
                    status=False,
                    is_university_email='univ' in email and '.dz' in email,
                )
                user.pending_admin_id = str(parent_admin.id)
                user.set_password(data['password'])
                user.save()

                return Response({
                    'success': True,
                    'pending': True,
                    'message': f'Account created. Waiting for approval by {dept_head_user.username}.',
                    'sub_role': 'co_dept_head',
                }, status=201)

    except Exception as e:
        traceback.print_exc()
        if 'user' in locals():
            try:
                user.delete()
            except:
                pass
        return Response({'success': False, 'message': f'Error: {str(e)}'}, status=500)


@api_view(['POST'])
def forgot_password(request):
    email = request.data.get('email')
    if not email:
        return Response({'success': False, 'message': 'Email required'}, status=400)

    user = User.objects(email=email).first()
    if not user:
        return Response({'success': False, 'message': 'No account found with that email.', 'email_exists': False},
                        status=404)

    temp_data = {'action': 'reset_password', 'email': email, 'user_id': str(user.id)}
    code = create_otp_verification(email, temp_data)
    email_sent = send_otp_email(email, code, "reset_password")
    if not email_sent:
        return Response({'success': False, 'message': 'Failed to send email'}, status=500)

    return Response({'success': True, 'message': 'Reset code sent', 'email': email, 'email_exists': True})


@api_view(['POST'])
def reset_password(request):
    email = request.data.get('email')
    code = request.data.get('code')
    new_password = request.data.get('new_password')
    confirm_password = request.data.get('confirm_password')

    if not email or not code or not new_password:
        return Response({'success': False, 'message': 'Email, code and new password required'}, status=400)

    if new_password != confirm_password:
        return Response({'success': False, 'message': 'Passwords do not match'}, status=400)

    if len(new_password) < 8 or new_password.isdigit() or not any(c.isupper() for c in new_password) \
            or not any(c.islower() for c in new_password) or not any(c.isdigit() for c in new_password):
        return Response({'success': False, 'message': 'Password does not meet requirements'}, status=400)

    temp_data, error = verify_otp_code(email, code)
    if error:
        return Response({'success': False, 'message': error, 'code_invalid': True}, status=400)

    if temp_data.get('action') != 'reset_password':
        return Response({'success': False, 'message': 'Invalid code for password reset'}, status=400)

    user = User.objects(email=email).first()
    if not user:
        return Response({'success': False, 'message': 'User not found'}, status=404)

    user.set_password(new_password)
    user.save()
    return Response({'success': True, 'message': 'Password reset successfully'})


@api_view(['POST'])
@jwt_authenticated
def change_password(request):
    """
    Change password for the currently authenticated user.
    Body: { current_password, new_password }
    """
    current_password = request.data.get('current_password', '').strip()
    new_password     = request.data.get('new_password', '').strip()

    if not current_password or not new_password:
        return Response({'success': False, 'error': 'Both current and new passwords are required'}, status=400)

    user = request.user
    if not user.check_password(current_password):
        return Response({'success': False, 'error': 'Current password is incorrect'}, status=400)

    if len(new_password) < 8:
        return Response({'success': False, 'error': 'Password must be at least 8 characters'}, status=400)
    if new_password.isdigit():
        return Response({'success': False, 'error': 'Password cannot be all digits'}, status=400)
    if not any(c.isupper() for c in new_password):
        return Response({'success': False, 'error': 'Password must contain at least one uppercase letter'}, status=400)
    if not any(c.islower() for c in new_password):
        return Response({'success': False, 'error': 'Password must contain at least one lowercase letter'}, status=400)
    if not any(c.isdigit() for c in new_password):
        return Response({'success': False, 'error': 'Password must contain at least one digit'}, status=400)

    user.set_password(new_password)
    return Response({'success': True, 'message': 'Password changed successfully'})


# ==================== STUDENT ====================

@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['student'])
def student_dashboard(request):
    return Response({'message': 'Student dashboard', 'success': True})


@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['student'])
def search_offers(request):
    today_start = timezone.make_aware(datetime.combine(timezone.now().date(), datetime.min.time()))
    offers = InternshipOffer.objects(is_active=True, deadline__gte=today_start)

    search_term = request.query_params.get('search', '').strip()
    if search_term:
        offers = offers.filter(
            __raw__={
                '$or': [
                    {'title': {'$regex': search_term, '$options': 'i'}},
                    {'description': {'$regex': search_term, '$options': 'i'}},
                    {'company_name': {'$regex': search_term, '$options': 'i'}}
                ]
            }
        )

    company_name = request.query_params.get('company_name', '').strip()
    if company_name:
        offers = offers.filter(company_name__iexact=company_name)

    wilaya = request.query_params.get('wilaya', '').strip()
    if wilaya:
        offers = offers.filter(wilaya=wilaya)

    internship_type = request.query_params.get('internship_type', '').strip()
    if internship_type:
        offers = offers.filter(internship_type=internship_type)

    skills_param = request.query_params.get('skills', '').strip()
    if skills_param:
        skill_list = [s.strip() for s in skills_param.split(',') if s.strip()]
        offers = offers.filter(required_skills__in=skill_list)

    offers = offers.order_by('-created_at')
    
    result = []
    for offer in offers:
        applicants_count = Application.objects(offer=offer).count()
        
        offer_data = {
            'id': str(offer.id),
            'title': offer.title,
            'description': offer.description,
            'company_name': offer.company_name,
            'wilaya': offer.wilaya,
            'internship_type': offer.internship_type,
            'required_skills': offer.required_skills,
            'duration': offer.duration,
            'start_date': offer.start_date.strftime('%Y-%m-%d') if offer.start_date else None,
            'deadline': offer.deadline.strftime('%Y-%m-%d') if offer.deadline else None,
            'is_active': offer.is_active,
            'created_at': offer.created_at.strftime('%Y-%m-%d') if offer.created_at else None,
            'applicants_count': applicants_count,
            'rating': 4,
            'level': offer.internship_type,
            'type': offer.internship_type,
            'contact_name': offer.company_name,
            'image': f"/api/company/offers/{offer.id}/image/" if offer.image else None,
        }
        result.append(offer_data)
    
    return Response({'success': True, 'offers': result})

@api_view(['POST'])
@jwt_authenticated
@role_required(allowed_roles=['student'])
@parser_classes([MultiPartParser, FormParser])
def apply_to_offer(request, offer_id):
    student = Student.objects(user=request.user).first()
    if not student:
        return Response({'success': False, 'message': 'Student profile not found'}, status=404)

    try:
        offer = InternshipOffer.objects(id=offer_id).first()
        if not offer:
            return Response({'success': False, 'message': 'Offer not found'}, status=404)
    except Exception:
        return Response({'success': False, 'message': 'Invalid offer ID'}, status=400)

    existing = Application.objects(student=student, offer=offer).first()
    if existing:
        return Response({'success': False, 'message': 'You have already applied to this offer'}, status=400)

    if not offer.is_active or offer.deadline < datetime.now():
        return Response({'success': False, 'message': 'This internship is currently unavailable'}, status=400)

    required_fields = ['full_name', 'wilaya', 'skills', 'education_level', 'university', 'major', 'graduation_year']
    missing = [f for f in required_fields if not getattr(student, f, None)]
    if missing:
        return Response({'success': False, 'message': 'Please complete your profile before applying',
                         'missing_fields': missing}, status=400)

    cv_file = request.FILES.get('cv_file')
    if not cv_file:
        return Response({'success': False, 'message': 'CV is required'}, status=400)

    application = Application(
        student=student,
        offer=offer,
        status='pending',
        applied_at=datetime.now(),
        cv_file=cv_file,
        cover_letter=request.data.get('cover_letter', '')
    )
    application.save()

    # ✅ إرسال إيميل للطالب
    send_application_confirmation_student(student.user.email, student.full_name, offer.title)
    
    company = offer.company
    if company and company.user:
        # ✅ إرسال إيميل للشركة
        send_application_notification_company(company.user.email, offer.title, student.full_name)
        
        # ✅ إضافة إشعار لـ Company Manager
        Notification.objects.create(
            recipient=company.user,
            message=f"📋 New application received for '{offer.title}' from {student.full_name}.",
            related_id=str(application.id)
        )
        
        # ✅ إضافة إشعار لجميع Hiring Managers
        hiring_managers = User.objects(
            role='company',
            sub_role='hiring_manager',
            status=True,
            pending_company_id=str(company.id)
        )
        for hm in hiring_managers:
            Notification.objects.create(
                recipient=hm,
                message=f"📋 New application for '{offer.title}' from {student.full_name}.",
                related_id=str(application.id)
            )

    return Response({
        'success': True,
        'message': 'Your application has been successfully submitted',
        'application_id': str(application.id)
    }, status=201)

@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['student'])
def generate_cv(request):
    student = Student.objects(user=request.user).first()
    if not student:
        return Response({'error': 'Student profile not found'}, status=404)

    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{student.full_name}_CV.pdf"'

    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas
    from reportlab.lib.units import inch
    c = canvas.Canvas(response, pagesize=letter)
    width, height = letter

    c.setFont("Helvetica-Bold", 16)
    c.drawString(1*inch, height - 1*inch, student.full_name)
    c.setFont("Helvetica", 12)
    c.drawString(1*inch, height - 1.5*inch, f"Email: {student.user.email}")
    c.drawString(1*inch, height - 2*inch, f"University: {student.university}")
    c.drawString(1*inch, height - 2.5*inch, f"Major: {student.major}")
    c.drawString(1*inch, height - 3*inch, f"Education Level: {student.education_level}")
    c.drawString(1*inch, height - 3.5*inch, f"Graduation Year: {student.graduation_year}")

    c.drawString(1*inch, height - 4*inch, "Skills:")
    y = height - 4.5*inch
    for skill in student.skills:
        c.drawString(1.2*inch, y, f"- {skill}")
        y -= 0.3*inch

    c.save()
    return response


@api_view(['POST'])
@jwt_authenticated
@role_required(allowed_roles=['student'])
def generate_custom_cv(request):
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import cm
    from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer,
        Table, TableStyle, HRFlowable,
    )
    from io import BytesIO
    from django.core.files.base import ContentFile
    import os

    try:
        data    = request.data
        student = Student.objects(user=request.user).first()
        if not student:
            return Response({'error': 'Student profile not found'}, status=404)

        # ── DATA RETRIEVAL (unchanged) ────────────────────────────────────
        full_name        = data.get('full_name',        student.full_name)
        email            = data.get('email',            request.user.email)
        university       = data.get('university',       student.university)
        major            = data.get('major',            student.major)
        education_level  = data.get('education_level',  student.education_level)
        graduation_year  = data.get('graduation_year',  student.graduation_year)
        skills           = data.get('skills',           student.skills)
        if isinstance(skills, str):
            skills = [s.strip() for s in skills.split(',') if s.strip()]
        objective  = data.get('objective',  '')
        experience = data.get('experience', [])
        languages  = data.get('languages',  [])
        wilaya     = student.wilaya or 'Algérie'
        phone      = getattr(student, 'phone',     '')
        github     = getattr(student, 'github',    '')
        portfolio  = getattr(student, 'portfolio', '')

        # ── DOCUMENT SETUP ───────────────────────────────────────────────
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            topMargin=2 * cm,
            bottomMargin=2 * cm,
            leftMargin=2 * cm,
            rightMargin=2 * cm,
        )

        # usable text width  (210 mm − 2×20 mm margins)
        PAGE_W = 17 * cm

        # ── COLOUR PALETTE ───────────────────────────────────────────────
        C_BLACK      = colors.HexColor('#111111')
        C_DARK_GREY  = colors.HexColor('#333333')
        C_MID_GREY   = colors.HexColor('#555555')
        C_LIGHT_GREY = colors.HexColor('#888888')
        C_RULE       = colors.HexColor('#CCCCCC')
        C_TAG_BG     = colors.HexColor('#F0F0F0')
        C_WHITE      = colors.white

        # ── PARAGRAPH STYLES ─────────────────────────────────────────────
        S_NAME = ParagraphStyle(
            'S_NAME',
            fontName='Helvetica-Bold',
            fontSize=28,
            leading=32,
            textColor=C_BLACK,
            spaceAfter=2,
            alignment=TA_LEFT,
        )
        S_ROLE = ParagraphStyle(
            'S_ROLE',
            fontName='Helvetica',
            fontSize=13,
            leading=16,
            textColor=C_MID_GREY,
            spaceAfter=6,
            alignment=TA_LEFT,
        )
        S_CONTACT = ParagraphStyle(
            'S_CONTACT',
            fontName='Helvetica',
            fontSize=8.5,
            leading=12,
            textColor=C_MID_GREY,
            alignment=TA_LEFT,
        )
        S_SECTION_TITLE = ParagraphStyle(
            'S_SECTION_TITLE',
            fontName='Helvetica-Bold',
            fontSize=10,
            leading=14,
            textColor=C_BLACK,
            spaceBefore=14,
            spaceAfter=4,
            alignment=TA_LEFT,
        )
        S_BODY = ParagraphStyle(
            'S_BODY',
            fontName='Helvetica',
            fontSize=9,
            leading=13,
            textColor=C_DARK_GREY,
            spaceAfter=3,
            alignment=TA_LEFT,
        )
        S_BODY_BOLD = ParagraphStyle(
            'S_BODY_BOLD',
            parent=S_BODY,
            fontName='Helvetica-Bold',
            textColor=C_BLACK,
        )
        S_BODY_ITALIC = ParagraphStyle(
            'S_BODY_ITALIC',
            parent=S_BODY,
            fontName='Helvetica-Oblique',
            textColor=C_MID_GREY,
        )
        S_LABEL = ParagraphStyle(
            'S_LABEL',
            fontName='Helvetica',
            fontSize=8,
            leading=11,
            textColor=C_LIGHT_GREY,
            alignment=TA_RIGHT,
        )
        S_TAG = ParagraphStyle(
            'S_TAG',
            fontName='Helvetica',
            fontSize=8.5,
            leading=11,
            textColor=C_DARK_GREY,
            alignment=TA_CENTER,
        )
        S_FOOTER = ParagraphStyle(
            'S_FOOTER',
            fontName='Helvetica',
            fontSize=7.5,
            textColor=C_LIGHT_GREY,
            alignment=TA_CENTER,
        )

        # ── HELPERS ──────────────────────────────────────────────────────
        def hr(thickness=0.6, color=C_RULE, space_before=4, space_after=4):
            return HRFlowable(
                width=PAGE_W,
                thickness=thickness,
                color=color,
                spaceAfter=space_after,
                spaceBefore=space_before,
            )

        def section_header(title):
            return [
                Spacer(1, 0.4 * cm),
                Paragraph(title.upper(), S_SECTION_TITLE),
                hr(thickness=1.2, color=C_BLACK, space_before=1, space_after=6),
            ]

        # ── STORY ────────────────────────────────────────────────────────
        story = []

        # ── 1. HEADER ────────────────────────────────────────────────────
        story.append(Paragraph(full_name, S_NAME))

        role_label = (
            f"{education_level} — {major}"
            if education_level and major
            else (major or education_level or "")
        )
        if role_label:
            story.append(Paragraph(role_label, S_ROLE))

        contact_parts = [p for p in [email, phone, wilaya, github, portfolio] if p]
        if contact_parts:
            story.append(Paragraph("  ·  ".join(contact_parts), S_CONTACT))

        story.append(hr(thickness=1.8, color=C_BLACK, space_before=8, space_after=2))

        # ── 2. PROFILE / SUMMARY ─────────────────────────────────────────
        story += section_header("Profile")

        if objective and objective.strip():
            summary_text = objective.strip()
        else:
            summary_text = (
                f"Motivated {major} student at {university}, "
                f"graduating in {graduation_year}. "
                "Eager to apply academic knowledge in a professional environment, "
                "contribute to a results-driven team, and grow through hands-on experience."
            )
        story.append(Paragraph(summary_text, S_BODY))

        # ── 3. EDUCATION ─────────────────────────────────────────────────
        story += section_header("Education")

        edu_left = [
            Paragraph(f"<b>{university}</b>", S_BODY_BOLD),
            Paragraph(major, S_BODY),
            Paragraph(education_level, S_BODY_ITALIC),
        ]
        edu_right = [
            Paragraph(str(graduation_year) if graduation_year else "", S_LABEL),
        ]

        edu_table = Table(
            [[edu_left, edu_right]],
            colWidths=[PAGE_W * 0.76, PAGE_W * 0.24],
        )
        edu_table.setStyle(TableStyle([
            ('VALIGN',        (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING',   (0, 0), (-1, -1), 0),
            ('RIGHTPADDING',  (0, 0), (-1, -1), 0),
            ('TOPPADDING',    (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ]))
        story.append(edu_table)

        # ── 4. EXPERIENCE ────────────────────────────────────────────────
        story += section_header("Experience")

        real_experience = [
            exp for exp in (experience or [])
            if isinstance(exp, dict) and exp.get('title', '').strip()
        ]

        if real_experience:
            for idx, exp in enumerate(real_experience):
                exp_title   = exp.get('title',       '').strip()
                exp_company = exp.get('company',     '').strip()
                exp_dates   = exp.get('dates',       '').strip()
                exp_desc    = exp.get('description', '').strip()

                left_col = [Paragraph(f"<b>{exp_title}</b>", S_BODY_BOLD)]
                if exp_company:
                    left_col.append(Paragraph(exp_company, S_BODY_ITALIC))
                if exp_desc:
                    left_col.append(Spacer(1, 2))
                    for line in exp_desc.split('\n'):
                        if line.strip():
                            left_col.append(
                                Paragraph(f"\u2022  {line.strip()}", S_BODY)
                            )

                right_col = (
                    [Paragraph(exp_dates, S_LABEL)]
                    if exp_dates
                    else [Paragraph("", S_LABEL)]
                )

                exp_table = Table(
                    [[left_col, right_col]],
                    colWidths=[PAGE_W * 0.76, PAGE_W * 0.24],
                )
                exp_table.setStyle(TableStyle([
                    ('VALIGN',        (0, 0), (-1, -1), 'TOP'),
                    ('LEFTPADDING',   (0, 0), (-1, -1), 0),
                    ('RIGHTPADDING',  (0, 0), (-1, -1), 0),
                    ('TOPPADDING',    (0, 0), (-1, -1), 0),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ]))
                story.append(exp_table)

                # thin separator between entries (not after the last one)
                if idx < len(real_experience) - 1:
                    story.append(
                        hr(thickness=0.4, color=C_RULE, space_before=2, space_after=6)
                    )
        else:
            story.append(
                Paragraph(
                    "No professional experience yet — "
                    "open to internship and training opportunities.",
                    S_BODY_ITALIC,
                )
            )

        # ── 5. SKILLS ────────────────────────────────────────────────────
        clean_skills = [s.strip() for s in (skills or []) if str(s).strip()]

        if clean_skills:
            story += section_header("Skills")

            COLS  = 3
            COL_W = PAGE_W / COLS

            skill_rows = []
            for i in range(0, len(clean_skills), COLS):
                row = clean_skills[i: i + COLS]
                while len(row) < COLS:
                    row.append("")
                skill_rows.append([Paragraph(s, S_TAG) for s in row])

            tag_style = [
                ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
                ('ALIGN',         (0, 0), (-1, -1), 'CENTER'),
                ('TOPPADDING',    (0, 0), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ('LEFTPADDING',   (0, 0), (-1, -1), 6),
                ('RIGHTPADDING',  (0, 0), (-1, -1), 6),
                ('GRID',          (0, 0), (-1, -1), 0, C_WHITE),
            ]
            # Grey background only for non-empty cells
            for r_idx, row in enumerate(skill_rows):
                for c_idx, cell in enumerate(row):
                    if cell.text:
                        tag_style.append(
                            ('BACKGROUND', (c_idx, r_idx), (c_idx, r_idx), C_TAG_BG)
                        )

            skills_table = Table(skill_rows, colWidths=[COL_W] * COLS)
            skills_table.setStyle(TableStyle(tag_style))
            story.append(skills_table)

        # ── 6. LANGUAGES ─────────────────────────────────────────────────
        real_languages = [
            lang for lang in (languages or [])
            if isinstance(lang, dict) and lang.get('name', '').strip()
        ]

        if real_languages:
            story += section_header("Languages")

            lang_rows = [
                [
                    Paragraph(lang.get('name', '').strip(),  S_BODY_BOLD),
                    Paragraph(lang.get('level', '').strip(), S_BODY),
                ]
                for lang in real_languages
                if lang.get('name', '').strip()
            ]

            if lang_rows:
                lang_table = Table(
                    lang_rows,
                    colWidths=[PAGE_W * 0.5, PAGE_W * 0.5],
                )
                lang_table.setStyle(TableStyle([
                    ('VALIGN',        (0, 0), (-1, -1), 'TOP'),
                    ('LEFTPADDING',   (0, 0), (-1, -1), 0),
                    ('RIGHTPADDING',  (0, 0), (-1, -1), 0),
                    ('TOPPADDING',    (0, 0), (-1, -1), 3),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                    # thin line between rows (skip last row)
                    ('LINEBELOW', (0, 0), (-1, -2), 0.4, C_RULE),
                ]))
                story.append(lang_table)

        # ── 7. FOOTER ────────────────────────────────────────────────────
        story.append(Spacer(1, 0.6 * cm))
        story.append(hr(thickness=0.6, color=C_RULE, space_before=0, space_after=4))
        story.append(
            Paragraph(f"{full_name}  —  Curriculum Vitae", S_FOOTER)
        )

        # ── BUILD ────────────────────────────────────────────────────────
        doc.build(story)

        # ── RESPONSE (unchanged) ─────────────────────────────────────────
        pdf_content = buffer.getvalue()
        buffer.close()

        response = HttpResponse(pdf_content, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{full_name}_CV.pdf"'
        response['Content-Length'] = str(len(pdf_content))

        return response

    except Exception as e:
        print(f"❌ Error in generate_custom_cv: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({'error': f'Failed to generate CV: {str(e)}'}, status=500)


@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['student'])
def student_applications(request):
    student = Student.objects(user=request.user).first()
    if not student:
        return Response({'success': False, 'message': 'Student profile not found'}, status=404)

    applications = Application.objects(student=student).order_by('-applied_at')
    serializer = ApplicationSerializer(applications, many=True)
    data = serializer.data

    for app_data, app_obj in zip(data, applications):
        if app_obj.cv_file:
            app_data['cv_file_url'] = f'/student/applications/{str(app_obj.id)}/cv/'
        else:
            app_data['cv_file_url'] = None

    return Response({'success': True, 'applications': data})


@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['student'])
def student_profile(request):
    student = Student.objects(user=request.user).first()
    if not student:
        return Response({'success': False, 'message': 'Student profile not found'}, status=404)
    return Response({
        'success': True,
        'profile': {
            'full_name': student.full_name,
            'email': request.user.email,
            'wilaya': student.wilaya,
            'skills': student.skills,
            'education_level': student.education_level,
            'university': student.university,
            'major': student.major,
            'graduation_year': student.graduation_year,
        }
    })


# ==================== COMPANY (core endpoints - yours) ====================

@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['company'])
def company_dashboard(request):
    return Response({'message': 'Company dashboard', 'success': True})


@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['company'])
def list_offers(request):
    company = _get_user_company(request.user)
    if not company:
        return Response({'success': False, 'message': 'Company profile not found.'}, status=404)

    offers = list(InternshipOffer.objects(company=company))

    search = request.query_params.get('search', '').strip().lower()
    if search:
        offers = [o for o in offers if search in o.title.lower() or search in o.description.lower()]

    internship_type = request.query_params.get('type', '').strip()
    if internship_type:
        offers = [o for o in offers if o.internship_type == internship_type]

    active_param = request.query_params.get('active', '').strip().lower()
    if active_param == 'true':
        offers = [o for o in offers if o.is_active]
    elif active_param == 'false':
        offers = [o for o in offers if not o.is_active]

    return Response({
        'success': True,
        'count': len(offers),
        'offers': [{
            'id': str(o.id),
            'title': o.title,
            'description': o.description,
            'wilaya': o.wilaya,
            'internship_type': o.internship_type,
            'required_skills': o.required_skills,
            'duration': o.duration,
            'start_date': o.start_date.strftime('%Y-%m-%d') if o.start_date else None,
            'deadline': o.deadline.strftime('%Y-%m-%d') if o.deadline else None,
            'is_active': o.is_active,
            'company_name': o.company.company_name,
            'created_at': o.created_at.strftime('%Y-%m-%d') if o.created_at else None,
            'image_url': f"/api/company/offers/{o.id}/image/" if o.image else None,
        } for o in offers]
    })


@api_view(['POST'])
@jwt_authenticated
@role_required(allowed_roles=['company'])
@parser_classes([MultiPartParser, FormParser])
def create_offer(request):
    company = _get_user_company(request.user)
    if not company:
        return Response({'success': False, 'message': 'Company profile not found.'}, status=404)
    
    perms = get_user_permissions(request.user)
    if not perms or not perms.can_create_offer:
        return Response({'success': False, 'error': 'You do not have permission to create offers.'}, status=403)

    required = ['title', 'description', 'wilaya', 'internship_type', 'duration', 'start_date', 'deadline']
    missing = [f for f in required if not request.data.get(f)]
    if missing:
        return Response({'success': False, 'message': f'Missing required fields: {missing}'}, status=400)

    internship_type = request.data.get('internship_type')
    if internship_type not in ['PFE', 'ouvrier', 'technicien', 'été']:
        return Response({'success': False, 'message': 'invalid internship_type'}, status=400)

    try:
        start_date = datetime.strptime(request.data.get('start_date'), '%Y-%m-%d')
        deadline = datetime.strptime(request.data.get('deadline'), '%Y-%m-%d')
    except ValueError:
        return Response({'success': False, 'message': 'Dates must be in YYYY-MM-DD format.'}, status=400)

    if InternshipOffer.objects(company=company, title=request.data.get('title')).first():
        return Response({'success': False, 'message': 'An offer with this title already exists.'}, status=400)

    skills = request.data.get('required_skills', [])
    if isinstance(skills, str):
        skills = [s.strip() for s in skills.split(',') if s.strip()]

    # Handle image upload
    image_file = request.FILES.get('image')

    offer = InternshipOffer(
        company=company,
        company_name=company.company_name,
        title=request.data.get('title'),
        description=request.data.get('description'),
        wilaya=request.data.get('wilaya'),
        internship_type=internship_type,
        required_skills=skills,
        duration=request.data.get('duration'),
        start_date=timezone.make_aware(start_date),
        deadline=timezone.make_aware(deadline),
        is_active=request.data.get('is_active', True),
        image=image_file,                # ← saved into GridFS
    )
    offer.save()

    log_activity(
        user=request.user,
        action_type='create_offer',
        target_type='offer',
        target_id=str(offer.id),
        target_name=offer.title,
        details={
            'wilaya': offer.wilaya,
            'internship_type': offer.internship_type,
            'duration': offer.duration
        }
    )

    return Response({
        'success': True,
        'message': 'Internship offer created successfully.',
        'offer': {
            'id': str(offer.id),
            'title': offer.title,
            'internship_type': offer.internship_type,
            'wilaya': offer.wilaya,
            'deadline': offer.deadline.strftime('%Y-%m-%d'),
            'is_active': offer.is_active,
            'created_at': offer.created_at.strftime('%Y-%m-%d'),
            'image_url': f"/api/company/offers/{offer.id}/image/" if offer.image else None,
        }
    }, status=201)
   


@api_view(['GET'])
def serve_offer_image(request, offer_id):
    """Stream the offer's image from GridFS"""
    try:
        offer = InternshipOffer.objects(id=offer_id).first()
        if not offer or not offer.image:
            return HttpResponse(status=404)
        image_data = offer.image.read()
        content_type = offer.image.content_type or 'image/jpeg'
        response = HttpResponse(image_data, content_type=content_type)
        response['Content-Disposition'] = f'inline; filename="{offer.image.filename}"'
        return response
    except Exception as e:
        return HttpResponse(status=404)

@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['company'])
def view_offer(request, offer_id):
    company = _get_user_company(request.user)
    if not company:
        return Response({'success': False, 'message': 'Company profile not found.'}, status=404)

    try:
        offer = InternshipOffer.objects(id=offer_id, company=company).first()
    except Exception:
        return Response({'success': False, 'message': 'Invalid offer ID.'}, status=400)

    if not offer:
        return Response({'success': False, 'message': 'Offer not found or does not belong to your company.'}, status=404)

    return Response({
        'success': True,
        'offer': {
            'id': str(offer.id),
            'title': offer.title,
            'description': offer.description,
            'wilaya': offer.wilaya,
            'internship_type': offer.internship_type,
            'required_skills': offer.required_skills,
            'duration': offer.duration,
            'start_date': offer.start_date.strftime('%Y-%m-%d') if offer.start_date else None,
            'deadline': offer.deadline.strftime('%Y-%m-%d') if offer.deadline else None,
            'is_active': offer.is_active,
            'company_name': offer.company.company_name,
            'created_at': offer.created_at.strftime('%Y-%m-%d') if offer.created_at else None,
            'image_url': f"/api/company/offers/{offer.id}/image/" if offer.image else None,
        }
    })


@api_view(['PUT', 'PATCH'])
@jwt_authenticated
@role_required(allowed_roles=['company'])
@parser_classes([MultiPartParser, FormParser])
def update_offer(request, offer_id):
    company = _get_user_company(request.user)
    if not company:
        return Response({'success': False, 'message': 'Company profile not found.'}, status=404)
    
    perms = get_user_permissions(request.user)
    if not perms or not perms.can_modify_offer:
        return Response({'success': False, 'error': 'You do not have permission to modify offers.'}, status=403)

    try:
        offer = InternshipOffer.objects(id=offer_id, company=company).first()
    except Exception:
        return Response({'success': False, 'message': 'Invalid offer ID.'}, status=400)

    if not offer:
        return Response({'success': False, 'message': 'Offer not found or does not belong to your company.'}, status=404)

    for field in ['title', 'description', 'wilaya', 'duration', 'is_active']:
        if field in request.data:
            setattr(offer, field, request.data[field])

    if 'internship_type' in request.data:
        if request.data['internship_type'] not in ['PFE', 'ouvrier', 'technicien', 'été']:
            return Response({'success': False, 'message': 'Invalid internship_type'}, status=400)
        offer.internship_type = request.data['internship_type']

    if 'start_date' in request.data:
        try:
            offer.start_date = datetime.strptime(request.data['start_date'], '%Y-%m-%d')
        except ValueError:
            return Response({'success': False, 'message': 'start_date must be YYYY-MM-DD'}, status=400)

    if 'deadline' in request.data:
        try:
            offer.deadline = datetime.strptime(request.data['deadline'], '%Y-%m-%d')
        except ValueError:
            return Response({'success': False, 'message': 'deadline must be YYYY-MM-DD'}, status=400)

    if 'required_skills' in request.data:
        skills = request.data['required_skills']
        if isinstance(skills, str):
            skills = [s.strip() for s in skills.split(',') if s.strip()]
        offer.required_skills = skills

    if 'title' in request.data:
        duplicate = InternshipOffer.objects(company=company, title=request.data['title']).first()
        if duplicate and str(duplicate.id) != offer_id:
            return Response({'success': False, 'message': 'An offer with this title already exists.'}, status=400)

    # Handle image update
    if 'image' in request.FILES:
        offer.image = request.FILES['image']

    offer.save()

    log_activity(
        user=request.user,
        action_type='update_offer',
        target_type='offer',
        target_id=str(offer.id),
        target_name=offer.title,
        details={'updated_fields': list(request.data.keys())}
    )

    return Response({
        'success': True,
        'message': 'Offer updated successfully.',
        'offer': {
            'id': str(offer.id),
            'title': offer.title,
            'image_url': f"/api/company/offers/{offer.id}/image/" if offer.image else None,
        }
    })

@api_view(['DELETE'])
@jwt_authenticated
@role_required(allowed_roles=['company'])
def delete_offer(request, offer_id):
    company = _get_user_company(request.user)
    if not company:
        return Response({'success': False, 'message': 'Company profile not found.'}, status=404)
    
    perms = get_user_permissions(request.user)
    if not perms or not perms.can_delete_offer:
        return Response({'success': False, 'error': 'You do not have permission to delete offers.'}, status=403)

    try:
        offer = InternshipOffer.objects(id=offer_id, company=company).first()
    except Exception:
        return Response({'success': False, 'message': 'Invalid offer ID.'}, status=400)

    if not offer:
        return Response({'success': False, 'message': 'Offer not found or does not belong to your company.'}, status=404)

    title = offer.title

    # Delete image from GridFS if present
    if offer.image:
        try:
            # The image field is a FileField backed by GridFS; deleting the file directly cleans up
            offer.image.delete()  # MongoEngine FileField has a delete() method
        except Exception as e:
            # Log and continue
            print(f"Warning: could not delete image for offer {offer_id}: {e}")

    offer.delete()

    log_activity(
        user=request.user,
        action_type='delete_offer',
        target_type='offer',
        target_id=offer_id,
        target_name=title
    )

    return Response({'success': True, 'message': f'Offer "{title}" deleted successfully.'})


@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['company'])
def company_applications(request):
    company = _get_user_company(request.user)
    if not company:
        return Response({'error': 'Company not found'}, status=404)

    offers = InternshipOffer.objects(company=company)
    offer_ids = [str(o.id) for o in offers]
    
    applications = Application.objects(offer__in=offer_ids).order_by('-applied_at')
    
    valid_applications = []
    for app in applications:
        try:
            if app.student:
                _ = app.student.full_name
                valid_applications.append(app)
        except Exception as e:
            print(f"⚠️ Skipping application {app.id} due to error: {e}")
            continue
    
    serializer = ApplicationSerializer(valid_applications, many=True)
    return Response({'success': True, 'applications': serializer.data})


# api/views.py - تعديل دالة respond_to_application

# api/views.py

@api_view(['POST'])
@jwt_authenticated
@role_required(allowed_roles=['company'])
def respond_to_application(request, application_id):
    company = _get_user_company(request.user)
    if not company:
        return Response({'error': 'Company not found'}, status=404)

    perms = get_user_permissions(request.user)
    if not perms or not perms.can_manage_applications:
        return Response({'success': False, 'error': 'You do not have permission to manage applications.'}, status=403)

    try:
        app = Application.objects(id=application_id).first()
        if not app:
            return Response({'error': 'Application not found'}, status=404)
        
        try:
            if not app.student:
                return Response({'error': 'Student no longer exists'}, status=404)
            _ = app.student.full_name
        except Exception as e:
            return Response({'error': f'Invalid student reference: {str(e)}'}, status=404)
        
        if str(app.offer.company.id) != str(company.id):
            return Response({'error': 'Unauthorized'}, status=403)

        new_status = request.data.get('status')
        if new_status not in ['accepted', 'rejected']:
            return Response({'error': 'Status must be "accepted" or "rejected"'}, status=400)

        # ========== حالة الرفض ==========
        if new_status == 'rejected':
            reason = request.data.get('rejection_reason', '').strip()
            if not reason:
                return Response({'error': 'A rejection reason is required.'}, status=400)
            app.company_notes = reason
            app.status = 'rejected_by_company'
            
            log_activity(
                user=request.user,
                action_type='reject_application',
                target_type='application',
                target_id=str(app.id),
                target_name=f"{app.student.full_name} - {app.offer.title}",
                details={
                    'offer_title': app.offer.title,
                    'student_name': app.student.full_name,
                    'reason': reason
                }
            )
            
            # إشعار للطالب
            Notification.objects.create(
                recipient=app.student.user,
                message=f"❌ Votre candidature pour '{app.offer.title}' a été refusée par {company.company_name}.",
                related_id=str(app.id)
            )
            
            # ✅ إشعار لـ Company Manager
            if company.user:
                Notification.objects.create(
                    recipient=company.user,
                    message=f"❌ Application from {app.student.full_name} for '{app.offer.title}' has been rejected by {request.user.username}.",
                    related_id=str(app.id)
                )
            
            # ✅ إشعار لجميع Hiring Managers (ما عدا من قام بالإجراء)
            hiring_managers = User.objects(
                role='company',
                sub_role='hiring_manager',
                status=True,
                pending_company_id=str(company.id)
            )
            for hm in hiring_managers:
                if str(hm.id) != str(request.user.id):
                    Notification.objects.create(
                        recipient=hm,
                        message=f"❌ Application from {app.student.full_name} for '{app.offer.title}' has been rejected.",
                        related_id=str(app.id)
                    )
            
            app.save()
            return Response({'success': True, 'message': f'Application rejected successfully.'})

        # ========== حالة القبول ==========
        else:  # new_status == 'accepted'
            app.company_notes = request.data.get('notes', '')
            app.status = 'accepted_by_company'
            app.company_response_date = datetime.now()
            
            log_activity(
                user=request.user,
                action_type='accept_application',
                target_type='application',
                target_id=str(app.id),
                target_name=f"{app.student.full_name} - {app.offer.title}",
                details={
                    'offer_title': app.offer.title,
                    'student_name': app.student.full_name,
                    'company_name': company.company_name
                }
            )

            # ========== 1. إشعار للطالب ==========
            Notification.objects.create(
                recipient=app.student.user,
                message=f"✅ Félicitations ! Votre candidature pour '{app.offer.title}' a été acceptée par {company.company_name}. En attente de validation par votre université.",
                related_id=str(app.id)
            )
            print(f"✅ Notification envoyée à l'étudiant {app.student.user.email}")
            
            # ========== 2. إشعار لـ Company Manager ==========
            if company.user and str(company.user.id) != str(request.user.id):
                Notification.objects.create(
                    recipient=company.user,
                    message=f"✅ Application from {app.student.full_name} for '{app.offer.title}' has been accepted by {request.user.username}.",
                    related_id=str(app.id)
                )
                print(f"✅ Notification envoyée au Company Manager {company.user.email}")
            
            # ========== 3. إشعار لجميع Hiring Managers (ما عدا من قام بالإجراء) ==========
            hiring_managers = User.objects(
                role='company',
                sub_role='hiring_manager',
                status=True,
                pending_company_id=str(company.id)
            )
            for hm in hiring_managers:
                if str(hm.id) != str(request.user.id):
                    Notification.objects.create(
                        recipient=hm,
                        message=f"✅ Application from {app.student.full_name} for '{app.offer.title}' has been accepted.",
                        related_id=str(app.id)
                    )
                    print(f"✅ Notification envoyée au Hiring Manager {hm.email}")
            
            # ========== 4. إشعار لـ Department Head ==========
            student_university = app.student.university
            dept_heads = Admin.objects(university=student_university)
            
            for admin in dept_heads:
                if admin.user and admin.user.role == 'admin' and admin.user.sub_role == 'admin' and admin.user.status:
                    Notification.objects.create(
                        recipient=admin.user,
                        message=f"📋 Nouvelle convention en attente de validation : {app.student.full_name} - {app.offer.title} ({company.company_name})",
                        related_id=str(app.id)
                    )
                    print(f"✅ Notification envoyée au Department Head {admin.user.email}")
            
            # ========== 5. إشعار لـ Co Department Head ==========
            co_dept_users = User.objects(
                role='admin',
                sub_role='co_dept_head',
                status=True
            )
            
            found_co_dept = False
            for co_user in co_dept_users:
                co_admin = Admin.objects(user=co_user, university=student_university).first()
                if co_admin:
                    Notification.objects.create(
                        recipient=co_user,
                        message=f"📋 Nouvelle convention en attente de validation : {app.student.full_name} - {app.offer.title} ({company.company_name})",
                        related_id=str(app.id)
                    )
                    found_co_dept = True
                    print(f"✅ Notification envoyée au Co Department Head {co_user.email}")
            
            if not found_co_dept:
                print(f"⚠️ Aucun Co Department Head trouvé pour l'université {student_university}")
            
            # ========== 6. Envoi des emails ==========
            send_company_response_email(app.student.user.email, app.offer.title, new_status)
            
            dept_head_email = dept_heads.first().user.email if dept_heads else None
            dept_head_name = dept_heads.first().full_name if dept_heads else "Administrator"
            
            send_validation_pending_to_co_dept(
                co_dept_email=dept_head_email,
                co_dept_name=dept_head_name,
                student_name=app.student.full_name,
                company_name=company.company_name,
                offer_title=app.offer.title,
                application_id=str(app.id)
            )

            app.save()
            return Response({'success': True, 'message': f'Application accepted successfully.'})

    except Exception as e:
        print(f"❌ Erreur: {str(e)}")
        traceback.print_exc()
        return Response({'error': str(e)}, status=500)
    # Dans views.py - Ajouter cet endpoint
@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['admin'], allowed_sub_roles=['co_dept_head'])
def get_co_dept_pending_conventions(request):
    """Récupère les conventions en attente de validation pour le Co Department Head"""
    try:
        co_dept = Admin.objects(user=request.user).first()
        if not co_dept:
            return Response({'success': False, 'error': 'Co Department Head profile not found'}, status=404)
        
        students = Student.objects(university=co_dept.university)
        student_ids = [str(s.id) for s in students]
        
        pending_count = Application.objects(
            student__in=student_ids,
            status='accepted_by_company'
        ).count()
        
        # Récupérer les détails des conventions en attente
        pending_applications = Application.objects(
            student__in=student_ids,
            status='accepted_by_company'
        ).order_by('-applied_at')
        
        pending_list = []
        for app in pending_applications:
            pending_list.append({
                'id': str(app.id),
                'student_name': app.student.full_name,
                'offer_title': app.offer.title,
                'company_name': app.offer.company.company_name,
                'applied_at': app.applied_at.strftime('%d/%m/%Y %H:%M')
            })
        
        return Response({
            'success': True, 
            'count': pending_count,
            'pending_conventions': pending_list
        })
        
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)
@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['admin'])
def get_pending_convention_notifications(request):
    """Récupère les notifications de conventions en attente de validation"""
    try:
        notifications = Notification.objects(
            recipient=request.user,
            related_id__ne=None,  # Qui ont un related_id
            is_read=False
        ).order_by('-created_at')
        
        # Filtrer celles qui sont des conventions en attente
        pending = []
        for notif in notifications:
            if 'attente de validation' in notif.message.lower() or 'nouvelle convention' in notif.message.lower():
                # Récupérer la candidature associée
                application = Application.objects(id=notif.related_id).first()
                if application and application.status == 'accepted_by_company':
                    pending.append({
                        'id': str(notif.id),
                        'message': notif.message,
                        'created_at': notif.created_at.strftime("%d/%m/%Y %H:%M"),
                        'application_id': notif.related_id,
                        'student_name': application.student.full_name,
                        'offer_title': application.offer.title,
                        'company_name': application.offer.company.company_name
                    })
        
        return Response({'success': True, 'pending_conventions': pending, 'count': len(pending)})
        
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)

@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['admin'], allowed_sub_roles=['admin', 'co_dept_head'])
def get_pending_conventions_count(request):
    """Récupère le nombre de conventions en attente de validation (pour Dept Head et Co Dept Head)"""
    try:
        admin_profile = Admin.objects(user=request.user).first()
        if not admin_profile:
            return Response({'success': False, 'error': 'Admin profile not found'}, status=404)
        
        students = Student.objects(university=admin_profile.university)
        student_ids = [str(s.id) for s in students]
        
        pending_count = Application.objects(
            student__in=student_ids,
            status='accepted_by_company'
        ).count()
        
        return Response({'success': True, 'count': pending_count})
        
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)

@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['admin'], allowed_sub_roles=['co_dept_head'])
def get_co_dept_pending_conventions_count(request):
    """Récupère le nombre de conventions en attente de validation pour le Co Department Head"""
    try:
        co_dept = Admin.objects(user=request.user).first()
        if not co_dept:
            return Response({'success': False, 'error': 'Co Department Head profile not found'}, status=404)
        
        students = Student.objects(university=co_dept.university)
        student_ids = [str(s.id) for s in students]
        
        pending_count = Application.objects(
            student__in=student_ids,
            status='accepted_by_company'
        ).count()
        
        return Response({'success': True, 'count': pending_count})
        
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)
@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['company'])
def download_application_cv(request, application_id):
    company = _get_user_company(request.user)
    if not company:
        return Response({'error': 'Company not found'}, status=404)
    try:
        app = Application.objects(id=application_id).first()
        if not app:
            return Response({'error': 'Application not found'}, status=404)
        if str(app.offer.company.id) != str(company.id):
            return Response({'error': 'Unauthorized'}, status=403)
        if not app.cv_file:
            return Response({'error': 'No CV file attached'}, status=404)
        response = HttpResponse(app.cv_file.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="cv_{application_id}.pdf"'
        return response
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['company'], allowed_sub_roles=['company_manager'])
def get_pending_hiring_managers(request):
    company = Company.objects(user=request.user).first()
    if not company:
        return Response({'error': 'Company not found', 'success': False}, status=404)

    pending = []
    for user in User.objects(role='company', sub_role='hiring_manager', status=False):
        if user.pending_company_id == str(company.id):
            pending.append({
                'id': str(user.id),
                'username': user.username,
                'email': user.email,
                'company_name': company.company_name,
                'created_at': user.created_at,
                'description': "Pending approval",
                'location': company.location,
                'industry': company.industry,
            })
    return Response({'success': True, 'hiring_managers': pending})


@api_view(['POST'])
@jwt_authenticated
@role_required(allowed_roles=['company'], allowed_sub_roles=['company_manager'])
def approve_hiring_manager(request, user_id):
    hiring_user = User.objects(id=user_id, role='company', sub_role='hiring_manager', status=False).first()
    if not hiring_user:
        return Response({'error': 'Hiring manager not found', 'success': False}, status=404)

    company = Company.objects(user=request.user).first()
    if not hiring_user.pending_company_id or hiring_user.pending_company_id != str(company.id):
        return Response({'error': 'Unauthorized', 'success': False}, status=403)

    hiring_user.status = True
    hiring_user.save()
    
    log_activity(
        user=request.user,
        action_type='approve_hiring_manager',
        target_type='user',
        target_id=str(hiring_user.id),
        target_name=hiring_user.username,
        details={'company_name': company.company_name}
    )
    
    send_approval_email(hiring_user.email, hiring_user.username, "Hiring Manager", request.user.username)
    return Response({'success': True, 'message': f'Hiring manager {hiring_user.username} approved.'})


@api_view(['POST'])
@jwt_authenticated
@role_required(allowed_roles=['company'], allowed_sub_roles=['company_manager'])
def reject_hiring_manager(request, user_id):
    hiring_user = User.objects(id=user_id, role='company', sub_role='hiring_manager', status=False).first()
    if not hiring_user:
        return Response({'error': 'Hiring manager not found', 'success': False}, status=404)

    company = Company.objects(user=request.user).first()
    if not hiring_user.pending_company_id or hiring_user.pending_company_id != str(company.id):
        return Response({'error': 'Unauthorized', 'success': False}, status=403)

    hiring_user_email = hiring_user.email
    hiring_user_username = hiring_user.username
    
    hiring_user.delete()
    
    log_activity(
        user=request.user,
        action_type='reject_hiring_manager',
        target_type='user',
        target_id=user_id,
        target_name=hiring_user_username,
        details={
            'company_name': company.company_name,
            'deleted': True,
            'email': hiring_user_email
        }
    )
    
    return Response({
        'success': True, 
        'message': f'Hiring manager {hiring_user_username} a été supprimé.',
        'deleted': True
    })


# ==================== ADMIN ====================

@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['admin'])
def get_pending_company_managers(request):
    pending = []
    for user in User.objects(role='company', sub_role='company_manager', status=False):
        company = Company.objects(user=user).first()
        pending.append({
            'id': str(user.id),
            'username': user.username,
            'email': user.email,
            'company_name': company.company_name if company else '',
            'description': company.description if company else '',
            'location': company.location if company else '',
            'website': company.website if company else '',
            'industry': company.industry if company else '',
            'created_at': user.created_at,
        })
    return Response({'success': True, 'company_managers': pending})


@api_view(['POST'])
@jwt_authenticated
@role_required(allowed_roles=['admin'])
def approve_company_manager(request, user_id):
    manager = User.objects(id=user_id, role='company', sub_role='company_manager', status=False).first()
    if not manager:
        return Response({'error': 'Company manager not found', 'success': False}, status=404)

    manager.status = True
    manager.save()
    company = Company.objects(user=manager).first()
    if company:
        company.verified = True
        company.save()

    cleanup_pending_approval(str(manager.id))
    send_approval_email(manager.email, manager.username, "Company Manager", request.user.username)
    return Response({'success': True, 'message': f'Company manager {manager.username} approved.'})


@api_view(['POST'])
@jwt_authenticated
@role_required(allowed_roles=['admin'])
def reject_company_manager(request, user_id):
    manager = User.objects(id=user_id, role='company', sub_role='company_manager', status=False).first()
    if not manager:
        return Response({'error': 'Company manager not found', 'success': False}, status=404)

    manager.rejected = True
    manager.save()
    return Response({'success': True, 'message': f'Company manager {manager.username} rejected.'})


@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['admin'], allowed_sub_roles=['admin'])
def get_pending_co_dept_heads(request):
    dept_head_admin = Admin.objects(user=request.user).first()
    if not dept_head_admin:
        return Response({'error': 'Admin profile not found', 'success': False}, status=404)

    pending = []
    for user in User.objects(role='admin', sub_role='co_dept_head', status=False):
        if user.pending_admin_id == str(dept_head_admin.id):
            pending.append({
                'id': str(user.id),
                'username': user.username,
                'email': user.email,
                'full_name': "Pending",
                'wilaya': dept_head_admin.wilaya,
                'university': dept_head_admin.university,
                'created_at': user.created_at,
            })
    return Response({'success': True, 'co_dept_heads': pending})


@api_view(['POST'])
@jwt_authenticated
@role_required(allowed_roles=['admin'], allowed_sub_roles=['admin'])
def approve_co_dept_head(request, user_id):
    co_dept = User.objects(id=user_id, role='admin', sub_role='co_dept_head', status=False).first()
    if not co_dept:
        return Response({'error': 'Co Department Head not found', 'success': False}, status=404)

    dept_head_admin = Admin.objects(user=request.user).first()
    if not dept_head_admin or not co_dept.pending_admin_id or co_dept.pending_admin_id != str(dept_head_admin.id):
        return Response({'error': 'Unauthorized', 'success': False}, status=403)

    co_dept.status = True
    co_dept.save()

    if not Admin.objects(user=co_dept).first():
        Admin(user=co_dept, full_name=co_dept.username, wilaya=dept_head_admin.wilaya,
              university=dept_head_admin.university).save()

    log_activity(
        user=request.user,
        action_type='approve_co_dept_head',
        target_type='user',
        target_id=str(co_dept.id),
        target_name=co_dept.username,
        details={'university': dept_head_admin.university}
    )

    send_approval_email(co_dept.email, co_dept.username, "Co Department Head", request.user.username)
    return Response({'success': True, 'message': f'Co Department Head {co_dept.username} approved.'})


@api_view(['POST'])
@jwt_authenticated
@role_required(allowed_roles=['admin'], allowed_sub_roles=['admin'])
def reject_co_dept_head(request, user_id):
    co_dept = User.objects(id=user_id, role='admin', sub_role='co_dept_head', status=False).first()
    if not co_dept:
        return Response({'error': 'Co Department Head not found', 'success': False}, status=404)

    dept_head_admin = Admin.objects(user=request.user).first()
    if not dept_head_admin or not co_dept.pending_admin_id or co_dept.pending_admin_id != str(dept_head_admin.id):
        return Response({'error': 'Unauthorized', 'success': False}, status=403)

    co_dept_email = co_dept.email
    co_dept_username = co_dept.username
    
    admin_profile = Admin.objects(user=co_dept).first()
    if admin_profile:
        admin_profile.delete()
    
    co_dept.delete()
    
    log_activity(
        user=request.user,
        action_type='reject_co_dept_head',
        target_type='user',
        target_id=user_id,
        target_name=co_dept_username,
        details={
            'university': dept_head_admin.university,
            'deleted': True,
            'email': co_dept_email
        }
    )
    
    return Response({
        'success': True, 
        'message': f'Co Department Head {co_dept_username} a été supprimé.',
        'deleted': True
    })


@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['admin'])
def admin_dashboard(request):
    return Response({'message': 'Admin dashboard', 'success': True})


@api_view(['POST'])
@jwt_authenticated
@role_required(allowed_roles=['admin'])
def validate_application(request, application_id):
    return Response({'message': f'Validate application {application_id}', 'success': True})


@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['admin'])
def generate_agreement(request, application_id):
    return Response({'message': f'Generate agreement {application_id}', 'success': True})


@api_view(['POST'])
def request_proof_from_admin(request, pending_id):
    pending = PendingApproval.objects(id=pending_id, verification_status='pending').first()
    if not pending:
        return Response({'error': 'Pending request not found', 'success': False}, status=404)

    pending.verification_status = 'proof_requested'
    pending.proof_requested_at = datetime.now()
    pending.save()

    role_display = "Company Manager" if pending.sub_role == 'company_manager' else "Department Head"
    admin_email = "stageplatform.verification@gmail.com"
    send_proof_request_email(pending.email, pending.username, role_display, admin_email)
    return Response({'success': True, 'message': 'Proof request sent'})


@api_view(['POST'])
def mark_proof_received(request, pending_id):
    pending = PendingApproval.objects(id=pending_id, verification_status='proof_requested').first()
    if not pending:
        return Response({'error': 'Pending request not found', 'success': False}, status=404)

    pending.verification_status = 'proof_received'
    pending.proof_received_at = datetime.now()
    pending.save()
    send_proof_received_confirmation(pending.email, pending.username)
    return Response({'success': True, 'message': 'Proof received marked'})


@api_view(['GET'])
def get_skills_tags(request):
    common_skills = [
        'React', 'Angular', 'Vue.js', 'Node.js', 'Django', 'Flask',
        'Java', 'Spring Boot', 'Python', 'PHP', 'Laravel',
        'JavaScript', 'TypeScript', 'HTML/CSS', 'Bootstrap',
        'MongoDB', 'MySQL', 'PostgreSQL', 'Firebase',
        'Git', 'Docker', 'AWS', 'REST API', 'GraphQL',
    ]
    return Response({'skills': common_skills})


@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['student'])
def download_application_cv_student(request, application_id):
    """Download CV for a specific application (student view)"""
    try:
        from gridfs import GridFS
        from mongoengine.connection import get_db
        from bson import ObjectId
        from django.http import HttpResponse, FileResponse
        
        student = Student.objects(user=request.user).first()
        if not student:
            return Response({'error': 'Student profile not found'}, status=404)
        
        application = Application.objects(id=application_id).first()
        if not application:
            return Response({'error': 'Application not found'}, status=404)
        
        # التحقق من أن الطلب يخص هذا الطالب
        if str(application.student.id) != str(student.id):
            return Response({'error': 'Unauthorized'}, status=403)
        
        if not application.cv_file:
            return Response({'error': 'No CV file attached'}, status=404)
        
        # قراءة الملف من GridFS
        db = get_db()
        fs = GridFS(db)
        
        # الحصول على GridFS ID
        if hasattr(application.cv_file, 'grid_id'):
            file_id = application.cv_file.grid_id
        else:
            file_id = ObjectId(application.cv_file)
        
        file_obj = fs.get(file_id)
        
        # ✅ إرسال الملف مع إعدادات لعرضه بشكل صحيح
        response = HttpResponse(file_obj.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="cv_{application_id}.pdf"'
        response['X-Content-Type-Options'] = 'nosniff'
        response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response['Pragma'] = 'no-cache'
        response['Expires'] = '0'
        return response
        
    except Exception as e:
        print(f"❌ Error in download_application_cv_student: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
def list_companies(request):
    """
    List companies that have completed their profile (CompanyProfile)
    sorted by number of active offers (top companies first)
    """
    try:
        companies_with_data = []
        
        # جلب جميع CompanyProfile
        all_profiles = CompanyProfile.objects()
        
        print(f"📊 Number of CompanyProfile found: {all_profiles.count()}")
        
        for profile in all_profiles:
            print(f"🔍 Processing profile: company_id={profile.company_id}")
            
            # البحث عن الشركة
            company = Company.objects(id=profile.company_id).first()
            
            if company:
                print(f"✅ Found company: {company.company_name}")
                
                # جلب العروض
                offers = InternshipOffer.objects(company=company)
                active_offers = offers.filter(is_active=True).count()
                total_offers = offers.count()
                
                # حساب عدد التطبيقات
                students_applied = 0
                for offer in offers:
                    apps = Application.objects(offer=offer)
                    students_applied += apps.count()
                
                # بناء البيانات
                company_data = {
                    'id': str(company.id),
                    'company_name': profile.name or company.company_name,
                    'description': profile.description or company.description or '',
                    'industry': profile.industry or company.industry or '',
                    'location': profile.location or company.location or 'Algeria',
                    'logo': profile.logo or company.logo or '',
                    'cover_picture': profile.cover_picture or '',
                    'website': profile.website or company.website or '',
                    'email': profile.contact_email or (company.user.email if company.user else ''),
                    'phone': profile.phone or getattr(company, 'phone', ''),
                    'active_offers': active_offers,
                    'total_offers': total_offers,  # إضافة total_offers
                    'students_applied': students_applied,
                    'has_profile': True
                }
                
                companies_with_data.append(company_data)
                print(f"✅ Added {company.company_name} with {active_offers} active offers")
            else:
                print(f"⚠️ No company found for profile: {profile.company_id}")
        
        # إذا لم يتم العثور على شركات، جلب الشركات العادية كـ fallback
        if len(companies_with_data) == 0:
            print("📊 No CompanyProfile found, fetching regular companies...")
            
            all_companies = Company.objects()
            for company in all_companies:
                if company.user and company.user.status:
                    offers = InternshipOffer.objects(company=company)
                    active_offers = offers.filter(is_active=True).count()
                    total_offers = offers.count()
                    
                    students_applied = 0
                    for offer in offers:
                        apps = Application.objects(offer=offer)
                        students_applied += apps.count()
                    
                    companies_with_data.append({
                        'id': str(company.id),
                        'company_name': company.company_name,
                        'description': company.description or '',
                        'industry': company.industry or '',
                        'location': company.location or 'Algeria',
                        'logo': company.logo or '',
                        'cover_picture': '',
                        'website': company.website or '',
                        'email': company.user.email if company.user else '',
                        'phone': getattr(company, 'phone', ''),
                        'active_offers': active_offers,
                        'total_offers': total_offers,
                        'students_applied': students_applied,
                        'has_profile': False
                    })
        
        # 🔥 الترتيب حسب عدد العروض النشطة (الأعلى أولاً)
        companies_with_data.sort(key=lambda x: x['active_offers'], reverse=True)
        
        print(f"📊 Total companies to display: {len(companies_with_data)}")
        
        # عرض جميع الشركات (الترتيب سيكون حسب العروض)
        return Response(companies_with_data)
        
    except Exception as e:
        print(f"❌ Error in list_companies: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response([])

@api_view(['GET'])
def public_offers(request):
    today_start = timezone.make_aware(datetime.combine(timezone.now().date(), datetime.min.time()))
    offers = InternshipOffer.objects(is_active=True, deadline__gte=today_start).order_by('-created_at')[:6]
    
    result = []
    for offer in offers:
        applicants_count = Application.objects(offer=offer).count()
        result.append({
            'id': str(offer.id),
            'title': offer.title,
            'description': offer.description,
            'company_name': offer.company_name,
            'wilaya': offer.wilaya,
            'internship_type': offer.internship_type,
            'required_skills': offer.required_skills,
            'duration': offer.duration,
            'start_date': offer.start_date.strftime('%Y-%m-%d') if offer.start_date else None,
            'deadline': offer.deadline.strftime('%Y-%m-%d') if offer.deadline else None,
            'is_active': offer.is_active,
            'created_at': offer.created_at.strftime('%Y-%m-%d') if offer.created_at else None,
            'applicants_count': applicants_count,
            'rating': 4,
            'level': offer.internship_type,
            'type': offer.internship_type,
            'contact_name': offer.company_name,
        })
    
    return Response({'success': True, 'offers': result})


# ==================== NOTIFICATIONS ====================

@api_view(['GET'])
@jwt_authenticated
def get_notifications(request):
    try:
        notifications = Notification.objects(recipient=request.user).order_by('-created_at')
        
        result = []
        for notif in notifications:
            notif_type = 'default'
            message = notif.message
            if 'validé' in message or 'Félicitations' in message:
                notif_type = 'convention_validated'
            elif 'refusé' in message:
                notif_type = 'convention_rejected'
            elif 'acceptée' in message:
                notif_type = 'application_accepted'
            elif 'refusée' in message:
                notif_type = 'application_rejected'
            elif 'attente' in message:
                notif_type = 'pending_validation'
            
            result.append({
                'id': str(notif.id),
                'message': notif.message,
                'is_read': notif.is_read,
                'created_at': notif.created_at.strftime("%d/%m/%Y %H:%M"),
                'type': notif_type,
                'related_id': notif.related_id
            })
        
        return Response({'success': True, 'notifications': result})
        
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['POST'])
@jwt_authenticated
def mark_notifications_read(request):
    Notification.objects(recipient=request.user, is_read=False).update(set__is_read=True)
    return Response({'success': True})


@api_view(['PATCH'])
@jwt_authenticated
def mark_notification_read(request, notification_id):
    try:
        notification = Notification.objects(id=notification_id, recipient=request.user).first()
        if not notification:
            return Response({'success': False, 'error': 'Notification non trouvée'}, status=404)
        
        notification.is_read = True
        notification.save()
        return Response({'success': True})
        
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['POST'])
@jwt_authenticated
def mark_all_notifications_read(request):
    try:
        Notification.objects(recipient=request.user, is_read=False).update(set__is_read=True)
        return Response({'success': True})
        
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


# ==================== CO DEPT HEAD / ADMIN VALIDATIONS ====================

@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['admin'], allowed_sub_roles=['co_dept_head'])
def co_dept_pending_validations(request):
    try:
        co_dept = Admin.objects(user=request.user).first()
        if not co_dept:
            return Response({'success': False, 'error': 'Profil Co Department Head non trouvé'}, status=404)
        
        students = Student.objects(university=co_dept.university)
        student_ids = [str(s.id) for s in students]
        
        applications = Application.objects(
            student__in=student_ids,
            status__in=['accepted_by_company', 'validated_by_co_dept']
        ).order_by('-applied_at')
        
        result = []
        for app in applications:
            student = app.student
            offer = app.offer
            company = offer.company if offer else None
            
            convention_url = None
            if app.convention_pdf:
                convention_url = f'/api/co-dept/download-convention/{str(app.id)}/'
            
            result.append({
                'id': str(app.id),
                'status': app.status,
                'applied_at': app.applied_at.strftime('%Y-%m-%d %H:%M') if app.applied_at else None,
                'company_response_date': app.company_response_date.strftime('%Y-%m-%d %H:%M') if app.company_response_date else None,
                'cover_letter': app.cover_letter,
                'cv_file_url': f'/api/co-dept/application/{str(app.id)}/cv/' if app.cv_file else None,
                'convention_url': convention_url,
                'student': {
                    'id': str(student.id),
                    'full_name': student.full_name,
                    'email': student.user.email if student.user else None,
                    'wilaya': student.wilaya,
                    'skills': student.skills,
                    'github': student.github,
                    'portfolio': student.portfolio,
                    'education_level': student.education_level,
                    'university': student.university,
                    'major': student.major,
                    'graduation_year': student.graduation_year,
                },
                'offer': {
                    'id': str(offer.id),
                    'title': offer.title,
                    'description': offer.description,
                    'wilaya': offer.wilaya,
                    'internship_type': offer.internship_type,
                    'required_skills': offer.required_skills,
                    'duration': offer.duration,
                    'start_date': offer.start_date.strftime('%Y-%m-%d') if offer.start_date else None,
                    'deadline': offer.deadline.strftime('%Y-%m-%d') if offer.deadline else None,
                },
                'company': {
                    'id': str(company.id) if company else None,
                    'company_name': company.company_name if company else None,
                    'description': company.description if company else None,
                    'location': company.location if company else None,
                    'industry': company.industry if company else None,
                    'email': company.user.email if company and company.user else None,
                }
            })
        
        return Response({'success': True, 'count': len(result), 'applications': result})
        
    except Exception as e:
        print(f"❌ Erreur: {str(e)}")
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['admin'], allowed_sub_roles=['co_dept_head'])
def co_dept_get_application_details(request, application_id):
    try:
        application = Application.objects(id=application_id).first()
        if not application:
            return Response({'success': False, 'error': 'Candidature non trouvée'}, status=404)
        
        co_dept = Admin.objects(user=request.user).first()
        if application.student.university != co_dept.university:
            return Response({'success': False, 'error': 'Non autorisé'}, status=403)
        
        student = application.student
        offer = application.offer
        company = offer.company if offer else None
        
        result = {
            'id': str(application.id),
            'status': application.status,
            'applied_at': application.applied_at.strftime('%Y-%m-%d %H:%M') if application.applied_at else None,
            'company_response_date': application.company_response_date.strftime('%Y-%m-%d %H:%M') if application.company_response_date else None,
            'company_notes': application.company_notes,
            'cover_letter': application.cover_letter,
            'student': {
                'id': str(student.id),
                'full_name': student.full_name,
                'email': student.user.email if student.user else None,
                'wilaya': student.wilaya,
                'skills': student.skills,
                'github': student.github,
                'portfolio': student.portfolio,
                'education_level': student.education_level,
                'university': student.university,
                'major': student.major,
                'graduation_year': student.graduation_year,
            },
            'offer': {
                'id': str(offer.id),
                'title': offer.title,
                'description': offer.description,
                'wilaya': offer.wilaya,
                'internship_type': offer.internship_type,
                'required_skills': offer.required_skills,
                'duration': offer.duration,
                'start_date': offer.start_date.strftime('%Y-%m-%d') if offer.start_date else None,
                'end_date': (offer.start_date + timedelta(days=90)).strftime('%Y-%m-%d') if offer.start_date else None,
            },
            'company': {
                'id': str(company.id) if company else None,
                'company_name': company.company_name if company else None,
                'email': company.user.email if company and company.user else None,
            }
        }
        
        return Response({'success': True, 'application': result})
        
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['admin'], allowed_sub_roles=['co_dept_head'])
def co_dept_download_cv(request, application_id):
    try:
        application = Application.objects(id=application_id).first()
        if not application:
            return Response({'error': 'Application not found'}, status=404)
        
        co_dept = Admin.objects(user=request.user).first()
        if application.student.university != co_dept.university:
            return Response({'error': 'Unauthorized'}, status=403)
        
        if not application.cv_file:
            return Response({'error': 'No CV file attached'}, status=404)
        
        response = HttpResponse(application.cv_file.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="cv_{application.student.full_name}.pdf"'
        return response
        
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@jwt_authenticated
@role_required(allowed_roles=['admin'], allowed_sub_roles=['co_dept_head'])
def co_dept_validate_application(request, application_id):
    try:
        if not check_permission(request.user, 'can_manage_conventions'):
            return Response({
                'success': False, 
                'error': "Vous n'avez pas la permission de valider des conventions. Veuillez contacter le Department Head pour obtenir les droits nécessaires."
            }, status=status.HTTP_403_FORBIDDEN)
        
        application = Application.objects(id=application_id).first()
        if not application:
            return Response({'success': False, 'error': 'Candidature non trouvée'}, status=404)
        
        co_dept = Admin.objects(user=request.user).first()
        if not co_dept:
            return Response({'success': False, 'error': 'Profil non trouvé'}, status=404)
        
        if application.student.university != co_dept.university:
            return Response({'success': False, 'error': 'Non autorisé'}, status=403)
        
        if application.status != 'accepted_by_company':
            return Response({'success': False, 'error': f'Statut invalide: {application.status}'}, status=400)
        
        convention_pdf = generate_internship_agreement_pdf(application, co_dept)
        
        application.status = 'validated_by_co_dept'
        application.co_dept_validation_date = datetime.now()
        application.co_dept_notes = f"Validée par {co_dept.full_name} le {datetime.now().strftime('%d/%m/%Y')}"
        application.convention_pdf = convention_pdf
        application.co_dept_id = str(co_dept.id)
        application.save()
        
        log_activity(
            user=request.user,
            action_type='validate_convention',
            target_type='convention',
            target_id=str(application.id),
            target_name=f"{application.student.full_name} - {application.offer.title}",
            details={
                'student_name': application.student.full_name,
                'offer_title': application.offer.title,
                'company_name': application.offer.company.company_name
            }
        )
        
        send_convention_validated_email(application, co_dept)
        
        Notification.objects.create(
            recipient=application.student.user,
            message=f" Félicitations ! Votre stage '{application.offer.title}' a été validé par {co_dept.full_name}. Votre convention de stage est disponible.",
            related_id=str(application.id)
        )
        Notification.objects.create(
            recipient=application.offer.company.user,
            message=f" La candidature de {application.student.full_name} pour '{application.offer.title}' a été validée par l'université {co_dept.university}.",
            related_id=str(application.id)
        )
        
        return Response({
            'success': True,
            'message': 'Candidature validée et convention générée',
            'convention_url': f'/api/co-dept/download-convention/{application.id}/'
        })
        
    except Exception as e:
        print(f" Erreur: {str(e)}")
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['POST'])
@jwt_authenticated
@role_required(allowed_roles=['admin'], allowed_sub_roles=['co_dept_head'])
def co_dept_reject_application(request, application_id):
    try:
        if not check_permission(request.user, 'can_manage_conventions'):
            return Response({
                'success': False, 
                'error': "Vous n'avez pas la permission de refuser des conventions. Veuillez contacter le Department Head pour obtenir les droits nécessaires."
            }, status=status.HTTP_403_FORBIDDEN)
        
        rejection_reason = request.data.get('rejection_reason', '').strip()
        if not rejection_reason:
            return Response({'success': False, 'error': 'La raison du refus est obligatoire'}, status=400)
        
        application = Application.objects(id=application_id).first()
        if not application:
            return Response({'success': False, 'error': 'Candidature non trouvée'}, status=404)
        
        co_dept = Admin.objects(user=request.user).first()
        if not co_dept:
            return Response({'success': False, 'error': 'Profil non trouvé'}, status=404)
        
        if application.student.university != co_dept.university:
            return Response({'success': False, 'error': 'Non autorisé'}, status=403)
        
        if application.status != 'accepted_by_company':
            return Response({'success': False, 'error': f'Statut invalide: {application.status}'}, status=400)
        
        application.status = 'rejected_by_co_dept'
        application.co_dept_notes = rejection_reason
        application.co_dept_validation_date = datetime.now()
        application.co_dept_id = str(co_dept.id)
        application.save()
        
        log_activity(
            user=request.user,
            action_type='reject_convention',
            target_type='convention',
            target_id=str(application.id),
            target_name=f"{application.student.full_name} - {application.offer.title}",
            details={
                'reason': rejection_reason,
                'student_name': application.student.full_name,
                'offer_title': application.offer.title
            }
        )
        
        send_convention_rejected_email(application, co_dept, rejection_reason)
        
        Notification.objects.create(
            recipient=application.student.user,
            message=f" Votre stage '{application.offer.title}' a été refusé par {co_dept.full_name}. Motif: {rejection_reason[:100]}...",
            related_id=str(application.id)
        )
        Notification.objects.create(
            recipient=application.offer.company.user,
            message=f" La candidature de {application.student.full_name} pour '{application.offer.title}' a été refusée par l'université.",
            related_id=str(application.id)
        )
        
        return Response({'success': True, 'message': 'Candidature refusée'})
        
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['admin'], allowed_sub_roles=['co_dept_head','admin'])
def co_dept_download_convention(request, application_id):
    try:
        application = Application.objects(id=application_id).first()
        if not application:
            return Response({'error': 'Application not found'}, status=404)
        
        co_dept = Admin.objects(user=request.user).first()
        if application.student.university != co_dept.university:
            return Response({'error': 'Unauthorized'}, status=403)
        
        if not application.convention_pdf:
            return Response({'error': 'Convention not generated yet'}, status=404)
        
        response = HttpResponse(application.convention_pdf.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="convention_{application.student.full_name}_{application.offer.company.company_name}.pdf"'
        return response
        
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['admin'], allowed_sub_roles=['admin'])
def dept_head_pending_validations(request):
    try:
        dept_head = Admin.objects(user=request.user).first()
        if not dept_head:
            return Response({'success': False, 'error': 'Profil Department Head non trouvé'}, status=404)
        
        dept_head_university = dept_head.university
        
        students = Student.objects(university=dept_head_university)
        student_ids = [str(s.id) for s in students]
        
        applications = Application.objects(
            student__in=student_ids,
            status='accepted_by_company'
        ).order_by('-applied_at')
        
        result = []
        for app in applications:
            student = app.student
            offer = app.offer
            company = offer.company if offer else None
            
            convention_url = None
            if app.convention_pdf:
                convention_url = f'/api/dept-head/download-convention/{str(app.id)}/'
            
            result.append({
                'id': str(app.id),
                'status': app.status,
                'applied_at': app.applied_at.strftime('%Y-%m-%d %H:%M') if app.applied_at else None,
                'company_response_date': app.company_response_date.strftime('%Y-%m-%d %H:%M') if app.company_response_date else None,
                'cover_letter': app.cover_letter,
                'cv_file_url': f'/api/dept-head/application/{str(app.id)}/cv/' if app.cv_file else None,
                'convention_url': convention_url,
                'student': {
                    'id': str(student.id),
                    'full_name': student.full_name,
                    'email': student.user.email if student.user else None,
                    'wilaya': student.wilaya,
                    'skills': student.skills,
                    'github': student.github,
                    'portfolio': student.portfolio,
                    'education_level': student.education_level,
                    'university': student.university,
                    'major': student.major,
                    'graduation_year': student.graduation_year,
                },
                'offer': {
                    'id': str(offer.id),
                    'title': offer.title,
                    'description': offer.description,
                    'wilaya': offer.wilaya,
                    'internship_type': offer.internship_type,
                    'required_skills': offer.required_skills,
                    'duration': offer.duration,
                    'start_date': offer.start_date.strftime('%Y-%m-%d') if offer.start_date else None,
                    'deadline': offer.deadline.strftime('%Y-%m-%d') if offer.deadline else None,
                },
                'company': {
                    'id': str(company.id) if company else None,
                    'company_name': company.company_name if company else None,
                    'description': company.description if company else None,
                    'location': company.location if company else None,
                    'industry': company.industry if company else None,
                    'email': company.user.email if company and company.user else None,
                }
            })
        
        return Response({'success': True, 'count': len(result), 'applications': result})
        
    except Exception as e:
        print(f" Erreur: {str(e)}")
        traceback.print_exc()
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['admin'], allowed_sub_roles=['admin'])
def dept_head_download_cv(request, application_id):
    try:
        application = Application.objects(id=application_id).first()
        if not application:
            return Response({'error': 'Application not found'}, status=404)
        
        dept_head = Admin.objects(user=request.user).first()
        if application.student.university != dept_head.university:
            return Response({'error': 'Unauthorized'}, status=403)
        
        if not application.cv_file:
            return Response({'error': 'No CV file attached'}, status=404)
        
        response = HttpResponse(application.cv_file.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="cv_{application.student.full_name}.pdf"'
        return response
        
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@jwt_authenticated
@role_required(allowed_roles=['admin'], allowed_sub_roles=['admin'])
def dept_head_validate_application(request, application_id):
    try:
        application = Application.objects(id=application_id).first()
        if not application:
            return Response({'success': False, 'error': 'Candidature non trouvée'}, status=404)
        
        dept_head = Admin.objects(user=request.user).first()
        if not dept_head:
            return Response({'success': False, 'error': 'Profil non trouvé'}, status=404)
        
        if application.student.university != dept_head.university:
            return Response({'success': False, 'error': 'Non autorisé'}, status=403)
        
        if application.status != 'accepted_by_company':
            return Response({'success': False, 'error': f'Statut invalide: {application.status}'}, status=400)
        
        convention_pdf = generate_internship_agreement_pdf(application, dept_head)
        
        application.status = 'validated_by_co_dept'
        application.co_dept_validation_date = datetime.now()
        application.co_dept_notes = f"Validée par {dept_head.full_name} le {datetime.now().strftime('%d/%m/%Y')}"
        application.convention_pdf = convention_pdf
        application.co_dept_id = str(dept_head.id)
        application.save()
        
        log_activity(
            user=request.user,
            action_type='validate_convention',
            target_type='convention',
            target_id=str(application.id),
            target_name=f"{application.student.full_name} - {application.offer.title}",
            details={
                'student_name': application.student.full_name,
                'offer_title': application.offer.title,
                'company_name': application.offer.company.company_name,
                'validated_by': 'dept_head'
            }
        )
        
        send_convention_validated_email(application, dept_head)
        
        Notification.objects.create(
            recipient=application.student.user,
            message=f" Félicitations ! Votre stage '{application.offer.title}' a été validé par {dept_head.full_name}. Votre convention de stage est disponible.",
            related_id=str(application.id)
        )
        Notification.objects.create(
            recipient=application.offer.company.user,
            message=f" La candidature de {application.student.full_name} pour '{application.offer.title}' a été validée par l'université {dept_head.university}.",
            related_id=str(application.id)
        )
        
        return Response({
            'success': True,
            'message': 'Candidature validée et convention générée',
            'convention_url': f'/api/dept-head/download-convention/{application.id}/'
        })
        
    except Exception as e:
        print(f" Erreur: {str(e)}")
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['POST'])
@jwt_authenticated
@role_required(allowed_roles=['admin'], allowed_sub_roles=['admin'])
def dept_head_reject_application(request, application_id):
    try:
        rejection_reason = request.data.get('rejection_reason', '').strip()
        if not rejection_reason:
            return Response({'success': False, 'error': 'La raison du refus est obligatoire'}, status=400)
        
        application = Application.objects(id=application_id).first()
        if not application:
            return Response({'success': False, 'error': 'Candidature non trouvée'}, status=404)
        
        dept_head = Admin.objects(user=request.user).first()
        if not dept_head:
            return Response({'success': False, 'error': 'Profil non trouvé'}, status=404)
        
        if application.student.university != dept_head.university:
            return Response({'success': False, 'error': 'Non autorisé'}, status=403)
        
        if application.status != 'accepted_by_company':
            return Response({'success': False, 'error': f'Statut invalide: {application.status}'}, status=400)
        
        application.status = 'rejected_by_co_dept'
        application.co_dept_notes = rejection_reason
        application.co_dept_validation_date = datetime.now()
        application.co_dept_id = str(dept_head.id)
        application.save()
        
        log_activity(
            user=request.user,
            action_type='reject_convention',
            target_type='convention',
            target_id=str(application.id),
            target_name=f"{application.student.full_name} - {application.offer.title}",
            details={
                'reason': rejection_reason,
                'student_name': application.student.full_name,
                'offer_title': application.offer.title,
                'rejected_by': 'dept_head'
            }
        )
        
        send_convention_rejected_email(application, dept_head, rejection_reason)
        
        Notification.objects.create(
            recipient=application.student.user,
            message=f" Votre stage '{application.offer.title}' a été refusé par {dept_head.full_name}. Motif: {rejection_reason[:100]}...",
            related_id=str(application.id)
        )
        Notification.objects.create(
            recipient=application.offer.company.user,
            message=f" La candidature de {application.student.full_name} pour '{application.offer.title}' a été refusée par l'université.",
            related_id=str(application.id)
        )
        
        return Response({'success': True, 'message': 'Candidature refusée'})
        
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['admin'], allowed_sub_roles=['admin'])
def dept_head_download_convention(request, application_id):
    try:
        application = Application.objects(id=application_id).first()
        if not application:
            return Response({'error': 'Application not found'}, status=404)
        
        dept_head = Admin.objects(user=request.user).first()
        if application.student.university != dept_head.university:
            return Response({'error': 'Unauthorized'}, status=403)
        
        if not application.convention_pdf:
            return Response({'error': 'Convention not generated yet'}, status=404)
        
        response = HttpResponse(application.convention_pdf.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="convention_{application.student.full_name}_{application.offer.company.company_name}.pdf"'
        return response
        
    except Exception as e:
        return Response({'error': str(e)}, status=500)


# ==================== ACTIVITY LOGS ====================

@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['company'], allowed_sub_roles=['company_manager'])
def get_company_activity_logs(request):
    try:
        company = Company.objects(user=request.user).first()
        if not company:
            return Response({'success': False, 'error': 'Company not found'}, status=404)
        
        hiring_managers = User.objects(
            role='company',
            sub_role='hiring_manager',
            status=True,
            pending_company_id=str(company.id)
        )
        hiring_manager_ids = [str(hm.id) for hm in hiring_managers]
        hiring_manager_ids.append(str(request.user.id))
        
        logs = ActivityLog.objects(
            user_id__in=hiring_manager_ids,
            action_type__in=[
                'create_offer', 'update_offer', 'delete_offer',
                'accept_application', 'reject_application',
                'approve_hiring_manager', 'reject_hiring_manager'
            ]
        ).order_by('-created_at')
        
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        action_type = request.query_params.get('action_type')
        
        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d')
                logs = logs.filter(created_at__gte=start_date_obj)
            except:
                pass
        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1)
                logs = logs.filter(created_at__lte=end_date_obj)
            except:
                pass
        if action_type:
            logs = logs.filter(action_type=action_type)
        
        result = []
        for log in logs:
            result.append({
                'id': str(log.id),
                'user_email': log.user_email,
                'user_name': log.user_email.split('@')[0],
                'action_type': log.action_type,
                'action_label': {
                    'create_offer': 'Création d\'offre',
                    'update_offer': 'Modification d\'offre',
                    'delete_offer': 'Suppression d\'offre',
                    'accept_application': 'Acceptation de candidature',
                    'reject_application': 'Refus de candidature',
                    'approve_hiring_manager': 'Approbation Hiring Manager',
                    'reject_hiring_manager': 'Refus Hiring Manager'
                }.get(log.action_type, log.action_type),
                'target_type': log.target_type,
                'target_name': log.target_name,
                'details': log.details,
                'created_at': log.created_at.strftime('%d/%m/%Y %H:%M:%S'),
                'status': log.status
            })
        
        stats = {
            'total_actions': logs.count(),
            'by_type': {},
            'last_7_days': logs.filter(created_at__gte=datetime.now() - timedelta(days=7)).count(),
            'top_actors': {}
        }
        
        for log in logs:
            action = log.action_type
            stats['by_type'][action] = stats['by_type'].get(action, 0) + 1
        
        return Response({
            'success': True,
            'logs': result,
            'stats': stats,
            'count': len(result)
        })
        
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['admin'], allowed_sub_roles=['admin'])
def get_dept_head_activity_logs(request):
    try:
        dept_head = Admin.objects(user=request.user).first()
        if not dept_head:
            return Response({'success': False, 'error': 'Admin profile not found'}, status=404)
        
        co_dept_admins = Admin.objects(university=dept_head.university)
        
        co_dept_ids = []
        for admin in co_dept_admins:
            if admin.user and admin.user.role == 'admin' and admin.user.sub_role == 'co_dept_head':
                co_dept_ids.append(str(admin.user.id))
        
        co_dept_ids.append(str(request.user.id))
        
        logs = ActivityLog.objects(
            user_id__in=co_dept_ids
        ).order_by('-created_at')
        
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        action_type = request.query_params.get('action_type')
        
        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d')
                logs = logs.filter(created_at__gte=start_date_obj)
            except:
                pass
        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1)
                logs = logs.filter(created_at__lte=end_date_obj)
            except:
                pass
        if action_type:
            logs = logs.filter(action_type=action_type)
        
        result = []
        for log in logs:
            action_labels = {
                'validate_convention': 'Validation de convention',
                'reject_convention': 'Refus de convention',
                'generate_convention': 'Génération de convention',
                'approve_co_dept_head': 'Approbation Co Dept Head',
                'reject_co_dept_head': 'Refus Co Dept Head',
                'add_signature': 'Ajout de signature',
                'update_permissions': 'Modification des permissions',
                'delete_co_dept_head': 'Suppression Co Dept Head',
                'create_offer': 'Création d\'offre',
                'update_offer': 'Modification d\'offre',
                'delete_offer': 'Suppression d\'offre',
                'accept_application': 'Acceptation de candidature',
                'reject_application': 'Refus de candidature'
            }
            
            result.append({
                'id': str(log.id),
                'user_email': log.user_email,
                'user_name': log.user_email.split('@')[0],
                'action_type': log.action_type,
                'action_label': action_labels.get(log.action_type, log.action_type),
                'target_type': log.target_type,
                'target_name': log.target_name,
                'details': log.details,
                'created_at': log.created_at.strftime('%d/%m/%Y %H:%M:%S'),
                'status': log.status
            })
        
        stats = {
            'total_actions': logs.count(),
            'by_type': {},
            'validations_count': logs.filter(action_type='validate_convention').count(),
            'rejections_count': logs.filter(action_type='reject_convention').count(),
            'generations_count': logs.filter(action_type='generate_convention').count(),
            'approvals_count': logs.filter(action_type='approve_co_dept_head').count(),
            'rejections_co_count': logs.filter(action_type='reject_co_dept_head').count(),
            'signatures_count': logs.filter(action_type='add_signature').count(),
            'permissions_count': logs.filter(action_type='update_permissions').count(),
            'deletions_count': logs.filter(action_type='delete_co_dept_head').count(),
            'offers_count': logs.filter(action_type__in=['create_offer', 'update_offer', 'delete_offer']).count(),
            'applications_count': logs.filter(action_type__in=['accept_application', 'reject_application']).count()
        }
        
        for log in logs:
            action = log.action_type
            stats['by_type'][action] = stats['by_type'].get(action, 0) + 1
        
        return Response({
            'success': True,
            'logs': result,
            'stats': stats,
            'count': len(result)
        })
        
    except Exception as e:
        print(f" Erreur: {str(e)}")
        traceback.print_exc()
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
@jwt_authenticated
def check_user_exists(request):
    try:
        user = User.objects(id=str(request.user.id)).first()
        return Response({'exists': user is not None})
    except Exception as e:
        return Response({'exists': False, 'error': str(e)})


# ==================== CONVENTION / PDF GENERATION ====================

def generate_internship_agreement_pdf(application, admin_user):
    from reportlab.lib.pagesizes import A4
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, HRFlowable
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.lib import colors
    from django.core.files.base import ContentFile
    from io import BytesIO
    import base64
    import io

    buffer = BytesIO()
    PAGE_W, PAGE_H = A4
    LEFT_MARGIN = 1.5 * cm
    RIGHT_MARGIN = 1.5 * cm
    TOP_MARGIN = 1.5 * cm
    BOTTOM_MARGIN = 1.5 * cm
    CONTENT_WIDTH = PAGE_W - LEFT_MARGIN - RIGHT_MARGIN

    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        topMargin=TOP_MARGIN, bottomMargin=BOTTOM_MARGIN,
        leftMargin=LEFT_MARGIN, rightMargin=RIGHT_MARGIN,
    )
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle', parent=styles['Normal'],
        fontSize=13, fontName='Helvetica-Bold',
        alignment=1, spaceAfter=2,
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle', parent=styles['Normal'],
        fontSize=10, fontName='Helvetica',
        alignment=1, spaceAfter=6,
    )
    section_header_style = ParagraphStyle(
        'SectionHeader', parent=styles['Normal'],
        fontSize=9, fontName='Helvetica-Bold',
        alignment=1, spaceAfter=0, spaceBefore=0,
    )
    label_style = ParagraphStyle(
        'Label', parent=styles['Normal'],
        fontSize=8.5, fontName='Helvetica',
        leading=12, spaceAfter=0,
    )
    bold_label_style = ParagraphStyle(
        'BoldLabel', parent=label_style,
        fontName='Helvetica-Bold',
    )
    small_italic_style = ParagraphStyle(
        'SmallItalic', parent=styles['Normal'],
        fontSize=6.5, fontName='Helvetica-Oblique',
        leading=8, alignment=1,
    )
    footer_style = ParagraphStyle(
        'Footer', parent=styles['Normal'],
        fontSize=7, fontName='Helvetica',
        alignment=1, leading=10,
    )

    story = []
    today = datetime.now().strftime('%d/%m/%Y')

    company = application.offer.company
    student = application.student
    offer = application.offer

    company_name = getattr(company, 'company_name', '') or ''
    company_location = getattr(company, 'location', '') or ''
    company_email = getattr(company.user, 'email', '') if hasattr(company, 'user') else ''
    company_phone = getattr(company, 'phone', '') or ''

    student_name = getattr(student, 'full_name', '') or ''
    student_email = getattr(student.user, 'email', '') if hasattr(student, 'user') else ''
    university = getattr(student, 'university', '') or ''
    major = getattr(student, 'major', '') or ''
    edu_level = getattr(student, 'education_level', '') or ''

    start_date = offer.start_date.strftime('%d/%m/%Y') if getattr(offer, 'start_date', None) else '___/___/______'
    end_date = offer.end_date.strftime('%d/%m/%Y') if getattr(offer, 'end_date', None) else '___/___/______'
    duration = getattr(offer, 'duration', '') or ''
    offer_title = getattr(offer, 'title', '') or ''

    admin_name = getattr(admin_user, 'full_name', '') or ''

    version_style = ParagraphStyle(
        'Version', parent=styles['Normal'],
        fontSize=7, fontName='Helvetica',
        alignment=2,
    )
    story.append(Paragraph(f"Version du {today}", version_style))
    story.append(Spacer(1, 0.15 * cm))

    story.append(Paragraph("<b>Convention de Stage EP1</b>", title_style))
    story.append(Paragraph(offer_title if offer_title else "Intitulé de la formation / du stage", subtitle_style))
    story.append(Spacer(1, 0.3 * cm))

    COL = CONTENT_WIDTH / 2

    def _field(label, value='', width=None):
        val = value.strip() if value else ''
        line = '_' * 30 if not val else val
        return Paragraph(f"{label} : {line}", label_style)

    def _line(label=''):
        return Paragraph(f"{label} ____________________________", label_style)

    left_cell = [
        Paragraph("<b>1 - L'ÉTABLISSEMENT DE FORMATION</b>", section_header_style),
        Spacer(1, 0.2 * cm),
        Paragraph(f"Nom : {university}", label_style),
        Spacer(1, 0.15 * cm),
        Paragraph(f"Adresse : {getattr(admin_user, 'address', '') or 'Non renseignée'}", label_style),
        Spacer(1, 0.15 * cm),
        Paragraph("SIRET ____________________", label_style),
        Spacer(1, 0.15 * cm),
        Paragraph(f"Représenté par {admin_name}, responsable pédagogique", label_style),
        Spacer(1, 0.15 * cm),
        Paragraph("téléphone ____________________", label_style),
        Spacer(1, 0.15 * cm),
        Paragraph(f"e-mail : {getattr(admin_user.user, 'email', '') if hasattr(admin_user, 'user') else ''}", label_style),
    ]

    right_cell = [
        Paragraph("<b>2 - L'ORGANISME D'ACCUEIL</b>", section_header_style),
        Spacer(1, 0.2 * cm),
        Paragraph(f"Nom : {company_name}", label_style),
        Spacer(1, 0.15 * cm),
        Paragraph(f"Adresse complète : {company_location}", label_style),
        Spacer(1, 0.15 * cm),
        Paragraph("N° SIRET : ____________________", label_style),
        Spacer(1, 0.15 * cm),
        Paragraph("Représenté par (nom du signataire de la convention) :", label_style),
        Paragraph("____________________________", label_style),
        Spacer(1, 0.15 * cm),
        Paragraph("Qualité du représentant : ____________________", label_style),
        Spacer(1, 0.15 * cm),
        Paragraph(f"téléphone : {company_phone or '____________________'}", label_style),
        Spacer(1, 0.15 * cm),
        Paragraph(f"e-mail : {company_email or '____________________'}", label_style),
        Spacer(1, 0.15 * cm),
        Paragraph("Lieu(x) du stage (si différent de l'adresse de l'organisme) : ____________________", label_style),
    ]

    two_col = Table([[left_cell, right_cell]], colWidths=[COL, COL])
    two_col.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.8, colors.black),
        ('LINEBEFORE', (1, 0), (1, 0), 0.8, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(two_col)
    story.append(Spacer(1, 0.3 * cm))

    birth_date = getattr(student, 'birth_date', None)
    birth_str = birth_date.strftime('%d/%m/%Y') if birth_date else '___/___/______'

    # CORRECTION ICI : extraire nom et prénom avant la f-string
    name_parts = student_name.split() if student_name else []
    last_name = name_parts[-1] if name_parts else '____________________'
    first_name = ' '.join(name_parts[:-1]) if len(name_parts) > 1 else '____________________'

    stagiaire_content = [
        Paragraph("<b>3 - LE STAGIAIRE</b>", section_header_style),
        Spacer(1, 0.25 * cm),
        Paragraph(
            f"Nom : <b>{last_name}</b>"
            f"      Prénom : <b>{first_name}</b>"
            f"      Sexe : F ☐  M ☐      Né(e) le : {birth_str}",
            label_style,
        ),
        Spacer(1, 0.2 * cm),
        Paragraph("Adresse : ____________________________", label_style),
        Spacer(1, 0.2 * cm),
        Paragraph(f"téléphone __________________      e-mail : {student_email}", label_style),
        Spacer(1, 0.25 * cm),
        Paragraph(
            "<u>Intitulé de la formation suivi dans l'établissement de formation et volume horaire (annuel ou semestriel) :</u>",
            bold_label_style,
        ),
        Paragraph(f"{edu_level} – {major} (volume horaire à préciser)", label_style),
    ]

    stagiaire_table = Table([[stagiaire_content]], colWidths=[CONTENT_WIDTH])
    stagiaire_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.8, colors.black),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(stagiaire_table)
    story.append(Spacer(1, 0.3 * cm))

    stage_content = [
        Paragraph(f"<u><b>Sujet de Stage</b></u> : {offer_title}", bold_label_style),
        Spacer(1, 0.2 * cm),
        Paragraph(f"Dates : Du <b>{start_date}</b>   Au <b>{end_date}</b>", label_style),
        Spacer(1, 0.15 * cm),
        Paragraph(f"Représentant une durée totale de <b>{duration}</b> heures sur toute la période du stage", label_style),
        Spacer(1, 0.15 * cm),
        Paragraph("Et correspondant à _______ jours de présence effective", label_style),
        Spacer(1, 0.15 * cm),
        Paragraph(
            "Répartition si présence discontinue : _______nombre d'heures par semaine ou nombre d'heures par jour (rayer la mention inutile).",
            label_style,
        ),
        Spacer(1, 0.15 * cm),
        Paragraph("Commentaire : ____________________________", label_style),
        Spacer(1, 0.2 * cm),
        Paragraph(
            "Chaque période au moins égale à sept heures de présence, consécutives ou non, est considérée comme équivalente à un jour et chaque période au moins égale à vingt jours de présence, consécutifs ou non, est considérée comme équivalente à un mois. (art D124-6 Code de l'éducation)",
            small_italic_style,
        ),
    ]

    stage_table = Table([[stage_content]], colWidths=[CONTENT_WIDTH])
    stage_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.8, colors.black),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(stage_table)
    story.append(Spacer(1, 0.3 * cm))

    signature_img = None
    stamp_img = None

    if getattr(application, 'university_signature', None):
        try:
            sig_data = application.university_signature
            if ',' in sig_data:
                sig_data = sig_data.split(',')[1]
            img_data = base64.b64decode(sig_data)
            img_io = io.BytesIO(img_data)
            signature_img = Image(img_io, width=4 * cm, height=1.5 * cm)
        except Exception as e:
            print(f"Erreur chargement signature: {e}")

    if getattr(application, 'university_stamp', None):
        try:
            stamp_data = application.university_stamp
            if ',' in stamp_data:
                stamp_data = stamp_data.split(',')[1]
            stamp_img_data = base64.b64decode(stamp_data)
            stamp_io = io.BytesIO(stamp_img_data)
            stamp_img = Image(stamp_io, width=3 * cm, height=3 * cm)
        except Exception as e:
            print(f"Erreur chargement cachet: {e}")

    enc_left = [
        Paragraph("<b>Encadrement du stagiaire par l'établissement de formation</b>", section_header_style),
        Spacer(1, 0.2 * cm),
        Paragraph(f"Nom et prénom du formateur référent : {admin_name}", label_style),
        Spacer(1, 0.15 * cm),
        Paragraph("Fonction : responsable pédagogique", label_style),
        Spacer(1, 0.15 * cm),
        Paragraph(
            f"Téléphone : ____________________      e-mail : {getattr(admin_user.user, 'email', '') if hasattr(admin_user, 'user') else ''}",
            label_style,
        ),
        Spacer(1, 0.3 * cm),
        Paragraph("<b>Signature de l'université :</b>", bold_label_style),
        Spacer(1, 0.15 * cm),
        signature_img if signature_img else Paragraph("____________________________", label_style),
    ]

    enc_right = [
        Paragraph("<b>Encadrement du stagiaire par L'organisme d'accueil</b>", section_header_style),
        Spacer(1, 0.2 * cm),
        Paragraph("Nom et prénom du tuteur de stage : ____________________", label_style),
        Spacer(1, 0.15 * cm),
        Paragraph("Fonction : ____________________", label_style),
        Spacer(1, 0.3 * cm),
        Paragraph("<b>Cachet de l'université :</b>", bold_label_style),
        Spacer(1, 0.15 * cm),
        stamp_img if stamp_img else Paragraph("____________________________", label_style),
    ]

    enc_table = Table([[enc_left, enc_right]], colWidths=[COL, COL])
    enc_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.8, colors.black),
        ('LINEBEFORE', (1, 0), (1, 0), 0.8, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(enc_table)
    story.append(Spacer(1, 0.4 * cm))

    admin_email = getattr(admin_user.user, 'email', '') if hasattr(admin_user, 'user') else ''
    admin_address = getattr(admin_user, 'address', '') or "Adresse de l'université"
    
    footer_lines = f"{university}  –  {admin_address}<br/>Tél : ____________________  –  Email : {admin_email}<br/>SIRET ____________________  –  APE ______  –  Déclaration d'activité enregistrée sous le numéro ____________________<br/>auprès du préfet de région"
    story.append(HRFlowable(width=CONTENT_WIDTH, thickness=0.5, color=colors.black))
    story.append(Spacer(1, 0.1 * cm))
    story.append(Paragraph(footer_lines, footer_style))

    doc.build(story)

    pdf_content = ContentFile(buffer.getvalue())
    pdf_content.name = f"convention_{student_name}_{company_name}.pdf"
    return pdf_content

@api_view(['POST'])
@jwt_authenticated
@role_required(allowed_roles=['admin'], allowed_sub_roles=['admin', 'co_dept_head'])
def add_university_signature(request, application_id):
    try:
        if not check_permission(request.user, 'can_add_signature'):
            return Response({
                'success': False, 
                'error': "Vous n'avez pas la permission d'ajouter une signature. Veuillez contacter le Department Head pour obtenir les droits nécessaires."
            }, status=status.HTTP_403_FORBIDDEN)
        
        application = Application.objects(id=application_id).first()
        if not application:
            return Response({'success': False, 'error': 'Application not found'}, status=404)
        
        admin_profile = Admin.objects(user=request.user).first()
        if not admin_profile:
            return Response({'success': False, 'error': 'Admin profile not found'}, status=404)
        
        if application.student.university != admin_profile.university:
            return Response({'success': False, 'error': 'Unauthorized'}, status=403)
        
        if application.status != 'validated_by_co_dept':
            return Response({'success': False, 'error': 'Convention not validated yet'}, status=400)
        
        signature_data = request.data.get('signature', '')
        if not signature_data:
            return Response({'success': False, 'error': 'Signature data required'}, status=400)
        
        application.university_signature = signature_data
        application.university_signature_date = datetime.now()
        application.university_signed_by = admin_profile.full_name
        application.signature_status = 'university_signed'
        
        new_pdf = generate_internship_agreement_pdf(application, admin_profile)
        application.convention_pdf = new_pdf
        
        application.save()
        
        log_activity(
            user=request.user,
            action_type='add_signature',
            target_type='convention',
            target_id=str(application.id),
            target_name=f"{application.student.full_name} - {application.offer.title}",
            details={'signature_type': 'university', 'signed_by': admin_profile.full_name}
        )
        
        return Response({
            'success': True,
            'message': 'University signature added successfully',
            'signed_by': admin_profile.full_name,
            'signature_status': application.signature_status
        })
        
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['POST'])
@jwt_authenticated
@role_required(allowed_roles=['admin', 'company'])
def generate_convention_from_template(request, application_id):
    try:
        application = Application.objects(id=application_id).first()
        if not application:
            return Response({'success': False, 'error': 'Candidature non trouvée'}, status=404)
        
        user = request.user
        if user.role == 'admin':
            admin = Admin.objects(user=user).first()
            if not admin:
                return Response({'success': False, 'error': 'Profil admin non trouvé'}, status=404)
            if application.student.university != admin.university:
                return Response({'success': False, 'error': 'Non autorisé - Université différente'}, status=403)
        elif user.role == 'company':
            company = _get_user_company(user)
            if not company:
                return Response({'success': False, 'error': 'Profil entreprise non trouvé'}, status=404)
            if str(application.offer.company.id) != str(company.id):
                return Response({'success': False, 'error': 'Non autorisé - Cette candidature ne vous appartient pas'}, status=403)
        else:
            return Response({'success': False, 'error': 'Non autorisé - Rôle incorrect'}, status=403)
        
        if application.status not in ['accepted_by_company', 'validated_by_co_dept']:
            return Response({'success': False, 'error': f'Impossible de générer la convention - Statut actuel: {application.status}'}, status=400)
        
        pdf_content = generate_convention_pdf_template(application)
        pdf_data = pdf_content.read()
        
        from django.core.files.base import ContentFile
        application.convention_pdf = ContentFile(pdf_data, name=f"convention_{application.student.full_name}_{application.offer.company.company_name}.pdf")
        if application.status == 'accepted_by_company':
            application.status = 'validated_by_co_dept'
        application.co_dept_validation_date = datetime.now()
        application.co_dept_notes = f"Convention générée par {user.email} le {datetime.now().strftime('%d/%m/%Y %H:%M')}"
        application.save()
        
        log_activity(
            user=user,
            action_type='generate_convention',
            target_type='convention',
            target_id=str(application.id),
            target_name=f"{application.student.full_name} - {application.offer.title}",
            details={
                'generated_by': user.role,
                'student_name': application.student.full_name,
                'offer_title': application.offer.title
            }
        )
        
        response = HttpResponse(pdf_data, content_type='application/pdf')
        response['Content-Disposition'] = 'inline; filename="convention.pdf"'
        response['Content-Length'] = str(len(pdf_data))
        response['Access-Control-Expose-Headers'] = 'Content-Disposition'
        return response
        
    except Exception as e:
        print(f"❌ Erreur dans generate_convention_from_template: {str(e)}")
        traceback.print_exc()
        return Response({'success': False, 'error': str(e)}, status=500)


def generate_convention_pdf_template(application):
    from reportlab.lib.pagesizes import A4
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.lib import colors
    from django.core.files.base import ContentFile
    from io import BytesIO
    import base64
    import tempfile
    
    buffer = BytesIO()
    
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=A4,
        topMargin=2*cm,
        bottomMargin=2*cm,
        leftMargin=2*cm,
        rightMargin=2*cm
    )
    
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Title'],
        fontSize=16,
        alignment=1,  
        spaceAfter=20,
        textColor=colors.HexColor('#2c3e50')
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=12,
        alignment=0,
        spaceBefore=12,
        spaceAfter=6,
        textColor=colors.HexColor('#2980b9')
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=10,
        alignment=0,
        spaceAfter=4,
        leading=14
    )
    
    story = []
    
    today = datetime.now().strftime('%d/%m/%Y')
    
    story.append(Paragraph("REPUBLIQUE ALGERIENNE DEMOCRATIQUE ET POPULAIRE", title_style))
    story.append(Paragraph("MINISTERE DE L'ENSEIGNEMENT SUPERIEUR ET DE LA RECHERCHE SCIENTIFIQUE", title_style))
    story.append(Paragraph(f"<b>{application.student.university}</b>", title_style))
    story.append(Spacer(1, 1*cm))
    story.append(Paragraph("CONVENTION DE STAGE", title_style))
    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph(f"Fait à Alger, le {today}", normal_style))
    story.append(Spacer(1, 0.5*cm))
    
    # Article 1
    story.append(Paragraph("Article 1 : L'ÉTABLISSEMENT DE FORMATION", heading_style))
    story.append(Paragraph(f"""
    <b>Nom :</b> {application.student.university}<br/>
    <b>Adresse :</b> {application.student.wilaya}, Algérie<br/>
    <b>Représenté par :</b> Le Directeur du département<br/>
    <b>E-mail :</b> contact@{application.student.university.lower().replace(' ', '')}.dz
    """, normal_style))
    story.append(Spacer(1, 0.3*cm))
    
    # Article 2
    story.append(Paragraph("Article 2 : L'ORGANISME D'ACCUEIL", heading_style))
    company = application.offer.company
    company_phone = getattr(company, 'phone', None) or getattr(company, 'telephone', None) or 'Non renseigné'
    company_website = getattr(company, 'website', None) or 'Non renseigné'
    company_siret = getattr(company, 'siret', None) or getattr(company, 'siret_number', None) or company_website
    
    story.append(Paragraph(f"""
    <b>Nom :</b> {company.company_name}<br/>
    <b>Adresse complète :</b> {company.location}, Algérie<br/>
    <b>N° SIRET :</b> {company_siret}<br/>
    <b>Représenté par :</b> {company.user.username if company.user else 'Le responsable'}<br/>
    <b>Qualité du représentant :</b> {company.user.sub_role if company.user else 'Responsable'}<br/>
    <b>Téléphone :</b> {company_phone}<br/>
    <b>E-mail :</b> {company.user.email if company.user else 'Non renseigné'}<br/>
    <b>Lieu(x) du stage :</b> {application.offer.wilaya}
    """, normal_style))
    story.append(Spacer(1, 0.3*cm))
    
    # Article 3
    story.append(Paragraph("Article 3 : LE STAGIAIRE", heading_style))
    full_name_parts = application.student.full_name.split()
    first_name = full_name_parts[0] if full_name_parts else ''
    last_name = ' '.join(full_name_parts[1:]) if len(full_name_parts) > 1 else ''
    
    story.append(Paragraph(f"""
    <b>Nom :</b> {last_name}<br/>
    <b>Prénom :</b> {first_name}<br/>
    <b>Adresse :</b> {application.student.wilaya}, Algérie<br/>
    <b>E-mail :</b> {application.student.user.email if application.student.user else 'Non renseigné'}<br/>
    <b>INTITULÉ DE LA FORMATION :</b><br/>
    <b>{application.student.major}</b> - {application.student.education_level}<br/>
    (Année d'obtention: {application.student.graduation_year})
    """, normal_style))
    story.append(Spacer(1, 0.3*cm))
    
    # Article 4
    story.append(Paragraph("Article 4 : SUJET DE STAGE", heading_style))
    start_date = application.offer.start_date.strftime('%d/%m/%Y') if application.offer.start_date else "À déterminer"
    
    end_date_str = "À déterminer"
    if application.offer.start_date and application.offer.duration:
        duration_parts = application.offer.duration.split()
        if len(duration_parts) >= 2:
            try:
                duration_value = int(duration_parts[0])
                if 'mois' in duration_parts[1].lower():
                    end_date = application.offer.start_date + timedelta(days=duration_value * 30)
                elif 'semaine' in duration_parts[1].lower():
                    end_date = application.offer.start_date + timedelta(days=duration_value * 7)
                else:
                    end_date = application.offer.start_date + timedelta(days=duration_value)
                end_date_str = end_date.strftime('%d/%m/%Y')
            except:
                end_date_str = "À déterminer"
    
    story.append(Paragraph(f"""
    <b>Dates :</b> Du <b>{start_date}</b> Au <b>{end_date_str}</b><br/>
    <b>Durée totale :</b> {application.offer.duration}<br/>
    <b>Objectifs du stage :</b><br/>
    {application.offer.description}<br/>
    <b>Compétences requises :</b> {', '.join(application.offer.required_skills) if application.offer.required_skills else 'Non spécifiées'}
    """, normal_style))
    story.append(Spacer(1, 0.3*cm))
    
    # Article 5
    story.append(Paragraph("Article 5 : ENCADREMENT DU STAGIAIRE", heading_style))
    story.append(Paragraph("""
    <b>Par l'établissement de formation :</b><br/>
    Nom et prénom du formateur référent : Responsable pédagogique<br/>
    Fonction : Coordinateur des stages
    """, normal_style))
    story.append(Spacer(1, 0.2*cm))
    story.append(Paragraph(f"""
    <b>Par l'organisme d'accueil :</b><br/>
    Nom et prénom du tuteur de stage : {company.user.username if company.user else 'Responsable'}<br/>
    Fonction : {company.user.sub_role if company.user else 'Tuteur'}<br/>
    E-mail : {company.user.email if company.user else 'Non renseigné'}
    """, normal_style))
    story.append(Spacer(1, 0.5*cm))
    
    # Article 6 - Signatures
    story.append(Paragraph("Article 6 : Signatures", heading_style))
    story.append(Spacer(1, 0.5*cm))
    
    university_signature_img = None
    company_signature_img = None
    student_signature_img = None
    
    if application.university_signature:
        try:
            sig_data = application.university_signature
            if ',' in sig_data:
                sig_data = sig_data.split(',')[1]
            with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as tmp_file:
                tmp_file.write(base64.b64decode(sig_data))
                tmp_file_path = tmp_file.name
            university_signature_img = Image(tmp_file_path, width=3*cm, height=1.5*cm)
        except Exception as e:
            print(f"Erreur chargement signature université: {e}")
    
    if application.company_signature:
        try:
            sig_data = application.company_signature
            if ',' in sig_data:
                sig_data = sig_data.split(',')[1]
            with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as tmp_file:
                tmp_file.write(base64.b64decode(sig_data))
                tmp_file_path = tmp_file.name
            company_signature_img = Image(tmp_file_path, width=3*cm, height=1.5*cm)
        except Exception as e:
            print(f"Erreur chargement signature entreprise: {e}")
    
    if application.student_signature:
        try:
            sig_data = application.student_signature
            if ',' in sig_data:
                sig_data = sig_data.split(',')[1]
            with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as tmp_file:
                tmp_file.write(base64.b64decode(sig_data))
                tmp_file_path = tmp_file.name
            student_signature_img = Image(tmp_file_path, width=3*cm, height=1.5*cm)
        except Exception as e:
            print(f"Erreur chargement signature étudiant: {e}")
    
    signature_data = [
        ["", "", ""],
        ["<b>L'Établissement de formation</b>", "<b>L'Organisme d'accueil</b>", "<b>Le Stagiaire</b>"],
        ["", "", ""],
        ["", "", ""],
    ]
    
    signature_row = []
    if university_signature_img:
        signature_row.append(university_signature_img)
    else:
        signature_row.append(Paragraph("Signature :", normal_style))
    
    if company_signature_img:
        signature_row.append(company_signature_img)
    else:
        signature_row.append(Paragraph("Signature :", normal_style))
    
    if student_signature_img:
        signature_row.append(student_signature_img)
    else:
        signature_row.append(Paragraph("Signature :", normal_style))
    
    signature_data.append(signature_row)
    signature_data.append(["", "", ""])
    signature_data.append(["Date :", "Date :", f"Date : {today}"])
    
    signature_table = Table(signature_data, colWidths=[5*cm, 5*cm, 5*cm])
    signature_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('FONTNAME', (0,1), (-1,1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(signature_table)
    
    story.append(Spacer(1, 1*cm))
    story.append(Paragraph(f"""
    <i>Convention de stage générée automatiquement le {today}<br/>
    Conformément aux articles D124-1 à D124-13 du Code de l'éducation</i>
    """, normal_style))
    
    doc.build(story)
    
    pdf_content = ContentFile(buffer.getvalue())
    pdf_content.name = f"convention_{application.student.full_name}_{application.offer.company.company_name}.pdf"
    return pdf_content


# ==================== PERMISSIONS MANAGEMENT ====================

@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['company'], allowed_sub_roles=['company_manager'])
def get_hiring_managers_list(request):
    try:
        company = Company.objects(user=request.user).first()
        if not company:
            return Response({'success': False, 'error': 'Company not found'}, status=404)
        
        hiring_managers = User.objects(
            role='company',
            sub_role='hiring_manager',
            pending_company_id=str(company.id)
        )
        
        result = []
        for hm in hiring_managers:
            permissions = get_user_permissions(hm)
            result.append({
                'id': str(hm.id),
                'username': hm.username,
                'email': hm.email,
                'status': hm.status,
                'created_at': hm.created_at.strftime('%d/%m/%Y'),
                'permissions': {
                    'can_manage_applications': permissions.can_manage_applications if permissions else True,
                    'can_manage_hiring_managers': permissions.can_manage_hiring_managers if permissions else False,
                    'can_create_offer': permissions.can_create_offer if permissions else True,
                    'can_modify_offer': permissions.can_modify_offer if permissions else True,
                    'can_delete_offer': permissions.can_delete_offer if permissions else True,
                    'can_manage_company_profile': permissions.can_manage_company_profile if permissions else False,
                }
            })
        
        return Response({'success': True, 'hiring_managers': result})
        
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['admin'], allowed_sub_roles=['admin'])
def get_co_dept_heads_list(request):
    try:
        dept_head = Admin.objects(user=request.user).first()
        if not dept_head:
            return Response({'success': False, 'error': 'Admin profile not found'}, status=404)
        
        co_dept_admins = Admin.objects(university=dept_head.university)
        
        result = []
        for admin_profile in co_dept_admins:
            if admin_profile.user and admin_profile.user.role == 'admin' and admin_profile.user.sub_role == 'co_dept_head':
                cd = admin_profile.user
                permissions = get_user_permissions(cd)
                result.append({
                    'id': str(cd.id),
                    'username': cd.username,
                    'email': cd.email,
                    'status': cd.status,
                    'created_at': cd.created_at.strftime('%d/%m/%Y'),
                    'permissions': {
                        'can_manage_conventions': permissions.can_manage_conventions if permissions else True,
                        'can_manage_co_dept_heads': permissions.can_manage_co_dept_heads if permissions else False,
                        'can_add_signature': permissions.can_add_signature if permissions else True,
                        'can_add_stamp': permissions.can_add_stamp if permissions else True,
                        'can_manage_university_profile': permissions.can_manage_university_profile if permissions else False,
                    }
                })
        
        return Response({'success': True, 'co_dept_heads': result})
        
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['PUT'])
@jwt_authenticated
def update_hiring_manager_permissions(request, user_id):
    try:
        if request.user.role != 'company' or request.user.sub_role != 'company_manager':
            return Response({'success': False, 'error': 'Unauthorized'}, status=403)
        
        company = Company.objects(user=request.user).first()
        if not company:
            return Response({'success': False, 'error': 'Company not found'}, status=404)
        
        hiring_manager = User.objects(id=user_id, role='company', sub_role='hiring_manager').first()
        if not hiring_manager or hiring_manager.pending_company_id != str(company.id):
            return Response({'success': False, 'error': 'Hiring manager not found'}, status=404)
        
        permissions_data = {
            'can_manage_applications': request.data.get('can_manage_applications', True),
            'can_manage_hiring_managers': request.data.get('can_manage_hiring_managers', False),
            'can_create_offer': request.data.get('can_create_offer', True),
            'can_modify_offer': request.data.get('can_modify_offer', True),
            'can_delete_offer': request.data.get('can_delete_offer', True),
            'can_manage_company_profile': request.data.get('can_manage_company_profile', False),
        }

        perm_obj = UserPermission.objects(user_id=user_id).first()
        if not perm_obj:
            perm_obj = UserPermission(user_id=user_id)
        for field, value in permissions_data.items():
            setattr(perm_obj, field, value)
        perm_obj.updated_at = datetime.now()
        perm_obj.save()

        if not hiring_manager.permissions or str(hiring_manager.permissions.id) != str(perm_obj.id):
            hiring_manager.permissions = perm_obj
            hiring_manager.save()

        log_activity(
            user=request.user,
            action_type='update_permissions',
            target_type='user',
            target_id=user_id,
            target_name=hiring_manager.username,
            details={'permissions': permissions_data}
        )

        return Response({'success': True, 'message': 'Permissions updated successfully'})

    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['PUT'])
@jwt_authenticated
@role_required(allowed_roles=['admin'], allowed_sub_roles=['admin'])
def update_co_dept_head_permissions(request, user_id):
    try:
        if request.user.role != 'admin' or request.user.sub_role != 'admin':
            return Response({'success': False, 'error': 'Unauthorized'}, status=403)
        
        dept_head = Admin.objects(user=request.user).first()
        if not dept_head:
            return Response({'success': False, 'error': 'Admin profile not found'}, status=404)
        
        co_dept = User.objects(id=user_id, role='admin', sub_role='co_dept_head').first()
        if not co_dept:
            return Response({'success': False, 'error': 'Co Dept Head not found'}, status=404)
        
        co_dept_admin = Admin.objects(user=co_dept).first()
        if not co_dept_admin:
            return Response({'success': False, 'error': 'Co Dept Head admin profile not found'}, status=404)
        
        if co_dept_admin.university != dept_head.university:
            return Response({'success': False, 'error': f'Unauthorized - Different university'}, status=403)
        
        permissions_data = {
            'can_manage_conventions': request.data.get('can_manage_conventions', True),
            'can_manage_co_dept_heads': request.data.get('can_manage_co_dept_heads', False),
            'can_add_signature': request.data.get('can_add_signature', True),
            'can_add_stamp': request.data.get('can_add_stamp', True),
            'can_manage_university_profile': request.data.get('can_manage_university_profile', False),
        }

        perm_obj = UserPermission.objects(user_id=user_id).first()
        if not perm_obj:
            perm_obj = UserPermission(user_id=user_id)
        for field, value in permissions_data.items():
            setattr(perm_obj, field, value)
        perm_obj.updated_at = datetime.now()
        perm_obj.save()

        if not co_dept.permissions or str(co_dept.permissions.id) != str(perm_obj.id):
            co_dept.permissions = perm_obj
            co_dept.save()

        log_activity(
            user=request.user,
            action_type='update_permissions',
            target_type='user',
            target_id=user_id,
            target_name=co_dept.username,
            details={'permissions': permissions_data}
        )

        return Response({'success': True, 'message': 'Permissions updated successfully'})

    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


# ==================== DELETE / APPROVED LISTS ====================

@api_view(['DELETE'])
@jwt_authenticated
def delete_hiring_manager(request, user_id):
    try:
        if request.user.role != 'company' or request.user.sub_role != 'company_manager':
            return Response({'success': False, 'error': 'Unauthorized'}, status=403)
        
        company = Company.objects(user=request.user).first()
        if not company:
            return Response({'success': False, 'error': 'Company not found'}, status=404)
        
        hiring_manager = User.objects(id=user_id, role='company', sub_role='hiring_manager').first()
        if not hiring_manager or hiring_manager.pending_company_id != str(company.id):
            return Response({'success': False, 'error': 'Hiring manager not found'}, status=404)
        
        UserPermission.objects(user_id=user_id).delete()
        
        email = hiring_manager.email
        username = hiring_manager.username
        hiring_manager.delete()
        
        log_activity(
            user=request.user,
            action_type='delete_hiring_manager',
            target_type='user',
            target_id=user_id,
            target_name=username,
            details={'email': email}
        )
        
        return Response({'success': True, 'message': f'Hiring manager {username} deleted successfully'})
        
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['DELETE'])
@jwt_authenticated
def delete_co_dept_head(request, user_id):
    try:
        if request.user.role != 'admin' or request.user.sub_role != 'admin':
            return Response({'success': False, 'error': 'Unauthorized'}, status=403)
        
        dept_head = Admin.objects(user=request.user).first()
        if not dept_head:
            return Response({'success': False, 'error': 'Admin profile not found'}, status=404)
        
        co_dept = User.objects(id=user_id, role='admin', sub_role='co_dept_head').first()
        if not co_dept or co_dept.pending_admin_id != str(request.user.id):
            return Response({'success': False, 'error': 'Co Dept Head not found'}, status=404)
        
        admin_profile = Admin.objects(user=co_dept).first()
        if admin_profile:
            admin_profile.delete()
        
        UserPermission.objects(user_id=user_id).delete()
        
        email = co_dept.email
        username = co_dept.username
        co_dept.delete()
        
        log_activity(
            user=request.user,
            action_type='delete_co_dept_head',
            target_type='user',
            target_id=user_id,
            target_name=username,
            details={'email': email}
        )
        
        return Response({'success': True, 'message': f'Co Dept Head {username} deleted successfully'})
        
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['company'], allowed_sub_roles=['company_manager'])
def get_approved_hiring_managers(request):
    try:
        company = Company.objects(user=request.user).first()
        if not company:
            return Response({'success': False, 'error': 'Company not found'}, status=404)
        
        hiring_managers = User.objects(
            role='company',
            sub_role='hiring_manager',
            status=True,
            pending_company_id=str(company.id)
        )
        
        result = []
        for hm in hiring_managers:
            permissions = get_user_permissions(hm)
            result.append({
                'id': str(hm.id),
                'username': hm.username,
                'email': hm.email,
                'status': hm.status,
                'created_at': hm.created_at.strftime('%d/%m/%Y'),
                'permissions': {
                    'can_manage_applications': permissions.can_manage_applications if permissions else True,
                    'can_manage_hiring_managers': permissions.can_manage_hiring_managers if permissions else False,
                    'can_create_offer': permissions.can_create_offer if permissions else True,
                    'can_modify_offer': permissions.can_modify_offer if permissions else True,
                    'can_delete_offer': permissions.can_delete_offer if permissions else True,
                    'can_manage_company_profile': permissions.can_manage_company_profile if permissions else False,
                }
            })
        
        return Response({'success': True, 'hiring_managers': result})
        
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['admin'], allowed_sub_roles=['admin'])
def get_approved_co_dept_heads(request):
    try:
        dept_head = Admin.objects(user=request.user).first()
        if not dept_head:
            return Response({'success': False, 'error': 'Admin profile not found'}, status=404)
        
        co_dept_heads = User.objects(
            role='admin',
            sub_role='co_dept_head',
            status=True,
            pending_admin_id=str(request.user.id)
        )
        
        if co_dept_heads.count() == 0:
            all_co_depts = User.objects(
                role='admin',
                sub_role='co_dept_head',
                status=True
            )
            temp_list = []
            for cd in all_co_depts:
                cd_admin = Admin.objects(user=cd).first()
                if cd_admin and cd_admin.university == dept_head.university:
                    temp_list.append(cd)
            co_dept_heads = temp_list
        
        result = []
        for cd in co_dept_heads:
            permissions = get_user_permissions(cd)
            result.append({
                'id': str(cd.id),
                'username': cd.username,
                'email': cd.email,
                'status': cd.status,
                'created_at': cd.created_at.strftime('%d/%m/%Y'),
                'permissions': {
                    'can_manage_conventions': permissions.can_manage_conventions if permissions else True,
                    'can_add_signature': permissions.can_add_signature if permissions else True,
                    'can_add_stamp': permissions.can_add_stamp if permissions else True,
                    'can_manage_university_profile': permissions.can_manage_university_profile if permissions else False,
                }
            })
        
        return Response({'success': True, 'co_dept_heads': result})
        
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


# ==================== STUDENT MANAGEMENT (ADMIN) ====================

@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['admin'], allowed_sub_roles=['admin', 'co_dept_head'])
def get_university_students(request):
    try:
        admin_profile = Admin.objects(user=request.user).first()
        if not admin_profile:
            return Response({'success': False, 'error': 'Admin profile not found'}, status=404)
        
        university = admin_profile.university
        students = Student.objects(university=university)
        
        search = request.query_params.get('search', '').strip()
        if search:
            students = students.filter(
                __raw__={
                    '$or': [
                        {'full_name': {'$regex': search, '$options': 'i'}},
                        {'major': {'$regex': search, '$options': 'i'}},
                    ]
                }
            )
        
        major = request.query_params.get('major', '').strip()
        if major:
            students = students.filter(major__iexact=major)
        
        wilaya = request.query_params.get('wilaya', '').strip()
        if wilaya:
            students = students.filter(wilaya=wilaya)
        
        skills = request.query_params.get('skills', '').strip()
        if skills:
            skill_list = [s.strip() for s in skills.split(',') if s.strip()]
            students = students.filter(skills__in=skill_list)
        
        is_placed = request.query_params.get('is_placed', '').strip()
        if is_placed == 'true':
            students = students.filter(is_placed=True)
        elif is_placed == 'false':
            students = students.filter(is_placed=False)
        
        total_students = Student.objects(university=university).count()
        placed_students = Student.objects(university=university, is_placed=True).count()
        
        result = []
        for student in students:
            applications_count = Application.objects(student=student).count()
            accepted_applications = Application.objects(student=student, status='accepted_by_company').count()
            created_at = student.user.created_at if student.user else None
            
            result.append({
                'id': str(student.id),
                'full_name': student.full_name,
                'email': student.user.email if student.user else None,
                'wilaya': student.wilaya,
                'skills': student.skills,
                'github': student.github,
                'portfolio': student.portfolio,
                'education_level': student.education_level,
                'university': student.university,
                'major': student.major,
                'graduation_year': student.graduation_year,
                'is_placed': student.is_placed,
                'placed_company_name': student.placed_company.company_name if student.placed_company else None,
                'placement_date': student.placement_date.strftime('%d/%m/%Y') if student.placement_date else None,
                'created_at': created_at.strftime('%d/%m/%Y') if created_at else 'N/A',
                'applications_count': applications_count,
                'accepted_applications': accepted_applications,
                'validated_applications': Application.objects(student=student, status='validated_by_co_dept').count(),
            })
        
        return Response({
            'success': True,
            'students': result,
            'stats': {
                'total': total_students,
                'placed': placed_students,
                'unplaced': total_students - placed_students,
                'filtered': len(result)
            },
            'university': university
        })
        
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['admin'], allowed_sub_roles=['admin', 'co_dept_head'])
def get_student_details(request, student_id):
    try:
        admin_profile = Admin.objects(user=request.user).first()
        if not admin_profile:
            return Response({'success': False, 'error': 'Admin profile not found'}, status=404)
        
        student = Student.objects(id=student_id).first()
        if not student:
            return Response({'success': False, 'error': 'Student not found'}, status=404)
        
        if student.university != admin_profile.university:
            return Response({'success': False, 'error': 'Unauthorized'}, status=403)
        
        applications = Application.objects(student=student).order_by('-applied_at')
        
        applications_list = []
        for app in applications:
            applications_list.append({
                'id': str(app.id),
                'offer_title': app.offer.title if app.offer else None,
                'company_name': app.offer.company.company_name if app.offer and app.offer.company else None,
                'status': app.status,
                'applied_at': app.applied_at.strftime('%d/%m/%Y'),
                'company_response_date': app.company_response_date.strftime('%d/%m/%Y') if app.company_response_date else None,
            })
        
        return Response({
            'success': True,
            'student': {
                'id': str(student.id),
                'full_name': student.full_name,
                'email': student.user.email if student.user else None,
                'wilaya': student.wilaya,
                'skills': student.skills,
                'github': student.github,
                'portfolio': student.portfolio,
                'education_level': student.education_level,
                'university': student.university,
                'major': student.major,
                'graduation_year': student.graduation_year,
                'is_placed': student.is_placed,
                'placed_company_name': student.placed_company.company_name if student.placed_company else None,
                'placement_date': student.placement_date.strftime('%d/%m/%Y') if student.placement_date else None,
                'created_at': student.user.created_at.strftime('%d/%m/%Y') if student.user else 'N/A',
            },
            'applications': applications_list
        })
        
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['admin'], allowed_sub_roles=['admin', 'co_dept_head'])
def get_university_stats(request):
    try:
        admin_profile = Admin.objects(user=request.user).first()
        if not admin_profile:
            return Response({'success': False, 'error': 'Admin profile not found'}, status=404)
        
        university = admin_profile.university
        
        total_students = Student.objects(university=university).count()
        placed_students = Student.objects(university=university, is_placed=True).count()
        
        majors = Student.objects(university=university).distinct('major')
        major_stats = []
        for major in majors:
            if major:
                count = Student.objects(university=university, major=major).count()
                placed = Student.objects(university=university, major=major, is_placed=True).count()
                major_stats.append({
                    'name': major,
                    'total': count,
                    'placed': placed,
                    'placement_rate': round((placed / count * 100) if count > 0 else 0, 1)
                })
        
        years = Student.objects(university=university).distinct('graduation_year')
        year_stats = []
        for year in years:
            if year:
                count = Student.objects(university=university, graduation_year=year).count()
                placed = Student.objects(university=university, graduation_year=year, is_placed=True).count()
                year_stats.append({
                    'year': year,
                    'total': count,
                    'placed': placed,
                    'placement_rate': round((placed / count * 100) if count > 0 else 0, 1)
                })
        
        all_skills = []
        for student in Student.objects(university=university):
            all_skills.extend(student.skills)
        from collections import Counter
        top_skills = Counter(all_skills).most_common(10)
        top_skills_list = [{'skill': skill, 'count': count} for skill, count in top_skills]
        
        return Response({
            'success': True,
            'stats': {
                'total_students': total_students,
                'placed_students': placed_students,
                'unplaced_students': total_students - placed_students,
                'placement_rate': round((placed_students / total_students * 100) if total_students > 0 else 0, 1),
                'by_major': major_stats,
                'by_graduation_year': year_stats,
                'top_skills': top_skills_list
            }
        })
        
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['admin'], allowed_sub_roles=['admin', 'co_dept_head'])
def get_placement_statistics(request):
    try:
        admin_profile = Admin.objects(user=request.user).first()
        if not admin_profile:
            return Response({'success': False, 'error': 'Admin profile not found'}, status=404)
        
        university = admin_profile.university
        
        total_students = Student.objects(university=university).count()
        placed_students = Student.objects(university=university, is_placed=True).count()
        unplaced_students = total_students - placed_students
        placement_rate = round((placed_students / total_students * 100), 1) if total_students > 0 else 0
        
        majors = Student.objects(university=university).distinct('major')
        major_stats = []
        for major in majors:
            if major:
                students_in_major = Student.objects(university=university, major=major)
                total = students_in_major.count()
                placed = students_in_major.filter(is_placed=True).count()
                major_stats.append({
                    'name': major,
                    'total': total,
                    'placed': placed,
                    'unplaced': total - placed,
                    'placement_rate': round((placed / total * 100), 1) if total > 0 else 0
                })
        
        years = Student.objects(university=university).distinct('graduation_year')
        year_stats = []
        for year in years:
            if year:
                students_in_year = Student.objects(university=university, graduation_year=year)
                total = students_in_year.count()
                placed = students_in_year.filter(is_placed=True).count()
                year_stats.append({
                    'year': year,
                    'total': total,
                    'placed': placed,
                    'unplaced': total - placed,
                    'placement_rate': round((placed / total * 100), 1) if total > 0 else 0
                })
        
        placed_skills = []
        unplaced_skills = []
        
        for student in Student.objects(university=university, is_placed=True):
            placed_skills.extend(student.skills)
        
        for student in Student.objects(university=university, is_placed=False):
            unplaced_skills.extend(student.skills)
        
        from collections import Counter
        top_placed_skills = Counter(placed_skills).most_common(10)
        top_unplaced_skills = Counter(unplaced_skills).most_common(10)
        
        return Response({
            'success': True,
            'stats': {
                'global': {
                    'total_students': total_students,
                    'placed_students': placed_students,
                    'unplaced_students': unplaced_students,
                    'placement_rate': placement_rate
                },
                'by_major': major_stats,
                'by_graduation_year': year_stats,
                'top_skills': {
                    'placed': [{'skill': s, 'count': c} for s, c in top_placed_skills],
                    'unplaced': [{'skill': s, 'count': c} for s, c in top_unplaced_skills]
                }
            }
        })
        
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


# ==================== SIGNATURES / STAMP ====================

@api_view(['POST'])
@jwt_authenticated
@role_required(allowed_roles=['company'])
def add_company_signature(request, application_id):
    try:
        application = Application.objects(id=application_id).first()
        if not application:
            return Response({'success': False, 'error': 'Application not found'}, status=404)
        
        company = _get_user_company(request.user)
        if not company or str(application.offer.company.id) != str(company.id):
            return Response({'success': False, 'error': 'Unauthorized'}, status=403)
        
        if application.status != 'validated_by_co_dept':
            return Response({'success': False, 'error': 'Convention not validated yet'}, status=400)
        
        signature_data = request.data.get('signature', '')
        if not signature_data:
            return Response({'success': False, 'error': 'Signature data required'}, status=400)
        
        application.company_signature = signature_data
        application.company_signature_date = datetime.now()
        application.company_signed_by = request.user.username
        application.signature_status = 'company_signed'
        application.save()
        
        log_activity(
            user=request.user,
            action_type='add_signature',
            target_type='convention',
            target_id=str(application.id),
            target_name=f"{application.student.full_name} - {application.offer.title}",
            details={'signature_type': 'company', 'signed_by': request.user.username}
        )
        
        return Response({
            'success': True,
            'message': 'Company signature added successfully',
            'signed_by': request.user.username,
            'signature_status': application.signature_status
        })
        
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['POST'])
@jwt_authenticated
@role_required(allowed_roles=['student'])
def add_student_signature(request, application_id):
    try:
        application = Application.objects(id=application_id).first()
        if not application:
            return Response({'success': False, 'error': 'Application not found'}, status=404)
        
        student = Student.objects(user=request.user).first()
        if not student or str(application.student.id) != str(student.id):
            return Response({'success': False, 'error': 'Unauthorized'}, status=403)
        
        if application.status != 'validated_by_co_dept':
            return Response({'success': False, 'error': 'Convention not validated yet'}, status=400)
        
        signature_data = request.data.get('signature', '')
        if not signature_data:
            return Response({'success': False, 'error': 'Signature data required'}, status=400)
        
        application.student_signature = signature_data
        application.student_signature_date = datetime.now()
        application.student_signed_by = student.full_name
        application.signature_status = 'student_signed'
        application.save()
        
        log_activity(
            user=request.user,
            action_type='add_signature',
            target_type='convention',
            target_id=str(application.id),
            target_name=f"{application.student.full_name} - {application.offer.title}",
            details={'signature_type': 'student', 'signed_by': student.full_name}
        )
        
        return Response({
            'success': True,
            'message': 'Student signature added successfully',
            'signed_by': student.full_name,
            'signature_status': application.signature_status
        })
        
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
@jwt_authenticated
def get_signature_status(request, application_id):
    try:
        application = Application.objects(id=application_id).first()
        if not application:
            return Response({'success': False, 'error': 'Application not found'}, status=404)
        
        user = request.user
        is_authorized = False
        
        if user.role == 'student':
            student = Student.objects(user=user).first()
            if student and str(application.student.id) == str(student.id):
                is_authorized = True
        elif user.role == 'company':
            company = _get_user_company(user)
            if company and str(application.offer.company.id) == str(company.id):
                is_authorized = True
        elif user.role == 'admin':
            admin = Admin.objects(user=user).first()
            if admin and application.student.university == admin.university:
                is_authorized = True
        
        if not is_authorized:
            return Response({'success': False, 'error': 'Unauthorized'}, status=403)
        
        return Response({
            'success': True,
            'signature_status': application.signature_status,
            'university_signed': bool(application.university_signature),
            'university_signed_by': application.university_signed_by,
            'university_signature_date': application.university_signature_date.strftime('%d/%m/%Y %H:%M') if application.university_signature_date else None,
            'company_signed': bool(application.company_signature),
            'company_signed_by': application.company_signed_by,
            'company_signature_date': application.company_signature_date.strftime('%d/%m/%Y %H:%M') if application.company_signature_date else None,
            'student_signed': bool(application.student_signature),
            'student_signed_by': application.student_signed_by,
            'student_signature_date': application.student_signature_date.strftime('%d/%m/%Y %H:%M') if application.student_signature_date else None,
        })
        
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['admin'], allowed_sub_roles=['admin'])
def dept_head_validated_validations(request):
    try:
        dept_head = Admin.objects(user=request.user).first()
        if not dept_head:
            return Response({'success': False, 'error': 'Profil Department Head non trouvé'}, status=404)
        
        students = Student.objects(university=dept_head.university)
        student_ids = [str(s.id) for s in students]
        
        applications = Application.objects(
            student__in=student_ids,
            status='validated_by_co_dept'
        ).order_by('-co_dept_validation_date')
        
        result = []
        for app in applications:
            student = app.student
            offer = app.offer
            company = offer.company if offer else None
            
            result.append({
                'id': str(app.id),
                'status': app.status,
                'applied_at': app.applied_at.strftime('%Y-%m-%d %H:%M') if app.applied_at else None,
                'company_response_date': app.company_response_date.strftime('%Y-%m-%d %H:%M') if app.company_response_date else None,
                'co_dept_validation_date': app.co_dept_validation_date.strftime('%Y-%m-%d %H:%M') if app.co_dept_validation_date else None,
                'cover_letter': app.cover_letter,
                'cv_file_url': f'/api/dept-head/application/{str(app.id)}/cv/' if app.cv_file else None,
                'convention_url': f'/api/co-dept/download-convention/{str(app.id)}/',
                'student': {
                    'id': str(student.id),
                    'full_name': student.full_name,
                    'email': student.user.email if student.user else None,
                    'wilaya': student.wilaya,
                    'skills': student.skills,
                    'github': student.github,
                    'portfolio': student.portfolio,
                    'education_level': student.education_level,
                    'university': student.university,
                    'major': student.major,
                    'graduation_year': student.graduation_year,
                },
                'offer': {
                    'id': str(offer.id),
                    'title': offer.title,
                    'description': offer.description,
                    'wilaya': offer.wilaya,
                    'internship_type': offer.internship_type,
                    'required_skills': offer.required_skills,
                    'duration': offer.duration,
                    'start_date': offer.start_date.strftime('%Y-%m-%d') if offer.start_date else None,
                },
                'company': {
                    'id': str(company.id) if company else None,
                    'company_name': company.company_name if company else None,
                    'description': company.description if company else None,
                    'location': company.location if company else None,
                    'industry': company.industry if company else None,
                    'email': company.user.email if company and company.user else None,
                }
            })
        
        return Response({'success': True, 'count': len(result), 'applications': result})
        
    except Exception as e:
        print(f" Erreur: {str(e)}")
        traceback.print_exc()
        return Response({'success': False, 'error': str(e)}, status=500)
    
@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['admin'], allowed_sub_roles=['co_dept_head'])
def co_dept_validated_validations(request):
    """Récupère les conventions déjà validées par le Co Department Head"""
    try:
        co_dept = Admin.objects(user=request.user).first()
        if not co_dept:
            return Response({'success': False, 'error': 'Profil Co Department Head non trouvé'}, status=404)
        
        students = Student.objects(university=co_dept.university)
        student_ids = [str(s.id) for s in students]
        
        applications = Application.objects(
            student__in=student_ids,
            status='validated_by_co_dept'
        ).order_by('-co_dept_validation_date')
        
        result = []
        for app in applications:
            result.append({
                'id': str(app.id),
                'status': app.status,
                'applied_at': app.applied_at.strftime('%Y-%m-%d %H:%M') if app.applied_at else None,
                'student': {
                    'full_name': app.student.full_name,
                    'email': app.student.user.email if app.student.user else None,
                },
                'offer': {
                    'title': app.offer.title,
                },
                'company': {
                    'company_name': app.offer.company.company_name if app.offer.company else None,
                }
            })
        
        return Response({'success': True, 'applications': result})
        
    except Exception as e:
        print(f"❌ Erreur: {str(e)}")
        return Response({'success': False, 'error': str(e)}, status=500)    


@api_view(['POST'])
@jwt_authenticated
@role_required(allowed_roles=['admin'], allowed_sub_roles=['admin', 'co_dept_head'])
def add_university_stamp(request, application_id):
    try:
        if not check_permission(request.user, 'can_add_stamp'):
            return Response({
                'success': False, 
                'error': "Vous n'avez pas la permission d'ajouter le cachet. Veuillez contacter le Department Head pour obtenir les droits nécessaires."
            }, status=status.HTTP_403_FORBIDDEN)
        
        application = Application.objects(id=application_id).first()
        if not application:
            return Response({'success': False, 'error': 'Application not found'}, status=404)
        
        admin_profile = Admin.objects(user=request.user).first()
        if not admin_profile:
            return Response({'success': False, 'error': 'Admin profile not found'}, status=404)
        
        if application.student.university != admin_profile.university:
            return Response({'success': False, 'error': 'Unauthorized'}, status=403)
        
        if application.status != 'validated_by_co_dept':
            return Response({'success': False, 'error': 'Convention not validated yet'}, status=400)
        
        stamp_data = request.data.get('stamp', '')
        if not stamp_data:
            return Response({'success': False, 'error': 'Stamp data required'}, status=400)
        
        application.university_stamp = stamp_data
        application.university_stamp_date = datetime.now()
        application.stamp_status = 'stamped'
        
        new_pdf = generate_internship_agreement_pdf(application, admin_profile)
        application.convention_pdf = new_pdf
        
        application.save()
        
        log_activity(
            user=request.user,
            action_type='add_stamp',
            target_type='convention',
            target_id=str(application.id),
            target_name=f"{application.student.full_name} - {application.offer.title}",
            details={'stamp_type': 'university', 'added_by': admin_profile.full_name}
        )
        
        return Response({
            'success': True,
            'message': 'University stamp added successfully',
            'added_by': admin_profile.full_name,
            'stamp_status': application.stamp_status
        })
        
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
@jwt_authenticated
def get_stamp_status(request, application_id):
    try:
        application = Application.objects(id=application_id).first()
        if not application:
            return Response({'success': False, 'error': 'Application not found'}, status=404)
        
        user = request.user
        is_authorized = False
        
        if user.role == 'student':
            student = Student.objects(user=user).first()
            if student and str(application.student.id) == str(student.id):
                is_authorized = True
        elif user.role == 'company':
            company = _get_user_company(user)
            if company and str(application.offer.company.id) == str(company.id):
                is_authorized = True
        elif user.role == 'admin':
            admin = Admin.objects(user=user).first()
            if admin and application.student.university == admin.university:
                is_authorized = True
        
        if not is_authorized:
            return Response({'success': False, 'error': 'Unauthorized'}, status=403)
        
        return Response({
            'success': True,
            'has_stamp': bool(application.university_stamp),
            'stamp_added_by': application.stamp_added_by,
            'stamp_date': application.university_stamp_date.strftime('%d/%m/%Y %H:%M') if application.university_stamp_date else None,
        })
        
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['admin'], allowed_sub_roles=['admin', 'co_dept_head'])
def get_university_users_status(request):
    try:
        admin_profile = Admin.objects(user=request.user).first()
        if not admin_profile:
            return Response({'success': False, 'error': 'Admin profile not found'}, status=404)
        
        university = admin_profile.university
        
        admins = Admin.objects(university=university)
        
        users_list = []
        for admin in admins:
            if admin.user:
                is_online = admin.user.is_online()
                last_activity_str = "En ligne" if is_online else "Hors ligne"
                if admin.user.last_activity and not is_online:
                    last_activity_str = f"Dernière activité: {admin.user.last_activity.strftime('%H:%M')}"
                
                users_list.append({
                    'id': str(admin.user.id),
                    'username': admin.user.username,
                    'email': admin.user.email,
                    'full_name': admin.full_name,
                    'role': admin.user.role,
                    'sub_role': admin.user.sub_role,
                    'is_online': is_online,
                    'last_activity': admin.user.last_activity.strftime('%Y-%m-%d %H:%M:%S') if admin.user.last_activity else None,
                    'status_text': last_activity_str,
                    'avatar': admin.full_name[0].upper() if admin.full_name else admin.user.username[0].upper()
                })
        
        return Response({
            'success': True,
            'university': university,
            'users': users_list,
            'online_count': sum(1 for u in users_list if u['is_online']),
            'total_count': len(users_list)
        })
        
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


# ==================== MISC ====================

@api_view(['GET'])
@jwt_authenticated
def get_current_user(request):
    """Return the current authenticated user's personal info, including bio, phone, and avatar"""
    try:
        user = request.user
        user_data = {
            'id': str(user.id),
            'username': user.username,
            'email': user.email,
            'role': user.role,
            'sub_role': user.sub_role,
            'status': user.status,
            'bio': getattr(user, 'bio', ''),
            'phone': getattr(user, 'phone', ''),
            'created_at': user.created_at.strftime('%d/%m/%Y') if user.created_at else None,
        }

        # Profile picture URL (user avatar)
        profile_picture_url = None
        if user.profile_picture:
            profile_picture_url = f"/api/my-profile/user/avatar/{user.profile_picture}/"
        user_data['profile_picture_url'] = profile_picture_url

        # Permissions
        permissions = get_user_permissions(user)
        if permissions:
            user_data['permissions'] = {
                'can_manage_conventions': permissions.can_manage_conventions,
                'can_add_signature': permissions.can_add_signature,
                'can_add_stamp': permissions.can_add_stamp if hasattr(permissions, 'can_add_stamp') else True,
                'can_manage_university_profile': permissions.can_manage_university_profile,
            }

        # Role-specific extra
        if user.role == 'student':
            student = Student.objects(user=user).first()
            if student:
                user_data['full_name'] = student.full_name
                user_data['university'] = student.university
        elif user.role == 'company':
            company = _get_user_company(user)
            if company:
                user_data['company_name'] = company.company_name
        elif user.role == 'admin':
            admin = Admin.objects(user=user).first()
            if admin:
                user_data['full_name'] = admin.full_name
                user_data['university'] = admin.university

        return Response({'success': True, 'user': user_data})

    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


# ==================== YOUR UNIVERSITY / COMPANY PROFILE ENDPOINTS ====================

@api_view(['GET', 'POST'])
@jwt_authenticated
def university_profile(request):
    try:
        user = request.user

        if user.role != 'admin':
            return Response({'success': False, 'error': 'Accès non autorisé'}, status=403)

        from .models import Admin as AdminProfile, UniversityProfile

        try:
            admin_profile = AdminProfile.objects.get(user=user)
            university = admin_profile.university
        except AdminProfile.DoesNotExist:
            return Response({'success': False, 'error': 'Profil admin introuvable'}, status=404)

        try:
            profile = UniversityProfile.objects.get(university=university)
        except UniversityProfile.DoesNotExist:
            profile = UniversityProfile(university=university)
            profile.save()

        if request.method == 'GET':
            return Response({
                'success': True,
                'profile': {
                    'university': profile.university,
                    'name': profile.name,
                    'description': profile.description,
                    'email': profile.email,
                    'phone': profile.phone,
                    'address': profile.address,
                    'wilaya': profile.wilaya,
                    'website': profile.website,
                    'linkedin': profile.linkedin,
                    'logo': profile.logo,
                    'cover_picture': profile.cover_picture,
                    'faculties': profile.faculties,
                    'updated_at': profile.updated_at.strftime('%d/%m/%Y') if profile.updated_at else '',
                }
            })

        if user.sub_role == 'co_dept_head':
            if user.permissions:
                perm = user.permissions
                if not perm.can_manage_university_profile:
                    return Response({
                        'success': False,
                        'error': "Vous n'avez pas la permission de modifier le profil université."
                    }, status=403)
            else:
                return Response({
                    'success': False,
                    'error': "Vous n'avez pas la permission de modifier le profil université."
                }, status=403)

        data = request.data

        profile.name = data.get('name', profile.name)
        profile.description = data.get('description', profile.description)
        profile.email = data.get('email', profile.email)
        profile.phone = data.get('phone', profile.phone)
        profile.address = data.get('address', profile.address)
        profile.wilaya = data.get('wilaya', profile.wilaya)
        profile.website = data.get('website', profile.website)
        profile.linkedin = data.get('linkedin', profile.linkedin)
        profile.faculties = data.get('faculties', profile.faculties)

        if data.get('logo'):
            profile.logo = data['logo']
        if data.get('cover_picture'):
            profile.cover_picture = data['cover_picture']

        from datetime import datetime
        profile.updated_at = datetime.now()
        profile.save()

        try:
            ActivityLog(
                user_id=str(user.id),
                user_email=user.email,
                user_role=user.role,
                user_sub_role=user.sub_role,
                action_type='update_permissions',
                target_type='user',
                target_id=str(profile.id),
                target_name=f"University Profile: {university}",
                details={'action': 'university_profile_updated'},
                status='success',
                ip_address=request.META.get('REMOTE_ADDR', '')
            ).save()
        except Exception:
            pass

        return Response({'success': True, 'message': 'Profil université mis à jour avec succès'})

    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


# api/views.py - تحديث دالة get_company_profile

@api_view(['GET', 'POST'])
@jwt_authenticated
@role_required(allowed_roles=['company'])
def get_company_profile(request):
    try:
        user = request.user
        company = _get_user_company(user)
        if not company:
            return Response({'success': False, 'error': 'Company not found'}, status=404)

        company_id = str(company.id)

        # ✅ التأكد من وجود CompanyProfile
        try:
            profile = CompanyProfile.objects.get(company_id=company_id)
        except CompanyProfile.DoesNotExist:
            # إنشاء CompanyProfile جديد إذا لم يكن موجوداً
            profile = CompanyProfile(
                company_id=company_id,
                name=company.company_name or '',
                description=getattr(company, 'description', '') or '',
                location=getattr(company, 'location', '') or '',
                website=getattr(company, 'website', '') or '',
                industry=getattr(company, 'industry', '') or '',
                phone=getattr(company, 'phone', '') or '',
                contact_email=getattr(company, 'contact_email', '') or '',
                linkedin=getattr(company, 'linkedin', '') or '',
                twitter=getattr(company, 'twitter', '') or '',
                logo=company.logo or '',
                cover_picture=getattr(company, 'cover_picture', '') or '',
            )
            profile.save()
            print(f"✅ Created new CompanyProfile for company: {company.company_name}")

        if request.method == 'GET':
            # 🔥 التحقق من صلاحية التعديل
            can_edit = False
            if user.sub_role == 'company_manager':
                can_edit = True
            elif user.sub_role == 'hiring_manager':
                perms = get_user_permissions(user)
                can_edit = perms.can_manage_company_profile if perms else False

            return Response({
                'success': True,
                'profile': {
                    'company_id': profile.company_id,
                    'name': profile.name,
                    'description': profile.description,
                    'phone': profile.phone,
                    'contact_email': profile.contact_email,
                    'location': profile.location,
                    'website': profile.website,
                    'linkedin': profile.linkedin,
                    'twitter': profile.twitter,
                    'industry': profile.industry,
                    'logo': profile.logo,
                    'cover_picture': profile.cover_picture,
                    'updated_at': profile.updated_at.strftime('%d/%m/%Y') if profile.updated_at else '',
                    'can_edit': can_edit,
                }
            })

        # POST method - تحديث الملف الشخصي
        # 🔥 التحقق من صلاحية التعديل
        if user.sub_role == 'company_manager':
            pass  # Company Manager can edit
        elif user.sub_role == 'hiring_manager':
            perms = get_user_permissions(user)
            if not (perms and perms.can_manage_company_profile):
                return Response({
                    'success': False,
                    'error': "Vous n'avez pas la permission de modifier le profil entreprise."
                }, status=403)
        else:
            return Response({'success': False, 'error': 'Unauthorized'}, status=403)

        data = request.data

        # تحديث الحقول
        if 'name' in data:
            profile.name = data['name']
        if 'description' in data:
            profile.description = data['description']
        if 'phone' in data:
            profile.phone = data['phone']
        if 'contact_email' in data:
            profile.contact_email = data['contact_email']
        if 'location' in data:
            profile.location = data['location']
        if 'website' in data:
            profile.website = data['website']
        if 'linkedin' in data:
            profile.linkedin = data['linkedin']
        if 'twitter' in data:
            profile.twitter = data['twitter']
        if 'industry' in data:
            profile.industry = data['industry']
        if 'logo' in data and data['logo']:
            profile.logo = data['logo']
        if 'cover_picture' in data and data['cover_picture']:
            profile.cover_picture = data['cover_picture']

        from datetime import datetime as dt
        profile.updated_at = dt.now()
        profile.save()

        return Response({'success': True, 'message': 'Company profile updated successfully'})

    except Exception as e:
        print(f"❌ Error in get_company_profile: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({'success': False, 'error': str(e)}, status=500)

@api_view(['PUT'])
@jwt_authenticated
@role_required(allowed_roles=['company'])
def update_company_profile(request):
    request.method = 'POST'
    return get_company_profile(request)


# ==================== FRIEND'S MY PROFILE ENDPOINTS (RENAMED) ====================

@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['company'])
def get_my_company_info(request):
    """Personal company info for the logged-in user (friend's original get_company_profile)"""
    try:
        company = _get_user_company(request.user)
        if not company:
            return Response({'success': False, 'error': 'Company not found'}, status=404)

        visibility = getattr(company, 'profile_visibility', {
            'email_visible': True,
            'phone_visible': True,
            'location_visible': True,
            'website_visible': True,
            'industry_visible': True,
            'description_visible': True,
            'profile_public': True
        })

        logo_url = None
        if company.logo:
            try:
                logo_url = f"/api/my-profile/company/logo/{company.logo}/"
            except:
                logo_url = None

        created_at = company.user.created_at if company.user else None
        date_joined = created_at.strftime('%d/%m/%Y') if created_at else None

        return Response({
            'success': True,
            'company': {
                'id': str(company.id),
                'company_name': company.company_name,
                'description': company.description,
                'location': company.location,
                'website': company.website,
                'industry': company.industry,
                'phone': getattr(company, 'phone', ''),
                'logo_url': logo_url,
                'verified': company.verified,
                'created_at': date_joined,
            },
            'visibility': visibility
        })
    except Exception as e:
        print(f"Erreur get_my_company_info: {str(e)}")
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['PUT'])
@jwt_authenticated
@role_required(allowed_roles=['company'])
def update_my_company_info(request):
    """Update personal company info (friend's original update_company_profile)"""
    try:
        company = _get_user_company(request.user)
        if not company:
            return Response({'success': False, 'error': 'Company not found'}, status=404)

        data = request.data
        updatable_fields = ['company_name', 'description', 'location', 'website', 'industry', 'phone']
        modified = False
        for field in updatable_fields:
            if field in data and data[field] is not None:
                current_value = getattr(company, field, None)
                new_value = data[field]
                if current_value != new_value:
                    setattr(company, field, new_value)
                    modified = True

        if 'visibility' in data:
            company.profile_visibility = data['visibility']
            modified = True

        if modified:
            company.save()

        return Response({'success': True, 'message': 'Profile updated successfully'})
    except Exception as e:
        print(f"Erreur update_my_company_info: {str(e)}")
        traceback.print_exc()
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['POST'])
@jwt_authenticated
@role_required(allowed_roles=['company'])
@parser_classes([MultiPartParser, FormParser])
def upload_my_company_logo(request):
    """Upload company logo (friend's original upload_company_logo)"""
    try:
        from gridfs import GridFS
        from mongoengine.connection import get_db
        from bson import ObjectId
        from datetime import datetime

        company = _get_user_company(request.user)
        if not company:
            return Response({'success': False, 'error': 'Company not found'}, status=404)

        if 'logo' not in request.FILES:
            return Response({'success': False, 'error': 'No file provided'}, status=400)

        file = request.FILES['logo']
        if file.size > 5 * 1024 * 1024:
            return Response({'success': False, 'error': 'File too large (max 5MB)'}, status=400)
        allowed_types = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif']
        if file.content_type not in allowed_types:
            return Response({'success': False, 'error': 'Invalid file type. Use JPEG, PNG or GIF'}, status=400)

        db = get_db()
        fs = GridFS(db)

        if company.logo:
            try:
                old_id = ObjectId(company.logo)
                fs.delete(old_id)
            except:
                pass

        file_content = file.read()
        file_id = fs.put(
            file_content,
            filename=file.name,
            content_type=file.content_type,
            metadata={
                'user_id': str(request.user.id),
                'uploaded_at': datetime.now().isoformat(),
                'type': 'company_logo'
            }
        )

        company.logo = str(file_id)
        company.save()

        image_url = f"/api/my-profile/company/logo/{file_id}/"
        return Response({
            'success': True,
            'message': 'Logo uploaded successfully',
            'url': image_url
        })
    except Exception as e:
        print(f"Erreur upload_my_company_logo: {str(e)}")
        traceback.print_exc()
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
def serve_my_company_logo(request, file_id):
    """Serves company logo from GridFS"""
    try:
        from gridfs import GridFS
        from mongoengine.connection import get_db
        from bson import ObjectId

        db = get_db()
        fs = GridFS(db)
        file_obj = fs.get(ObjectId(file_id))
        response = HttpResponse(file_obj.read(), content_type=file_obj.content_type)
        response['Content-Disposition'] = f'inline; filename="{file_obj.filename}"'
        return response
    except Exception as e:
        print(f"Erreur serve_my_company_logo: {e}")
        return HttpResponse(status=404)




@api_view(['GET'])
@jwt_authenticated
def get_company_manager_info(request):
    """Return company manager for a given company name (friend's original get_company_manager)"""
    company_name = request.query_params.get('company', '')
    if not company_name:
        return Response({'success': False, 'error': 'Company name required'}, status=400)

    try:
        company = Company.objects(company_name=company_name).first()
        if not company:
            return Response({'success': False, 'error': 'Company not found'}, status=404)

        manager_user = User.objects(
            role='company',
            sub_role='company_manager',
            status=True
        ).first()
        if manager_user:
            manager_company = Company.objects(user=manager_user).first()
            if manager_company and manager_company.company_name == company_name:
                return Response({
                    'success': True,
                    'manager': {
                        'id': str(manager_user.id),
                        'username': manager_user.username,
                        'email': manager_user.email,
                        'full_name': manager_user.username,
                        'is_online': manager_user.is_online()
                    }
                })
        return Response({'success': False, 'error': 'Company manager not found'}, status=404)
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


# ==================== USER PERSONAL PROFILE ENDPOINTS (NEW) ====================

@api_view(['PUT'])
@jwt_authenticated
def update_my_user_info(request):
    """Update personal user info (bio, phone)"""
    try:
        user = request.user
        data = request.data

        if 'bio' in data:
            user.bio = data['bio']
        if 'phone' in data:
            user.phone = data['phone']

        user.save()
        return Response({'success': True, 'message': 'Profile updated successfully'})
    except Exception as e:
        print(f"Erreur update_my_user_info: {str(e)}")
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['POST'])
@jwt_authenticated
@role_required(allowed_roles=['company', 'student', 'admin'])
@parser_classes([MultiPartParser, FormParser])
def upload_user_avatar(request):
    """Upload user profile picture"""
    try:
        from gridfs import GridFS
        from mongoengine.connection import get_db
        from bson import ObjectId
        from datetime import datetime

        user = request.user

        if 'avatar' not in request.FILES:
            return Response({'success': False, 'error': 'No file provided'}, status=400)

        file = request.FILES['avatar']

        if file.size > 5 * 1024 * 1024:
            return Response({'success': False, 'error': 'File too large (max 5MB)'}, status=400)
        allowed_types = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif']
        if file.content_type not in allowed_types:
            return Response({'success': False, 'error': 'Invalid file type. Use JPEG, PNG or GIF'}, status=400)

        db = get_db()
        fs = GridFS(db)

        if user.profile_picture:
            try:
                old_id = ObjectId(user.profile_picture)
                fs.delete(old_id)
            except:
                pass

        file_content = file.read()
        file_id = fs.put(
            file_content,
            filename=file.name,
            content_type=file.content_type,
            metadata={
                'user_id': str(user.id),
                'uploaded_at': datetime.now().isoformat(),
                'type': 'user_avatar'
            }
        )

        user.profile_picture = str(file_id)
        user.save()

        image_url = f"/api/my-profile/user/avatar/{file_id}/"
        return Response({
            'success': True,
            'message': 'Avatar uploaded successfully',
            'url': image_url
        })
    except Exception as e:
        print(f"Erreur upload_user_avatar: {str(e)}")
        traceback.print_exc()
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
def serve_user_avatar(request, file_id):
    """Serve user avatar from GridFS"""
    try:
        from gridfs import GridFS
        from mongoengine.connection import get_db
        from bson import ObjectId

        db = get_db()
        fs = GridFS(db)
        file_obj = fs.get(ObjectId(file_id))
        response = HttpResponse(file_obj.read(), content_type=file_obj.content_type)
        response['Content-Disposition'] = f'inline; filename="{file_obj.filename}"'
        return response
    except Exception as e:
        print(f"Erreur serve_user_avatar: {e}")
        return HttpResponse(status=404)


# ==================== FRIEND'S STUDENT PROFILE / CV / 2FA / CHAT ====================

@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['student'])
def get_student_public_profile(request, student_id=None):
    """Récupère le profil public d'un étudiant (visible par tous)"""
    try:
        if student_id:
            student = Student.objects(id=student_id).first()
        else:
            student = Student.objects(user=request.user).first()

        if not student:
            return Response({'success': False, 'error': 'Student not found'}, status=404)

        is_owner = str(request.user.id) == str(student.user.id)
        visibility = getattr(student, 'profile_visibility', {})

        profile_picture_url = None
        cover_image_url = None

        if student.profile_picture:
            try:
                profile_picture_url = f"/media/{student.profile_picture.name}"
            except:
                profile_picture_url = None

        if student.cover_image:
            try:
                cover_image_url = f"/media/{student.cover_image.name}"
            except:
                cover_image_url = None

        response_data = {
            'success': True,
            'profile': {
                'id': str(student.id),
                'user_id': str(student.user.id),
                'full_name': student.full_name,
                'email': student.user.email,
                'username': student.user.username,
                'wilaya': student.wilaya,
                'university': student.university,
                'major': student.major,
                'education_level': student.education_level,
                'graduation_year': student.graduation_year,
                'skills': student.skills,
                'github': student.github,
                'portfolio': student.portfolio,
                'bio': getattr(student, 'bio', ''),
                'phone': getattr(student, 'phone', ''),
                'profile_picture': profile_picture_url,
                'cover_image': cover_image_url,
                'date_joined': student.user.created_at.strftime('%d/%m/%Y'),
                'is_placed': student.is_placed,
                'placed_company_name': student.placed_company.company_name if student.placed_company else None,
                'placement_date': student.placement_date.strftime('%d/%m/%Y') if student.placement_date else None,
                'applications_count': Application.objects(student=student).count(),
                'accepted_applications': Application.objects(student=student, status='accepted_by_company').count(),
                'validated_applications': Application.objects(student=student, status='validated_by_co_dept').count(),
            },
            'visibility': visibility,
            'is_owner': is_owner
        }

        if not is_owner:
            if not visibility.get('email_visible', True):
                response_data['profile']['email'] = None
            if not visibility.get('phone_visible', True):
                response_data['profile']['phone'] = None
            if not visibility.get('wilaya_visible', True):
                response_data['profile']['wilaya'] = None
            if not visibility.get('university_visible', True):
                response_data['profile']['university'] = None
            if not visibility.get('skills_visible', True):
                response_data['profile']['skills'] = []
            if not visibility.get('contact_visible', True):
                response_data['profile']['github'] = None
                response_data['profile']['portfolio'] = None
                response_data['profile']['linkedin'] = None

        return Response(response_data)

    except Exception as e:
        print(f"Erreur get_student_public_profile: {str(e)}")
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['student'])
def get_my_profile(request):
    """Récupère le profil complet de l'étudiant connecté"""
    try:
        student = Student.objects(user=request.user).first()
        if not student:
            return Response({'success': False, 'error': 'Student profile not found'}, status=404)

        visibility = getattr(student, 'profile_visibility', {
            'email_visible': True,
            'phone_visible': True,
            'wilaya_visible': True,
            'university_visible': True,
            'skills_visible': True,
            'contact_visible': True,
            'profile_public': True
        })

        profile_picture_url = None
        if student.profile_picture:
            try:
                file_id = student.profile_picture
                if file_id and file_id != 'None' and len(file_id) > 5:
                    profile_picture_url = f"{settings.MEDIA_URL}profile_picture/{file_id}/"
                else:
                    pass
            except Exception as e:
                print(f"Erreur lecture profile_picture: {e}")
                profile_picture_url = None

        return Response({
            'success': True,
            'profile': {
                'id': str(student.id),
                'full_name': student.full_name,
                'email': request.user.email,
                'username': request.user.username,
                'wilaya': student.wilaya,
                'skills': student.skills,
                'github': student.github,
                'portfolio': student.portfolio,
                'education_level': student.education_level,
                'university': student.university,
                'major': student.major,
                'graduation_year': student.graduation_year,
                'bio': getattr(student, 'bio', ''),
                'phone': getattr(student, 'phone', ''),
                'profile_picture': profile_picture_url,
                'date_joined': request.user.created_at.strftime('%d/%m/%Y'),
                'is_placed': student.is_placed,
                'placed_company_name': student.placed_company.company_name if student.placed_company else None,
            },
            'visibility': visibility,
            'is_owner': True
        })

    except Exception as e:
        print(f"Erreur get_my_profile: {str(e)}")
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['PUT'])
@jwt_authenticated
@role_required(allowed_roles=['student'])
def update_my_profile(request):
    """Met à jour le profil de l'étudiant connecté"""
    try:
        student = Student.objects(user=request.user).first()
        if not student:
            return Response({'success': False, 'error': 'Student profile not found'}, status=404)

        data = request.data

        updatable_fields = [
            'full_name', 'wilaya', 'skills', 'github', 'portfolio',
            'education_level', 'university', 'major', 'graduation_year',
            'bio', 'phone'
        ]

        modified = False

        for field in updatable_fields:
            if field in data and data[field] is not None:
                if field == 'skills' and isinstance(data[field], list):
                    setattr(student, field, data[field])
                    modified = True
                elif field == 'graduation_year':
                    try:
                        year = int(data[field])
                        if year != getattr(student, field, None):
                            setattr(student, field, year)
                            modified = True
                    except (ValueError, TypeError):
                        pass
                else:
                    current_value = getattr(student, field, None)
                    new_value = data[field]
                    if current_value != new_value:
                        setattr(student, field, new_value)
                        modified = True

        if 'username' in data and data['username']:
            existing_user = User.objects(username=data['username']).first()
            if existing_user and str(existing_user.id) != str(request.user.id):
                return Response({'success': False, 'error': 'Username already taken'}, status=400)
            if request.user.username != data['username']:
                request.user.username = data['username']
                request.user.save()
                modified = True

        if 'visibility' in data:
            student.profile_visibility = data['visibility']
            modified = True

        if modified:
            student.save()

        profile_picture_url = None
        if student.profile_picture:
            try:
                if student.profile_picture.name:
                    profile_picture_url = f"{settings.MEDIA_URL}{student.profile_picture.name}"
            except:
                profile_picture_url = None

        return Response({
            'success': True,
            'message': 'Profile updated successfully',
            'profile': {
                'id': str(student.id),
                'full_name': student.full_name,
                'email': request.user.email,
                'username': request.user.username,
                'wilaya': student.wilaya,
                'skills': student.skills,
                'github': student.github,
                'portfolio': student.portfolio,
                'education_level': student.education_level,
                'university': student.university,
                'major': student.major,
                'graduation_year': student.graduation_year,
                'bio': getattr(student, 'bio', ''),
                'phone': getattr(student, 'phone', ''),
                'profile_picture': profile_picture_url,
            }
        })

    except Exception as e:
        print(f"❌ Erreur update_my_profile: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['POST'])
@jwt_authenticated
@role_required(allowed_roles=['student'])
@parser_classes([MultiPartParser, FormParser])
def upload_profile_picture(request):
    """Upload la photo de profil de l'étudiant"""
    try:
        from gridfs import GridFS
        from mongoengine.connection import get_db
        from bson import ObjectId
        from datetime import datetime

        student = Student.objects(user=request.user).first()
        if not student:
            return Response({'success': False, 'error': 'Student profile not found'}, status=404)

        if 'profile_picture' not in request.FILES:
            return Response({'success': False, 'error': 'No file provided'}, status=400)

        file = request.FILES['profile_picture']

        if file.size > 5 * 1024 * 1024:
            return Response({'success': False, 'error': 'File too large (max 5MB)'}, status=400)

        allowed_types = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif']
        if file.content_type not in allowed_types:
            return Response({'success': False, 'error': 'Invalid file type. Use JPEG, PNG or GIF'}, status=400)

        db = get_db()
        fs = GridFS(db)

        if student.profile_picture:
            try:
                old_id = ObjectId(student.profile_picture)
                fs.delete(old_id)
            except:
                pass

        file_content = file.read()

        file_id = fs.put(
            file_content,
            filename=file.name,
            content_type=file.content_type,
            metadata={
                'user_id': str(request.user.id),
                'uploaded_at': datetime.now().isoformat()
            }
        )

        student.profile_picture = str(file_id)
        student.save()

        image_url = f"{settings.MEDIA_URL}profile_picture/{file_id}/"

        return Response({
            'success': True,
            'message': 'Profile picture uploaded successfully',
            'url': image_url
        })

    except Exception as e:
        print(f"Erreur upload_profile_picture: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
@jwt_authenticated
def get_profile_by_username(request, username):
    """Récupère le profil public d'un étudiant par son username"""
    try:
        user_obj = User.objects(username=username, role='student').first()
        if not user_obj:
            return Response({'success': False, 'error': 'User not found'}, status=404)

        student = Student.objects(user=user_obj).first()
        if not student:
            return Response({'success': False, 'error': 'Student profile not found'}, status=404)

        visibility = getattr(student, 'profile_visibility', {})
        is_owner = str(request.user.id) == str(user_obj.id)

        profile_picture_url = None
        if student.profile_picture:
            try:
                profile_picture_url = f"/media/{student.profile_picture.name}"
            except:
                profile_picture_url = None

        response_data = {
            'success': True,
            'profile': {
                'id': str(student.id),
                'full_name': student.full_name,
                'username': user_obj.username,
                'email': user_obj.email if visibility.get('email_visible', True) or is_owner else None,
                'wilaya': student.wilaya if visibility.get('wilaya_visible', True) or is_owner else None,
                'university': student.university if visibility.get('university_visible', True) or is_owner else None,
                'major': student.major if visibility.get('major_visible', True) or is_owner else None,
                'education_level': student.education_level if visibility.get('education_visible', True) or is_owner else None,
                'graduation_year': student.graduation_year if visibility.get('graduation_visible', True) or is_owner else None,
                'skills': student.skills if visibility.get('skills_visible', True) or is_owner else [],
                'bio': getattr(student, 'bio', '') if visibility.get('bio_visible', True) or is_owner else None,
                'phone': getattr(student, 'phone', '') if visibility.get('phone_visible', True) or is_owner else None,
                'github': student.github if visibility.get('contact_visible', True) or is_owner else None,
                'portfolio': student.portfolio if visibility.get('contact_visible', True) or is_owner else None,
                'profile_picture': profile_picture_url,
                'is_placed': student.is_placed,
                'placed_company_name': student.placed_company.company_name if student.placed_company else None,
                'date_joined': user_obj.created_at.strftime('%d/%m/%Y'),
            },
            'visibility': visibility,
            'is_owner': is_owner
        }

        return Response(response_data)

    except Exception as e:
        print(f"Erreur get_profile_by_username: {str(e)}")
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
def serve_profile_picture(request, file_id):
    """Sert l'image de profil depuis GridFS"""
    try:
        from gridfs import GridFS
        from mongoengine.connection import get_db
        from bson import ObjectId
        from django.http import HttpResponse

        db = get_db()
        fs = GridFS(db)

        file_obj = fs.get(ObjectId(file_id))

        response = HttpResponse(file_obj.read(), content_type=file_obj.content_type)
        response['Content-Disposition'] = f'inline; filename="{file_obj.filename}"'
        return response

    except Exception as e:
        print(f"Erreur serve_profile_picture: {e}")
        return HttpResponse(status=404)


@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['student'])
def get_my_cv(request):
    """Récupère le CV actuel et l'historique des CVs de l'étudiant"""
    try:
        student = Student.objects(user=request.user).first()
        if not student:
            return Response({'success': False, 'error': 'Student profile not found'}, status=404)

        current_cv = None
        if student.cv_file:
            try:
                if student.cv_file and hasattr(student.cv_file, 'grid_id'):
                    current_cv = {
                        'id': str(student.cv_file.grid_id),
                        'url': f'/api/student/cv/download/',
                        'filename': getattr(student.cv_file, 'filename', 'cv.pdf'),
                        'size': getattr(student.cv_file, 'length', None),
                        'uploaded_at': student.created_at.strftime('%Y-%m-%d %H:%M:%S') if student.created_at else datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    }
                else:
                    pass
            except Exception as e:
                print(f"❌ Erreur lecture CV: {e}")
                current_cv = None

        from .models import CvHistory
        history = CvHistory.objects(student=student).order_by('-uploaded_at')
        history_list = []
        for cv in history:
            try:
                history_list.append({
                    'id': str(cv.id),
                    'url': f'/api/student/cv/download/{str(cv.id)}/',
                    'filename': cv.filename or 'cv.pdf',
                    'size': None,
                    'uploaded_at': cv.uploaded_at.strftime('%Y-%m-%d %H:%M:%S') if cv.uploaded_at else datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                })
            except Exception as e:
                print(f"❌ Erreur lecture historique CV: {e}")

        return Response({
            'success': True,
            'cv': current_cv,
            'history': history_list
        })

    except Exception as e:
        print(f"❌ Erreur get_my_cv: {str(e)}")
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['POST'])
@jwt_authenticated
@role_required(allowed_roles=['student'])
@parser_classes([MultiPartParser, FormParser])
def upload_cv(request):
    """Upload un nouveau CV pour l'étudiant"""
    try:
        from gridfs import GridFS
        from mongoengine.connection import get_db
        from bson import ObjectId
        from datetime import datetime
        import gridfs

        student = Student.objects(user=request.user).first()
        if not student:
            return Response({'success': False, 'error': 'Student profile not found'}, status=404)

        if 'cv_file' not in request.FILES:
            return Response({'success': False, 'error': 'No file provided'}, status=400)

        file = request.FILES['cv_file']

        if file.content_type != 'application/pdf':
            return Response({'success': False, 'error': 'Only PDF files are accepted'}, status=400)

        if file.size > 5 * 1024 * 1024:
            return Response({'success': False, 'error': 'File too large (max 5MB)'}, status=400)

        from .models import CvHistory

        if student.cv_file:
            try:
                db = get_db()
                fs = gridfs.GridFS(db)

                old_file_id = student.cv_file.grid_id if hasattr(student.cv_file, 'grid_id') else str(student.cv_file)
                if old_file_id:
                    old_file_obj = fs.get(ObjectId(old_file_id))
                    old_file_content = old_file_obj.read()
                    old_filename = file.name if file.name else 'cv.pdf'

                    history_cv = CvHistory(
                        student=student,
                        filename=old_filename,
                        uploaded_at=datetime.now()
                    )

                    new_file_id = fs.put(
                        old_file_content,
                        filename=old_filename,
                        content_type='application/pdf',
                        metadata={
                            'user_id': str(request.user.id),
                            'uploaded_at': datetime.now().isoformat(),
                            'type': 'history'
                        }
                    )
                    history_cv.file = new_file_id
                    history_cv.save()

                    fs.delete(ObjectId(old_file_id))

            except Exception as e:
                print(f"⚠️ Erreur sauvegarde historique: {e}")

        db = get_db()
        fs = gridfs.GridFS(db)

        file_content = file.read()

        file_id = fs.put(
            file_content,
            filename=file.name,
            content_type='application/pdf',
            metadata={
                'user_id': str(request.user.id),
                'uploaded_at': datetime.now().isoformat(),
                'original_filename': file.name,
                'size': file.size
            }
        )

        from django.core.files.base import ContentFile

        file.seek(0)
        cv_content = ContentFile(file.read(), name=file.name)

        student.cv_file = cv_content
        student.save()

        return Response({
            'success': True,
            'message': 'CV uploaded successfully',
            'file_id': str(file_id)
        })

    except Exception as e:
        print(f"❌ Erreur upload_cv: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['DELETE'])
@jwt_authenticated
@role_required(allowed_roles=['student'])
def delete_cv(request):
    """Supprime le CV actuel de l'étudiant"""
    try:
        from gridfs import GridFS
        from mongoengine.connection import get_db
        from bson import ObjectId
        import gridfs

        student = Student.objects(user=request.user).first()
        if not student:
            return Response({'success': False, 'error': 'Student profile not found'}, status=404)

        if student.cv_file:
            db = get_db()
            fs = gridfs.GridFS(db)

            file_id = student.cv_file.grid_id
            fs.delete(file_id)

            student.cv_file = None
            student.save()

        return Response({
            'success': True,
            'message': 'CV deleted successfully'
        })

    except Exception as e:
        print(f"❌ Erreur delete_cv: {str(e)}")
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['POST'])
@jwt_authenticated
def enable_2fa(request):
    """Enable two-factor authentication"""
    try:
        user = request.user
        user.two_fa_enabled = True
        user.save()
        return Response({'success': True, 'message': '2FA enabled'})
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['POST'])
@jwt_authenticated
def disable_2fa(request):
    """Disable two-factor authentication"""
    try:
        user = request.user
        user.two_fa_enabled = False
        user.save()
        return Response({'success': True, 'message': '2FA disabled'})
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['POST'])
@jwt_authenticated
def add_recovery_email(request):
    """Add recovery email with OTP verification"""
    try:
        recovery_email = request.data.get('recovery_email')
        if not recovery_email:
            return Response({'success': False, 'error': 'Email required'}, status=400)

        if '@' not in recovery_email or '.' not in recovery_email:
            return Response({'success': False, 'error': 'Invalid email address'}, status=400)

        user = request.user

        if recovery_email == user.email:
            return Response({'success': False, 'error': 'Recovery email cannot be the same as your primary email'}, status=400)

        from .otp_utils import create_otp_verification, send_otp_email

        temp_data = {
            'action': 'add_recovery_email',
            'user_id': str(user.id),
            'recovery_email': recovery_email
        }

        code = create_otp_verification(recovery_email, temp_data)

        email_sent = send_otp_email(recovery_email, code, "recovery_email_verification")

        if not email_sent:
            return Response({'success': False, 'error': 'Failed to send verification email'}, status=500)

        return Response({
            'success': True, 
            'message': 'Verification code sent to your recovery email',
            'recovery_email': recovery_email
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['DELETE'])
@jwt_authenticated
def remove_recovery_email(request):
    """Remove recovery email and send confirmation"""
    try:
        user = request.user

        if not user.recovery_email:
            return Response({'success': False, 'error': 'No recovery email found'}, status=400)

        student = Student.objects(user=user).first()
        user_name = student.full_name if student else user.username

        from .email_utils import send_recovery_email_removed_confirmation
        send_recovery_email_removed_confirmation(
            recipient=user.email,
            name=user_name
        )

        user.recovery_email = None
        user.save()

        return Response({'success': True, 'message': 'Recovery email removed successfully'})

    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
@jwt_authenticated
def security_status(request):
    """Get security status"""
    try:
        user = request.user
        return Response({
            'success': True,
            'two_fa_enabled': getattr(user, 'two_fa_enabled', False),
            'recovery_email_exists': bool(getattr(user, 'recovery_email', None))
        })
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['student'])
def download_current_cv(request):
    """Télécharge le CV actuel de l'étudiant"""
    try:
        from gridfs import GridFS
        from mongoengine.connection import get_db
        from bson import ObjectId
        from django.http import HttpResponse
        import gridfs

        student = Student.objects(user=request.user).first()
        if not student:
            return Response({'error': 'Student profile not found'}, status=404)

        if not student.cv_file:
            return Response({'error': 'No CV found'}, status=404)

        db = get_db()
        fs = gridfs.GridFS(db)

        file_id = student.cv_file.grid_id

        file_obj = fs.get(file_id)

        response = HttpResponse(file_obj.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="{file_obj.filename}"'
        return response

    except Exception as e:
        print(f"❌ Erreur download_current_cv: {e}")
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['student'])
def download_cv_history(request, cv_id):
    """Télécharge un CV de l'historique"""
    try:
        from gridfs import GridFS
        from mongoengine.connection import get_db
        from bson import ObjectId
        from django.http import HttpResponse
        from .models import CvHistory

        student = Student.objects(user=request.user).first()
        if not student:
            return Response({'error': 'Student profile not found'}, status=404)

        cv_history = CvHistory.objects(id=cv_id, student=student).first()
        if not cv_history:
            return Response({'error': 'CV not found in history'}, status=404)

        db = get_db()
        fs = GridFS(db)

        file_id = str(cv_history.file)
        file_obj = fs.get(ObjectId(file_id))

        response = HttpResponse(file_obj.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="{file_obj.filename}"'
        return response

    except Exception as e:
        print(f"❌ Erreur download_cv_history: {e}")
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@jwt_authenticated
def verify_recovery_email(request):
    """Verify recovery email with OTP and save it"""
    try:
        email = request.data.get('email')
        code = request.data.get('code')

        if not email or not code:
            return Response({'success': False, 'error': 'Email and code required'}, status=400)

        from .otp_utils import verify_otp_code

        temp_data, error = verify_otp_code(email, code)

        if error:
            return Response({'success': False, 'error': error, 'code_invalid': True}, status=400)

        if temp_data.get('action') != 'add_recovery_email':
            return Response({'success': False, 'error': 'Invalid verification'}, status=400)

        user = User.objects(id=temp_data['user_id']).first()
        if not user:
            return Response({'success': False, 'error': 'User not found'}, status=404)

        recovery_email = temp_data['recovery_email']

        user.recovery_email = recovery_email
        user.save()

        from .email_utils import send_recovery_email_confirmation
        student = Student.objects(user=user).first()
        user_name = student.full_name if student else user.username

        send_recovery_email_confirmation(
            recipient=user.email,
            name=user_name,
            recovery_email=recovery_email
        )

        return Response({'success': True, 'message': 'Recovery email added successfully'})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['POST'])
def forgot_password_with_recovery(request):
    """
    Forgot password with recovery email support.
    If user has recovery email, send OTP there instead of primary email.
    """
    email = request.data.get('email')
    if not email:
        return Response({'success': False, 'message': 'Email required'}, status=400)

    user = User.objects(email=email).first()
    if not user:
        return Response({'success': False, 'message': 'No account found with that email.', 'email_exists': False},
                        status=404)

    from .otp_utils import create_otp_verification, send_otp_email

    if user.recovery_email:
        target_email = user.recovery_email
        action = 'reset_password_via_recovery'

        temp_data = {
            'action': action,
            'email': email,
            'user_id': str(user.id),
            'primary_email': email,
            'recovery_email': target_email
        }

        code = create_otp_verification(target_email, temp_data)
        email_sent = send_otp_email(target_email, code, "reset_password")

        from .email_utils import send_password_reset_via_recovery_email
        student = Student.objects(user=user).first()
        user_name = student.full_name if student else user.username
        send_password_reset_via_recovery_email(target_email, user_name, email)

        return Response({
            'success': True, 
            'message': f'Reset code sent to your recovery email: {target_email[:3]}***{target_email[-10:]}',
            'email': email,
            'email_exists': True,
            'using_recovery': True
        })
    else:
        temp_data = {'action': 'reset_password', 'email': email, 'user_id': str(user.id)}
        code = create_otp_verification(email, temp_data)
        email_sent = send_otp_email(email, code, "reset_password")

        if not email_sent:
            return Response({'success': False, 'message': 'Failed to send email'}, status=500)

        return Response({
            'success': True, 
            'message': 'Reset code sent to your email',
            'email': email,
            'email_exists': True,
            'using_recovery': False
        })


@api_view(['POST'])
@jwt_authenticated
def initiate_password_change(request):
    """
    Étape 1: Envoie un OTP pour changer le mot de passe
    """
    try:
        user = request.user

        if user.recovery_email:
            target_email = user.recovery_email
            using_recovery = True
        else:
            target_email = user.email
            using_recovery = False

        from .otp_utils import create_otp_for_password_change
        code = create_otp_for_password_change(str(user.id), target_email, user.email)

        from .otp_utils import send_otp_email
        email_sent = send_otp_email(target_email, code, "change_password")

        if not email_sent:
            return Response({
                'success': False, 
                'message': "Impossible d'envoyer le code de vérification"
            }, status=500)

        return Response({
            'success': True,
            'message': f"Code de vérification envoyé à {'votre email de récupération' if using_recovery else 'votre email'}",
            'using_recovery': using_recovery,
            'target_email_masked': target_email[:3] + '***' + target_email[-10:] if len(target_email) > 10 else target_email[:3] + '***'
        })

    except Exception as e:
        print(f"Erreur initiate_password_change: {str(e)}")
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['POST'])
@jwt_authenticated
def verify_and_change_password(request):
    """
    Étape 2: Vérifie l'OTP et change le mot de passe
    Body: { code, new_password, confirm_password }
    """
    try:
        code = request.data.get('code', '').strip()
        new_password = request.data.get('new_password', '').strip()
        confirm_password = request.data.get('confirm_password', '').strip()

        if not code:
            return Response({'success': False, 'error': 'Code de vérification requis'}, status=400)

        if not new_password or not confirm_password:
            return Response({'success': False, 'error': 'Nouveau mot de passe requis'}, status=400)

        if new_password != confirm_password:
            return Response({'success': False, 'error': 'Les mots de passe ne correspondent pas'}, status=400)

        if len(new_password) < 8:
            return Response({'success': False, 'error': 'Le mot de passe doit contenir au moins 8 caractères'}, status=400)
        if new_password.isdigit():
            return Response({'success': False, 'error': 'Le mot de passe ne peut pas être composé uniquement de chiffres'}, status=400)
        if not any(c.isupper() for c in new_password):
            return Response({'success': False, 'error': 'Le mot de passe doit contenir au moins une majuscule'}, status=400)
        if not any(c.islower() for c in new_password):
            return Response({'success': False, 'error': 'Le mot de passe doit contenir au moins une minuscule'}, status=400)
        if not any(c.isdigit() for c in new_password):
            return Response({'success': False, 'error': 'Le mot de passe doit contenir au moins un chiffre'}, status=400)

        user = request.user

        from .models import OTPVerification
        from datetime import datetime

        otp = OTPVerification.objects(
            code=code,
            used=False,
            expires_at__gte=datetime.now()
        ).first()

        if not otp:
            return Response({
                'success': False, 
                'error': 'Code invalide ou expiré. Veuillez demander un nouveau code.',
                'code_invalid': True
            }, status=400)

        temp_data = otp.data
        if temp_data.get('action') != 'change_password' or temp_data.get('user_id') != str(user.id):
            return Response({
                'success': False, 
                'error': 'Code invalide pour cet utilisateur',
                'code_invalid': True
            }, status=400)

        otp.used = True
        otp.save()

        user.set_password(new_password)

        return Response({'success': True, 'message': 'Mot de passe changé avec succès'})

    except Exception as e:
        print(f" Erreur verify_and_change_password: {str(e)}")
        return Response({'success': False, 'error': str(e)}, status=500)


# ==================== CHAT ENDPOINTS (friend's) ====================

@api_view(['GET'])
@jwt_authenticated
def get_student_chat_groups(request):
    """Récupère les groupes de chat pour un étudiant (ses internships)"""
    try:
        student = Student.objects(user=request.user).first()
        if not student:
            return Response({'success': False, 'error': 'Student not found'}, status=404)

        groups = []

        applications = Application.objects(
            student=student,
            status__in=['accepted_by_company', 'validated_by_co_dept']
        )

        seen_offers = set()
        for app in applications:
            if app.offer and app.offer.id not in seen_offers:
                seen_offers.add(app.offer.id)
                groups.append({
                    'id': f"internship_{app.offer.id}",
                    'name': f"Stage: {app.offer.title}",
                    'type': 'internship',
                    'offer_id': str(app.offer.id),
                    'member_count': Application.objects(offer=app.offer, status__in=['accepted_by_company', 'validated_by_co_dept']).count()
                })

        return Response({'success': True, 'groups': groups})

    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
@jwt_authenticated
def get_company_chat_groups(request):
    """Récupère les groupes de chat pour une entreprise"""
    try:
        company = _get_user_company(request.user)
        if not company:
            return Response({'success': False, 'error': 'Company not found'}, status=404)

        groups = []

        hiring_managers_count = User.objects(
            role='company',
            sub_role='hiring_manager',
            status=True,
            pending_company_id=str(company.id)
        ).count()

        groups.append({
            'id': f"company_{company.id}",
            'name': f"Équipe {company.company_name}",
            'type': 'company',
            'company_id': str(company.id),
            'member_count': hiring_managers_count + 1
        })

        return Response({'success': True, 'groups': groups})

    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
@jwt_authenticated
def get_university_chat_groups(request, university):
    """Récupère les groupes de chat pour une université"""
    try:
        groups = []

        admins_count = Admin.objects(university=university).count()

        groups.append({
            'id': f"university_{university.replace(' ', '_')}",
            'name': f"Équipe {university}",
            'type': 'university',
            'university': university,
            'member_count': admins_count
        })

        return Response({'success': True, 'groups': groups})

    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['POST'])
@jwt_authenticated
def create_chat_group(request):
    """Crée un nouveau groupe de chat"""
    try:
        name = request.data.get('name')
        if not name:
            return Response({'success': False, 'error': 'Name required'}, status=400)

        group = {
            'id': f"custom_{int(datetime.now().timestamp())}",
            'name': name,
            'type': 'custom',
            'created_by': str(request.user.id),
            'member_count': 1
        }

        return Response({'success': True, 'group': group})

    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
@jwt_authenticated
def get_chat_users_students(request):
    """Récupère les utilisateurs pour chat privé (étudiants du même stage)"""
    try:
        student = Student.objects(user=request.user).first()
        if not student:
            return Response({'success': False, 'error': 'Student not found'}, status=404)

        applications = Application.objects(
            student=student,
            status__in=['accepted_by_company', 'validated_by_co_dept']
        )

        user_ids = set()
        for app in applications:
            if app.offer:
                other_apps = Application.objects(
                    offer=app.offer,
                    status__in=['accepted_by_company', 'validated_by_co_dept']
                )
                for other in other_apps:
                    if str(other.student.user.id) != str(request.user.id):
                        user_ids.add(str(other.student.user.id))

        users = []
        for uid in user_ids:
            u = User.objects(id=uid).first()
            if u:
                s = Student.objects(user=u).first()
                users.append({
                    'id': str(u.id),
                    'username': u.username,
                    'email': u.email,
                    'full_name': s.full_name if s else u.username,
                    'is_online': u.is_online()
                })

        return Response({'success': True, 'users': users})

    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
@jwt_authenticated
def get_chat_users_company(request):
    """Récupère les utilisateurs pour chat privé (hiring managers de la même entreprise)"""
    try:
        company = _get_user_company(request.user)
        if not company:
            return Response({'success': False, 'error': 'Company not found'}, status=404)

        users = User.objects(
            role='company',
            sub_role='hiring_manager',
            status=True,
            pending_company_id=str(company.id)
        )

        result = []
        for u in users:
            if str(u.id) != str(request.user.id):
                result.append({
                    'id': str(u.id),
                    'username': u.username,
                    'email': u.email,
                    'full_name': u.username,
                    'is_online': u.is_online()
                })

        return Response({'success': True, 'users': result})

    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
@jwt_authenticated
def get_chat_users_university(request, university):
    """Récupère les utilisateurs pour chat privé (membres de la même université)"""
    try:
        admins = Admin.objects(university=university)

        result = []
        for admin in admins:
            if admin.user and str(admin.user.id) != str(request.user.id):
                result.append({
                    'id': str(admin.user.id),
                    'username': admin.user.username,
                    'email': admin.user.email,
                    'full_name': admin.full_name,
                    'is_online': admin.user.is_online()
                })

        return Response({'success': True, 'users': result})

    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['student'])
def get_accepted_internships(request):
    """Récupère les stages acceptés par l'étudiant pour les groupes de chat"""
    try:
        student = Student.objects(user=request.user).first()
        if not student:
            return Response({'success': False, 'error': 'Student not found'}, status=404)

        applications = Application.objects(
            student=student,
            status__in=['accepted_by_company', 'validated_by_co_dept']
        )

        internships = []
        for app in applications:
            internships.append({
                'id': str(app.id),
                'offer_id': str(app.offer.id),
                'title': app.offer.title,
                'company_name': app.offer.company.company_name,
                'status': app.status,
                'members_count': Application.objects(offer=app.offer, status__in=['accepted_by_company', 'validated_by_co_dept']).count()
            })

        return Response({'success': True, 'internships': internships})

    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['student'])
def get_student_contacts(request):
    """Récupère les contacts pour chat privé (co dept heads, company reps)"""
    try:
        student = Student.objects(user=request.user).first()
        if not student:
            return Response({'success': False, 'error': 'Student not found'}, status=404)

        contacts = []

        admins = Admin.objects(university=student.university)
        for admin in admins:
            if admin.user and admin.user.status and admin.user.role == 'admin':
                contacts.append({
                    'id': str(admin.user.id),
                    'username': admin.user.username,
                    'email': admin.user.email,
                    'full_name': admin.full_name,
                    'role': 'admin',
                    'is_online': admin.user.is_online()
                })

        applications = Application.objects(student=student)
        for app in applications:
            if app.offer and app.offer.company and app.offer.company.user:
                company_user = app.offer.company.user
                if company_user.status:
                    contacts.append({
                        'id': str(company_user.id),
                        'username': company_user.username,
                        'email': company_user.email,
                        'full_name': app.offer.company.company_name,
                        'role': 'company',
                        'is_online': company_user.is_online()
                    })

        seen = set()
        unique_contacts = []
        for contact in contacts:
            if contact['id'] not in seen:
                seen.add(contact['id'])
                unique_contacts.append(contact)

        return Response({'success': True, 'users': unique_contacts})

    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['POST'])
@jwt_authenticated
def enable_email_2fa(request):
    """تفعيل 2FA عبر البريد الإلكتروني"""
    try:
        user = request.user
        user.two_fa_enabled = True
        user.save()
        return Response({'success': True, 'message': '2FA via email enabled'})
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['POST'])
@jwt_authenticated
def disable_email_2fa(request):
    """تعطيل 2FA عبر البريد الإلكتروني"""
    try:
        user = request.user
        user.two_fa_enabled = False
        user.save()
        return Response({'success': True, 'message': '2FA via email disabled'})
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['POST'])
def send_login_otp(request):
    """إرسال OTP إلى البريد الإلكتروني عند تسجيل الدخول"""
    try:
        email = request.data.get('email')
        if not email:
            return Response({'success': False, 'error': 'Email required'}, status=400)

        user = User.objects(email=email).first()
        if not user:
            return Response({'success': False, 'error': 'User not found'}, status=404)

        temp_data = {
            'action': 'login_2fa',
            'user_id': str(user.id),
            'email': email
        }

        code = create_otp_verification(email, temp_data)

        email_sent = send_otp_email(email, code, "login_2fa")

        if not email_sent:
            return Response({'success': False, 'error': 'Failed to send email'}, status=500)

        return Response({
            'success': True,
            'message': 'Verification code sent to your email',
            'email': email
        })

    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['POST'])
def verify_login_otp(request):
    """التحقق من OTP وإكمال تسجيل الدخول"""
    try:
        email = request.data.get('email')
        code = request.data.get('code')

        if not email or not code:
            return Response({'success': False, 'error': 'Email and code required'}, status=400)

        temp_data, error = verify_otp_code(email, code)

        if error:
            return Response({'success': False, 'error': error, 'code_invalid': True}, status=400)

        if temp_data.get('action') != 'login_2fa':
            return Response({'success': False, 'error': 'Invalid verification'}, status=400)

        user = User.objects(id=temp_data['user_id']).first()
        if not user:
            return Response({'success': False, 'error': 'User not found'}, status=404)

        token = create_token(user)

        redirect_urls = {
            'student': '/student/dashboard',
            'company': '/company/dashboard',
            'admin': '/admin/dashboard',
        }

        # Build user_data with username and correct company_name
        user_data = {
            'id': str(user.id),
            'username': user.username,          # add username
            'email': user.email,
            'role': user.role,
            'sub_role': user.sub_role,
        }

        if user.role == 'student':
            student = Student.objects(user=user).first()
            if student:
                user_data['full_name'] = student.full_name
                user_data['university'] = student.university
        elif user.role == 'company':
            # Use the helper to get the correct company (works for both company_manager and hiring_manager)
            company = _get_user_company(user)
            if company:
                user_data['company_name'] = company.company_name
        elif user.role == 'admin':
            admin = Admin.objects(user=user).first()
            if admin:
                user_data['full_name'] = admin.full_name
                user_data['university'] = admin.university

        return Response({
            'success': True,
            'message': 'Login successful',
            'token': token,
            'user': user_data,
            'redirect_url': redirect_urls.get(user.role, '/dashboard')
        })

    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['POST'])
def send_2fa_code(request):
    """إرسال كود 2FA إلى البريد الإلكتروني"""
    try:
        email = request.data.get('email')
        if not email:
            return Response({'success': False, 'error': 'Email required'}, status=400)

        user = User.objects(email=email).first()
        if not user:
            return Response({'success': False, 'error': 'User not found'}, status=404)

        temp_data = {
            'action': 'login_2fa',
            'user_id': str(user.id),
            'email': email
        }

        code = create_otp_verification(email, temp_data)

        email_sent = send_otp_email(email, code, "login_2fa")

        if not email_sent:
            return Response({'success': False, 'error': 'Failed to send email'}, status=500)

        return Response({
            'success': True,
            'message': 'Verification code sent to your email'
        })

    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['POST'])
def verify_2fa_code(request):
    """التحقق من كود 2FA وإكمال تسجيل الدخول"""
    try:
        email = request.data.get('email')
        code = request.data.get('code')

        if not email or not code:
            return Response({'success': False, 'error': 'Email and code required'}, status=400)

        temp_data, error = verify_otp_code(email, code)

        if error:
            return Response({'success': False, 'error': error, 'code_invalid': True}, status=400)

        if temp_data.get('action') != 'login_2fa':
            return Response({'success': False, 'error': 'Invalid verification'}, status=400)

        user = User.objects(id=temp_data['user_id']).first()
        if not user:
            return Response({'success': False, 'error': 'User not found'}, status=404)

        token = create_token(user)

        redirect_urls = {
            'student': '/student/dashboard',
            'company': '/company/dashboard',
            'admin': '/admin/dashboard',
        }

        # Build user_data with username and correct company_name
        user_data = {
            'id': str(user.id),
            'username': user.username,          # add username
            'email': user.email,
            'role': user.role,
            'sub_role': user.sub_role,
        }

        if user.role == 'student':
            student = Student.objects(user=user).first()
            if student:
                user_data['full_name'] = student.full_name
                user_data['university'] = student.university
        elif user.role == 'company':
            # Use the helper to get the correct company (works for both company_manager and hiring_manager)
            company = _get_user_company(user)
            if company:
                user_data['company_name'] = company.company_name
        elif user.role == 'admin':
            admin = Admin.objects(user=user).first()
            if admin:
                user_data['full_name'] = admin.full_name
                user_data['university'] = admin.university

        return Response({
            'success': True,
            'message': 'Login successful',
            'token': token,
            'user': user_data,
            'redirect_url': redirect_urls.get(user.role, '/dashboard')
        })

    except Exception as e:
        print(f" Erreur verify_2fa_code: {str(e)}")
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
@jwt_authenticated
def get_2fa_status(request):
    """get 2fa"""
    try:
        user = request.user
        return Response({
            'success': True,
            'two_fa_enabled': user.two_fa_enabled
        })
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


# ============TOP INTERNSHIPS FOR COMPANY ==============

@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['company'])
def top_company_offers(request):
    """
    Return the top 5 offers of the company, sorted by application count.
    Each offer includes 'applicants_count' and 'image_url'.
    """
    company = _get_user_company(request.user)
    if not company:
        return Response({'success': False, 'message': 'Company not found.'}, status=404)

    offers = list(InternshipOffer.objects(company=company))
    if not offers:
        return Response({'success': True, 'offers': []})

    count_map = {}
    for offer in offers:
        count_map[str(offer.id)] = Application.objects(offer=offer).count()

    result = []
    for offer in offers:
        result.append({
            'id': str(offer.id),
            'title': offer.title,
            'description': offer.description,
            'wilaya': offer.wilaya,
            'internship_type': offer.internship_type,
            'required_skills': offer.required_skills,
            'duration': offer.duration,
            'start_date': offer.start_date.strftime('%Y-%m-%d') if offer.start_date else None,
            'deadline': offer.deadline.strftime('%Y-%m-%d') if offer.deadline else None,
            'is_active': offer.is_active,
            'company_name': offer.company_name,
            'created_at': offer.created_at.strftime('%Y-%m-%d') if offer.created_at else None,
            'applicants_count': count_map.get(str(offer.id), 0),
            'image_url': f"/api/company/offers/{offer.id}/image/" if offer.image else None,
        })

    result.sort(key=lambda x: x['applicants_count'], reverse=True)
    result = result[:5]

    return Response({'success': True, 'offers': result})
# ==================== GET APPLICANTS COUNT FOR OFFER ====================

@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['student'])
def get_offer_applicants_count(request, offer_id):
    """
    Get the number of applicants for a specific internship offer
    """
    try:
        from .models import InternshipOffer, Application
        
        try:
            offer = InternshipOffer.objects(id=offer_id).first()
        except Exception:
            return Response({'success': False, 'error': 'Invalid offer ID'}, status=400)
        
        if not offer:
            return Response({'success': False, 'error': 'Offer not found'}, status=404)
        
        # حساب عدد المتقدمين لهذا العرض
        applicants_count = Application.objects(offer=offer).count()
        
        return Response({
            'success': True,
            'count': applicants_count,
            'offer_id': offer_id
        })
        
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)

# Dans views.py, ajouter :
@api_view(['GET'])
@jwt_authenticated
def get_private_conversations(request):
    """Get all users the current user has had private conversations with"""
    try:
        from .models import PrivateChatMessage
        from mongoengine.queryset.visitor import Q
        
        user = request.user
        
        # Récupérer tous les IDs uniques des utilisateurs avec qui l'utilisateur a discuté
        user_ids = set()
        
        # Utiliser Q objects pour une meilleure requête
        try:
            # Récupérer tous les messages uniques
            all_messages = PrivateChatMessage.objects(
                Q(sender_id=str(user.id)) | Q(receiver_id=str(user.id))
            ).only('sender_id', 'receiver_id')
            
            for msg in all_messages:
                if msg.sender_id and msg.sender_id != str(user.id):
                    user_ids.add(msg.sender_id)
                if msg.receiver_id and msg.receiver_id != str(user.id):
                    user_ids.add(msg.receiver_id)
        except Exception as e:
            print(f"Erreur récupération messages: {e}")
            return Response({'success': True, 'conversations': []})
        
        conversations = []
        for uid in user_ids:
            try:
                other_user = User.objects(id=uid).first()
                if not other_user:
                    continue
                
                # Récupérer le dernier message avec une requête plus simple
                last_msg = None
                try:
                    # Requête plus simple et robuste
                    msgs = PrivateChatMessage.objects(
                        sender_id=str(user.id),
                        receiver_id=uid
                    ).order_by('-created_at').limit(1)
                    
                    if msgs.count() == 0:
                        msgs = PrivateChatMessage.objects(
                            sender_id=uid,
                            receiver_id=str(user.id)
                        ).order_by('-created_at').limit(1)
                    
                    if msgs.count() > 0:
                        last_msg = msgs.first()
                except Exception as e:
                    print(f"Erreur récupération dernier message: {e}")
                
                # Compter les messages non lus
                unread_count = 0
                try:
                    unread_count = PrivateChatMessage.objects(
                        sender_id=uid,
                        receiver_id=str(user.id),
                        is_read=False
                    ).count()
                except Exception as e:
                    print(f"Erreur comptage messages non lus: {e}")
                
                # Obtenir le nom complet
                full_name = other_user.username
                if other_user.role == 'admin':
                    admin = Admin.objects(user=other_user).first()
                    if admin and admin.full_name:
                        full_name = admin.full_name
                elif other_user.role == 'student':
                    student = Student.objects(user=other_user).first()
                    if student and student.full_name:
                        full_name = student.full_name
                elif other_user.role == 'company':
                    company = Company.objects(user=other_user).first()
                    if company and company.company_name:
                        full_name = company.company_name
                
                conversations.append({
                    'user_id': uid,
                    'username': other_user.username,
                    'full_name': full_name,
                    'is_online': other_user.is_online(),
                    'unread_count': unread_count,
                    'last_message': last_msg.message if last_msg else None,
                    'last_message_time': last_msg.created_at.isoformat() if last_msg and last_msg.created_at else None
                })
            except Exception as e:
                print(f"Erreur traitement conversation pour {uid}: {e}")
                continue
        
        # Trier par date du dernier message
        conversations.sort(key=lambda x: x['last_message_time'] or '', reverse=True)
        
        return Response({'success': True, 'conversations': conversations})
        
    except Exception as e:
        print(f"Erreur get_private_conversations: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({'success': True, 'conversations': []})
@api_view(['GET'])
@jwt_authenticated
def get_private_chat_history(request, user_id):
    """Get chat history between current user and another user"""
    try:
        from .models import PrivateChatMessage
        
        current_user = request.user
        other_user = User.objects(id=user_id).first()
        
        if not other_user:
            return Response({'success': False, 'error': 'User not found'}, status=404)
        
        # Récupérer tous les messages entre les deux utilisateurs
        messages = []
        try:
            messages = PrivateChatMessage.objects(
                __raw__={
                    '$or': [
                        {'sender_id': str(current_user.id), 'receiver_id': user_id},
                        {'sender_id': user_id, 'receiver_id': str(current_user.id)}
                    ]
                }
            ).order_by('created_at')
        except Exception as e:
            print(f"Erreur récupération messages: {e}")
        
        # Marquer les messages non lus comme lus
        try:
            PrivateChatMessage.objects(
                sender_id=user_id,
                receiver_id=str(current_user.id),
                is_read=False
            ).update(set__is_read=True)
        except Exception as e:
            print(f"Erreur mise à jour messages lus: {e}")
        
        # Obtenir le nom complet
        full_name = other_user.username
        if other_user.role == 'admin':
            admin = Admin.objects(user=other_user).first()
            if admin and admin.full_name:
                full_name = admin.full_name
        elif other_user.role == 'student':
            student = Student.objects(user=other_user).first()
            if student and student.full_name:
                full_name = student.full_name
        elif other_user.role == 'company':
            company = Company.objects(user=other_user).first()
            if company and company.company_name:
                full_name = company.company_name
        
        result = []
        for msg in messages:
            result.append({
                'id': str(msg.id),
                'sender_id': msg.sender_id,
                'receiver_id': msg.receiver_id,
                'message': msg.message,
                'message_type': getattr(msg, 'message_type', 'text'),
                'file_url': getattr(msg, 'file_url', ''),
                'file_name': getattr(msg, 'file_name', ''),
                'timestamp': msg.created_at.isoformat() if msg.created_at else None,
                'is_read': msg.is_read,
                'from_user_name': full_name if msg.sender_id == user_id else None
            })
        
        # Compter les messages non lus
        unread_count = PrivateChatMessage.objects(
            sender_id=user_id,
            receiver_id=str(current_user.id),
            is_read=False
        ).count()
        
        return Response({
            'success': True,
            'messages': result,
            'unread_count': unread_count,
            'other_user': {
                'id': str(other_user.id),
                'username': other_user.username,
                'full_name': full_name,
                'is_online': other_user.is_online()
            }
        })
        
    except Exception as e:
        print(f"Erreur get_private_chat_history: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({'success': False, 'error': str(e)}, status=500)

@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['student'])
def get_all_offers_applicants_counts(request):
    """
    Get applicants counts for multiple offers
    Query param: offer_ids - comma separated list of offer IDs
    """
    try:
        from .models import InternshipOffer, Application
        
        offer_ids_param = request.query_params.get('offer_ids', '')
        if not offer_ids_param:
            return Response({'success': True, 'counts': {}})
        
        offer_ids = offer_ids_param.split(',')
        counts = {}
        
        for offer_id in offer_ids:
            try:
                offer = InternshipOffer.objects(id=offer_id).first()
                if offer:
                    counts[offer_id] = Application.objects(offer=offer).count()
                else:
                    counts[offer_id] = 0
            except Exception:
                counts[offer_id] = 0
        
        return Response({'success': True, 'counts': counts})
        
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)

@api_view(['GET'])
def get_public_offer_applicants_count(request, offer_id):
    """
    Public endpoint to get the number of applicants for a specific internship offer
    No authentication required
    """
    try:
        from .models import InternshipOffer, Application
        
        try:
            offer = InternshipOffer.objects(id=offer_id).first()
        except Exception:
            return Response({'success': False, 'error': 'Invalid offer ID'}, status=400)
        
        if not offer:
            return Response({'success': False, 'error': 'Offer not found'}, status=404)
        
        applicants_count = Application.objects(offer=offer).count()
        
        return Response({
            'success': True,
            'count': applicants_count,
            'offer_id': offer_id
        })
        
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)

# أضف هذه الدالة في views.py (بدون مصادقة)

@api_view(['GET'])
def public_search_offers(request):
    """
    Public endpoint to search offers - no authentication required
    """
    today_start = timezone.make_aware(datetime.combine(timezone.now().date(), datetime.min.time()))
    offers = InternshipOffer.objects(is_active=True, deadline__gte=today_start)

    search_term = request.query_params.get('search', '').strip()
    if search_term:
        offers = offers.filter(
            __raw__={
                '$or': [
                    {'title': {'$regex': search_term, '$options': 'i'}},
                    {'description': {'$regex': search_term, '$options': 'i'}},
                    {'company_name': {'$regex': search_term, '$options': 'i'}}
                ]
            }
        )

    company_name = request.query_params.get('company_name', '').strip()
    if company_name:
        offers = offers.filter(company_name__iexact=company_name)

    wilaya = request.query_params.get('wilaya', '').strip()
    if wilaya:
        offers = offers.filter(wilaya=wilaya)

    internship_type = request.query_params.get('internship_type', '').strip()
    if internship_type:
        offers = offers.filter(internship_type=internship_type)

    skills_param = request.query_params.get('skills', '').strip()
    if skills_param:
        skill_list = [s.strip() for s in skills_param.split(',') if s.strip()]
        offers = offers.filter(required_skills__in=skill_list)

    offers = offers.order_by('-created_at')
    
    result = []
    for offer in offers:
        applicants_count = Application.objects(offer=offer).count()
        
        offer_data = {
            'id': str(offer.id),
            'title': offer.title,
            'description': offer.description,
            'company_name': offer.company_name,
            'wilaya': offer.wilaya,
            'internship_type': offer.internship_type,
            'required_skills': offer.required_skills,
            'duration': offer.duration,
            'start_date': offer.start_date.strftime('%Y-%m-%d') if offer.start_date else None,
            'deadline': offer.deadline.strftime('%Y-%m-%d') if offer.deadline else None,
            'is_active': offer.is_active,
            'created_at': offer.created_at.strftime('%Y-%m-%d') if offer.created_at else None,
            'applicants_count': applicants_count,
            'image': f"/api/company/offers/{offer.id}/image/" if offer.image else None,
        }
        result.append(offer_data)
    
    return Response({'success': True, 'offers': result})

@api_view(['GET'])
def get_public_company_profile(request, company_id):
    """Get public company profile by ID - no authentication required"""
    try:
        from .models import Company, CompanyProfile

        company = Company.objects(id=company_id).first()
        if not company:
            return Response({'success': False, 'error': 'Company not found'}, status=404)

        # جلب البيانات من CompanyProfile، وإنشاء سجل افتراضي إذا لم يكن موجوداً
        profile = CompanyProfile.objects(company_id=company_id).first()
        if not profile:
            profile = CompanyProfile(
                company_id=company_id,
                name=company.company_name,
                description=company.description or '',
                location=company.location or '',
                industry=company.industry or '',
            )
            profile.save()

        profile_data = {
            'name': profile.name,
            'description': profile.description,
            'location': profile.location,
            'website': profile.website,
            'industry': profile.industry,
            'phone': profile.phone,
            'contact_email': profile.contact_email,
            'linkedin': profile.linkedin,
            'twitter': profile.twitter,
            'logo': profile.logo,
            'cover_picture': profile.cover_picture,
        }
        return Response({'success': True, 'profile': profile_data})
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)

@api_view(['GET'])
def public_offers_by_company(request, company_id):
    """Get offers for a specific company by its ID - no authentication required"""
    try:
        company = Company.objects(id=company_id).first()
        if not company:
            return Response({'success': False, 'error': 'Company not found'}, status=404)

        today_start = timezone.make_aware(datetime.combine(timezone.now().date(), datetime.min.time()))
        offers = InternshipOffer.objects(
            company=company,
            is_active=True,
            deadline__gte=today_start
        ).order_by('-created_at')

        result = []
        for offer in offers:
            applicants_count = Application.objects(offer=offer).count()
            result.append({
                'id': str(offer.id),
                'title': offer.title,
                'description': offer.description,
                'company_name': offer.company_name,
                'wilaya': offer.wilaya,
                'internship_type': offer.internship_type,
                'required_skills': offer.required_skills,
                'duration': offer.duration,
                'start_date': offer.start_date.strftime('%Y-%m-%d') if offer.start_date else None,
                'deadline': offer.deadline.strftime('%Y-%m-%d') if offer.deadline else None,
                'is_active': offer.is_active,
                'created_at': offer.created_at.strftime('%Y-%m-%d') if offer.created_at else None,
                'applicants_count': applicants_count,
                'image': f"/api/company/offers/{offer.id}/image/" if offer.image else None,
            })

        return Response({'success': True, 'offers': result})
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)

# ==================== SUPER ADMIN AUTH ====================

@api_view(['POST'])
def super_admin_login(request):
    """تسجيل دخول Super Admin مع إرسال OTP"""
    try:
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response({'success': False, 'error': 'Email and password required'}, status=400)

        # البحث عن المستخدم
        user = User.objects(email=email, is_super_admin=True).first()
        
        if not user:
            return Response({'success': False, 'error': 'Invalid credentials'}, status=401)

        # التحقق من كلمة المرور
        if not user.check_password(password):
            return Response({'success': False, 'error': 'Invalid credentials'}, status=401)

        # التحقق من حالة الحساب
        if not user.status:
            return Response({'success': False, 'error': 'Account is not active'}, status=403)

        # إرسال OTP
        temp_data = {
            'action': 'super_admin_login',
            'user_id': str(user.id),
            'email': email
        }
        
        code = create_otp_verification(email, temp_data)
        
        # إرسال البريد الإلكتروني
        try:
            send_otp_email(email, code, "login_2fa")
        except Exception as e:
            print(f"⚠️ Error sending OTP email: {e}")
        
        print(f"🔐 Super Admin OTP for {email}: {code}")  # للتصحيح

        return Response({
            'success': True,
            'requires_otp': True,
            'message': 'Verification code sent to your email',
            'email': email
        })

    except Exception as e:
        print(f"❌ Error in super_admin_login: {str(e)}")
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['POST'])
def super_admin_verify_otp(request):
    """التحقق من OTP وإكمال تسجيل الدخول"""
    try:
        email = request.data.get('email')
        code = request.data.get('code')

        if not email or not code:
            return Response({'success': False, 'error': 'Email and code required'}, status=400)

        # التحقق من OTP
        temp_data, error = verify_otp_code(email, code)

        if error:
            return Response({'success': False, 'error': error, 'code_invalid': True}, status=400)

        if temp_data.get('action') != 'super_admin_login':
            return Response({'success': False, 'error': 'Invalid verification'}, status=400)

        # الحصول على المستخدم
        user = User.objects(id=temp_data['user_id']).first()
        if not user or not user.is_super_admin:
            return Response({'success': False, 'error': 'User not found or not super admin'}, status=404)

        # تحديث آخر تسجيل دخول
        super_admin = SuperAdmin.objects(user=user).first()
        if super_admin:
            super_admin.last_login = datetime.now()
            super_admin.save()

        # إنشاء التوكن
        token = create_token(user)

        return Response({
            'success': True,
            'message': 'Login successful',
            'token': token,
            'user': {
                'id': str(user.id),
                'email': user.email,
                'role': 'super_admin',
                'full_name': super_admin.full_name if super_admin else user.username
            },
            'redirect_url': '/super-admin/dashboard'
        })

    except Exception as e:
        print(f"❌ Error in super_admin_verify_otp: {str(e)}")
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['POST'])
def super_admin_resend_otp(request):
    """إعادة إرسال OTP"""
    try:
        email = request.data.get('email')
        
        if not email:
            return Response({'success': False, 'error': 'Email required'}, status=400)

        user = User.objects(email=email, is_super_admin=True).first()
        if not user:
            return Response({'success': False, 'error': 'User not found'}, status=404)

        temp_data = {
            'action': 'super_admin_login',
            'user_id': str(user.id),
            'email': email
        }
        
        code = create_otp_verification(email, temp_data)
        
        try:
            send_otp_email(email, code, "login_2fa")
        except Exception as e:
            print(f"⚠️ Error sending OTP email: {e}")
        
        print(f"🔐 Super Admin OTP resent for {email}: {code}")

        return Response({
            'success': True,
            'message': 'Verification code resent to your email'
        })

    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


# ==================== SUPER ADMIN DASHBOARD & MANAGEMENT ====================

@api_view(['GET'])
@jwt_authenticated
def super_admin_dashboard(request):
    """لوحة تحكم Super Admin - يجب أن يكون المستخدم Super Admin"""
    try:
        user = request.user
        
        if not user.is_super_admin:
            return Response({'success': False, 'error': 'Access denied. Super Admin only.'}, status=403)

        # الحصول على الإحصائيات العامة
        total_users = User.objects().count()
        total_students = Student.objects().count()
        total_companies = Company.objects().count()
        total_admins = Admin.objects().count()
        total_offers = InternshipOffer.objects().count()
        total_applications = Application.objects().count()
        total_notifications = Notification.objects().count()
        
        # إحصائيات إضافية
        active_users = User.objects(status=True).count()
        pending_users = User.objects(status=False).count()
        active_offers = InternshipOffer.objects(is_active=True).count()
        pending_applications = Application.objects(status='pending').count()
        accepted_applications = Application.objects(status='accepted_by_company').count()
        validated_applications = Application.objects(status='validated_by_co_dept').count()
        
        # الشركات حسب الصناعة
        companies_by_industry = []
        industries = Company.objects().distinct('industry')
        for industry in industries[:20]:
            if industry:
                companies_by_industry.append({
                    'industry': industry,
                    'count': Company.objects(industry=industry).count()
                })
        
        # العروض حسب النوع
        offers_by_type = []
        for offer_type in ['PFE', 'ouvrier', 'technicien', 'été']:
            offers_by_type.append({
                'type': offer_type,
                'count': InternshipOffer.objects(internship_type=offer_type).count()
            })
        
        # إنشاء سجل النشاط
        try:
            from .activity_logger import log_activity
            log_activity(
                user=user,
                action_type='super_admin_access',
                target_type='dashboard',
                target_id='',
                target_name='Super Admin Dashboard',
                details={'action': 'dashboard_view'}
            )
        except:
            pass

        return Response({
            'success': True,
            'stats': {
                'users': {
                    'total': total_users,
                    'active': active_users,
                    'pending': pending_users,
                    'students': total_students,
                    'companies': total_companies,
                    'admins': total_admins
                },
                'offers': {
                    'total': total_offers,
                    'active': active_offers,
                    'by_type': offers_by_type
                },
                'applications': {
                    'total': total_applications,
                    'pending': pending_applications,
                    'accepted': accepted_applications,
                    'validated': validated_applications
                },
                'notifications': total_notifications,
                'companies_by_industry': companies_by_industry
            }
        })

    except Exception as e:
        print(f"❌ Error in super_admin_dashboard: {str(e)}")
        traceback.print_exc()
        return Response({'success': False, 'error': str(e)}, status=500)


# ==================== SUPER ADMIN USER MANAGEMENT ====================

@api_view(['GET'])
@jwt_authenticated
def super_admin_get_users(request):
    """الحصول على جميع المستخدمين مع إمكانية الفلترة"""
    try:
        user = request.user
        if not user.is_super_admin:
            return Response({'success': False, 'error': 'Access denied'}, status=403)

        # معاملات الفلترة
        role = request.query_params.get('role', '')
        status_filter = request.query_params.get('status', '')
        search = request.query_params.get('search', '')
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 50))

        # بناء الاستعلام
        query = {}
        if role:
            query['role'] = role
        if status_filter == 'active':
            query['status'] = True
        elif status_filter == 'inactive':
            query['status'] = False
        if search:
            query['$or'] = [
                {'username': {'$regex': search, '$options': 'i'}},
                {'email': {'$regex': search, '$options': 'i'}}
            ]

        users = User.objects(**query).skip((page - 1) * page_size).limit(page_size)
        total = User.objects(**query).count()

        result = []
        for u in users:
            user_data = {
                'id': str(u.id),
                'username': u.username,
                'email': u.email,
                'role': u.role,
                'sub_role': u.sub_role,
                'status': u.status,
                'is_super_admin': u.is_super_admin,
                'created_at': u.created_at.strftime('%Y-%m-%d %H:%M:%S') if u.created_at else None,
                'last_activity': u.last_activity.strftime('%Y-%m-%d %H:%M:%S') if u.last_activity else None,
            }
            
            # معلومات إضافية حسب الدور
            if u.role == 'student':
                student = Student.objects(user=u).first()
                if student:
                    user_data['full_name'] = student.full_name
                    user_data['university'] = student.university
                    user_data['major'] = student.major
                    user_data['is_placed'] = student.is_placed
            elif u.role == 'company':
                company = Company.objects(user=u).first()
                if company:
                    user_data['company_name'] = company.company_name
                    user_data['industry'] = company.industry
            elif u.role == 'admin':
                admin = Admin.objects(user=u).first()
                if admin:
                    user_data['full_name'] = admin.full_name
                    user_data['university'] = admin.university
            
            result.append(user_data)

        return Response({
            'success': True,
            'users': result,
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size
        })

    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET', 'PUT', 'DELETE'])
@jwt_authenticated
def super_admin_manage_user(request, user_id):
    """إدارة مستخدم معين (عرض، تعديل، حذف)"""
    try:
        super_user = request.user
        if not super_user.is_super_admin:
            return Response({'success': False, 'error': 'Access denied'}, status=403)

        target_user = User.objects(id=user_id).first()
        if not target_user:
            return Response({'success': False, 'error': 'User not found'}, status=404)

        # لا يمكن حذف أو تعديل الـ Super Admin نفسه من هنا
        if target_user.is_super_admin and str(target_user.id) != str(super_user.id):
            return Response({'success': False, 'error': 'Cannot modify another super admin'}, status=403)

        if request.method == 'GET':
            # عرض تفاصيل المستخدم
            user_data = {
                'id': str(target_user.id),
                'username': target_user.username,
                'email': target_user.email,
                'role': target_user.role,
                'sub_role': target_user.sub_role,
                'status': target_user.status,
                'is_super_admin': target_user.is_super_admin,
                'created_at': target_user.created_at.strftime('%Y-%m-%d %H:%M:%S') if target_user.created_at else None,
                'bio': getattr(target_user, 'bio', ''),
                'phone': getattr(target_user, 'phone', ''),
                'profile_picture': target_user.profile_picture,
            }
            
            # معلومات إضافية
            if target_user.role == 'student':
                student = Student.objects(user=target_user).first()
                if student:
                    user_data['student_profile'] = {
                        'full_name': student.full_name,
                        'wilaya': student.wilaya,
                        'skills': student.skills,
                        'university': student.university,
                        'major': student.major,
                        'education_level': student.education_level,
                        'graduation_year': student.graduation_year,
                        'is_placed': student.is_placed,
                        'github': student.github,
                        'portfolio': student.portfolio
                    }
            elif target_user.role == 'company':
                company = Company.objects(user=target_user).first()
                if company:
                    user_data['company_profile'] = {
                        'company_name': company.company_name,
                        'description': company.description,
                        'location': company.location,
                        'industry': company.industry,
                        'website': company.website,
                        'verified': company.verified
                    }
            elif target_user.role == 'admin':
                admin = Admin.objects(user=target_user).first()
                if admin:
                    user_data['admin_profile'] = {
                        'full_name': admin.full_name,
                        'wilaya': admin.wilaya,
                        'university': admin.university
                    }

            return Response({'success': True, 'user': user_data})

        elif request.method == 'PUT':
            # تعديل المستخدم
            data = request.data
            
            if 'status' in data:
                target_user.status = data['status']
            
            if 'sub_role' in data:
                target_user.sub_role = data['sub_role']
            
            if 'username' in data:
                # التحقق من عدم وجود اسم مستخدم مكرر
                existing = User.objects(username=data['username']).first()
                if existing and str(existing.id) != user_id:
                    return Response({'success': False, 'error': 'Username already exists'}, status=400)
                target_user.username = data['username']
            
            if 'email' in data:
                existing = User.objects(email=data['email']).first()
                if existing and str(existing.id) != user_id:
                    return Response({'success': False, 'error': 'Email already exists'}, status=400)
                target_user.email = data['email']
            
            if 'password' in data and data['password']:
                target_user.set_password(data['password'])
            
            target_user.save()
            
            # تسجيل النشاط
            try:
                from .activity_logger import log_activity
                log_activity(
                    user=super_user,
                    action_type='super_admin_update_user',
                    target_type='user',
                    target_id=user_id,
                    target_name=target_user.username,
                    details={'updated_fields': list(data.keys())}
                )
            except:
                pass
            
            return Response({'success': True, 'message': 'User updated successfully'})

        elif request.method == 'DELETE':
            # حذف المستخدم
            if str(target_user.id) == str(super_user.id):
                return Response({'success': False, 'error': 'Cannot delete yourself'}, status=400)
            
            # حذف البيانات المرتبطة
            if target_user.role == 'student':
                Student.objects(user=target_user).delete()
            elif target_user.role == 'company':
                # حذف الشركة والعروض المرتبطة بها
                company = Company.objects(user=target_user).first()
                if company:
                    InternshipOffer.objects(company=company).delete()
                    company.delete()
            elif target_user.role == 'admin':
                Admin.objects(user=target_user).delete()
            
            # حذف المستخدم
            target_user.delete()
            
            return Response({'success': True, 'message': 'User deleted successfully'})

    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


# ==================== SUPER ADMIN COMPANY MANAGEMENT ====================

@api_view(['GET'])
@jwt_authenticated
def super_admin_get_companies(request):
    """الحصول على جميع الشركات"""
    try:
        user = request.user
        if not user.is_super_admin:
            return Response({'success': False, 'error': 'Access denied'}, status=403)

        companies = Company.objects().order_by('-created_at')
        
        result = []
        for company in companies:
            offers_count = InternshipOffer.objects(company=company).count()
            applications_count = 0
            for offer in InternshipOffer.objects(company=company):
                applications_count += Application.objects(offer=offer).count()
            
            # جلب الملف الشخصي للشركة إذا وجد
            company_profile = CompanyProfile.objects(company_id=str(company.id)).first()
            
            result.append({
                'id': str(company.id),
                'company_name': company.company_name,
                'user_id': str(company.user.id) if company.user else None,
                'email': company.user.email if company.user else None,
                'description': company.description,
                'location': company.location,
                'industry': company.industry,
                'website': company.website,
                'verified': company.verified,
                'offers_count': offers_count,
                'applications_count': applications_count,
                'has_profile': company_profile is not None,
                'created_at': company.created_at.strftime('%Y-%m-%d %H:%M:%S') if hasattr(company, 'created_at') and company.created_at else None
            })

        return Response({'success': True, 'companies': result})

    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET', 'DELETE'])
@jwt_authenticated
def super_admin_manage_company(request, company_id):
    """إدارة شركة معينة (عرض، حذف)"""
    try:
        user = request.user
        if not user.is_super_admin:
            return Response({'success': False, 'error': 'Access denied'}, status=403)

        company = Company.objects(id=company_id).first()
        if not company:
            return Response({'success': False, 'error': 'Company not found'}, status=404)

        if request.method == 'GET':
            offers = InternshipOffer.objects(company=company)
            applications = []
            for offer in offers:
                for app in Application.objects(offer=offer):
                    applications.append({
                        'id': str(app.id),
                        'student_name': app.student.full_name if app.student else None,
                        'offer_title': offer.title,
                        'status': app.status,
                        'applied_at': app.applied_at.strftime('%Y-%m-%d %H:%M:%S') if app.applied_at else None
                    })

            return Response({
                'success': True,
                'company': {
                    'id': str(company.id),
                    'company_name': company.company_name,
                    'description': company.description,
                    'location': company.location,
                    'industry': company.industry,
                    'website': company.website,
                    'verified': company.verified,
                    'email': company.user.email if company.user else None,
                    'offers_count': offers.count(),
                    'applications': applications
                }
            })

        elif request.method == 'DELETE':
            # حذف الشركة وجميع البيانات المرتبطة
            # حذف العروض
            for offer in InternshipOffer.objects(company=company):
                Application.objects(offer=offer).delete()
                offer.delete()
            
            # حذف الملف الشخصي
            CompanyProfile.objects(company_id=str(company.id)).delete()
            
            # حذف المستخدم المرتبط
            if company.user:
                company.user.delete()
            
            company.delete()
            
            return Response({'success': True, 'message': 'Company deleted successfully'})

    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


# ==================== SUPER ADMIN UNIVERSITY MANAGEMENT ====================

@api_view(['GET'])
@jwt_authenticated
def super_admin_get_universities(request):
    """الحصول على جميع الجامعات"""
    try:
        user = request.user
        if not user.is_super_admin:
            return Response({'success': False, 'error': 'Access denied'}, status=403)

        # الحصول على الجامعات من Admins
        admins = Admin.objects()
        universities_dict = {}
        
        for admin in admins:
            uni = admin.university
            if uni not in universities_dict:
                universities_dict[uni] = {
                    'name': uni,
                    'admins_count': 0,
                    'students_count': 0,
                    'applications_count': 0
                }
            universities_dict[uni]['admins_count'] += 1
        
        # حساب عدد الطلاب لكل جامعة
        students = Student.objects()
        for student in students:
            uni = student.university
            if uni in universities_dict:
                universities_dict[uni]['students_count'] += 1
            
            # حساب عدد الطلبات
            apps = Application.objects(student=student)
            if uni in universities_dict:
                universities_dict[uni]['applications_count'] += apps.count()
        
        # الحصول على الملفات الشخصية للجامعات
        university_profiles = UniversityProfile.objects()
        for profile in university_profiles:
            if profile.university in universities_dict:
                universities_dict[profile.university]['has_profile'] = True
                universities_dict[profile.university]['profile_name'] = profile.name
                universities_dict[profile.university]['logo'] = profile.logo
        
        result = list(universities_dict.values())

        return Response({'success': True, 'universities': result})

    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


# ==================== SUPER ADMIN OFFERS MANAGEMENT ====================

@api_view(['GET'])
@jwt_authenticated
def super_admin_get_offers(request):
    """الحصول على جميع عروض التدريب"""
    try:
        user = request.user
        if not user.is_super_admin:
            return Response({'success': False, 'error': 'Access denied'}, status=403)

        offers = InternshipOffer.objects().order_by('-created_at')
        
        result = []
        for offer in offers:
            applications_count = Application.objects(offer=offer).count()
            
            result.append({
                'id': str(offer.id),
                'title': offer.title,
                'company_name': offer.company_name,
                'company_id': str(offer.company.id) if offer.company else None,
                'wilaya': offer.wilaya,
                'internship_type': offer.internship_type,
                'duration': offer.duration,
                'is_active': offer.is_active,
                'applications_count': applications_count,
                'created_at': offer.created_at.strftime('%Y-%m-%d %H:%M:%S') if offer.created_at else None,
                'deadline': offer.deadline.strftime('%Y-%m-%d') if offer.deadline else None
            })

        return Response({'success': True, 'offers': result})

    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


# ==================== SUPER ADMIN APPLICATIONS MANAGEMENT ====================

@api_view(['GET'])
@jwt_authenticated
def super_admin_get_applications(request):
    """الحصول على جميع طلبات التقديم"""
    try:
        user = request.user
        if not user.is_super_admin:
            return Response({'success': False, 'error': 'Access denied'}, status=403)

        status_filter = request.query_params.get('status', '')
        
        if status_filter:
            applications = Application.objects(status=status_filter).order_by('-applied_at')
        else:
            applications = Application.objects().order_by('-applied_at')
        
        result = []
        for app in applications:
            result.append({
                'id': str(app.id),
                'student_name': app.student.full_name if app.student else None,
                'student_email': app.student.user.email if app.student and app.student.user else None,
                'offer_title': app.offer.title if app.offer else None,
                'company_name': app.offer.company.company_name if app.offer and app.offer.company else None,
                'status': app.status,
                'applied_at': app.applied_at.strftime('%Y-%m-%d %H:%M:%S') if app.applied_at else None,
            })

        return Response({'success': True, 'applications': result})

    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


# ==================== SUPER ADMIN STATS ====================

@api_view(['GET'])
@jwt_authenticated
def super_admin_get_stats(request):
    """الحصول على إحصائيات مفصلة للنظام"""
    try:
        user = request.user
        if not user.is_super_admin:
            return Response({'success': False, 'error': 'Access denied'}, status=403)

        # إحصائيات المستخدمين
        users_by_role = {
            'student': User.objects(role='student').count(),
            'company': User.objects(role='company').count(),
            'admin': User.objects(role='admin').count(),
        }
        
        # إحصائيات التطبيقات حسب الحالة
        applications_by_status = {}
        for status in ['pending', 'accepted_by_company', 'rejected_by_company', 'validated_by_co_dept', 'rejected_by_co_dept']:
            applications_by_status[status] = Application.objects(status=status).count()
        
        # آخر 10 مستخدمين مسجلين
        recent_users = []
        for u in User.objects().order_by('-created_at').limit(10):
            recent_users.append({
                'id': str(u.id),
                'username': u.username,
                'email': u.email,
                'role': u.role,
                'created_at': u.created_at.strftime('%Y-%m-%d %H:%M:%S') if u.created_at else None
            })
        
        # آخر 10 طلبات
        recent_applications = []
        for app in Application.objects().order_by('-applied_at').limit(10):
            recent_applications.append({
                'id': str(app.id),
                'student_name': app.student.full_name if app.student else None,
                'offer_title': app.offer.title if app.offer else None,
                'status': app.status,
                'applied_at': app.applied_at.strftime('%Y-%m-%d %H:%M:%S') if app.applied_at else None
            })
        
        # آخ 5 أيام نشاط
        from datetime import timedelta
        daily_stats = []
        for i in range(5):
            date = datetime.now() - timedelta(days=i)
            date_start = datetime(date.year, date.month, date.day, 0, 0, 0)
            date_end = date_start + timedelta(days=1)
            
            new_users = User.objects(created_at__gte=date_start, created_at__lt=date_end).count()
            new_applications = Application.objects(applied_at__gte=date_start, applied_at__lt=date_end).count()
            
            daily_stats.append({
                'date': date.strftime('%Y-%m-%d'),
                'new_users': new_users,
                'new_applications': new_applications
            })

        return Response({
            'success': True,
            'stats': {
                'total_users': User.objects().count(),
                'users_by_role': users_by_role,
                'total_offers': InternshipOffer.objects().count(),
                'total_applications': Application.objects().count(),
                'applications_by_status': applications_by_status,
                'total_notifications': Notification.objects().count(),
                'total_companies': Company.objects().count(),
                'total_universities': Admin.objects().distinct('university').count(),
                'recent_users': recent_users,
                'recent_applications': recent_applications,
                'daily_stats': daily_stats
            }
        })

    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['POST'])
def verify_super_admin_otp(request):
    """التحقق من OTP لـ Super Admin"""
    try:
        email = request.data.get('email')
        code = request.data.get('code')

        if not email or not code:
            return Response({'success': False, 'error': 'Email and code required'}, status=400)

        temp_data, error = verify_otp_code(email, code)

        if error:
            return Response({'success': False, 'error': error, 'code_invalid': True}, status=400)

        if temp_data.get('action') != 'super_admin_login':
            return Response({'success': False, 'error': 'Invalid verification'}, status=400)

        user = User.objects(id=temp_data['user_id']).first()
        if not user or not user.is_super_admin:
            return Response({'success': False, 'error': 'User not found or not super admin'}, status=404)

        # تحديث آخر تسجيل دخول
        super_admin_obj = SuperAdmin.objects(user=user).first()
        if super_admin_obj:
            super_admin_obj.last_login = datetime.now()
            super_admin_obj.save()

        token = create_token(user)

        user_data = {
            'id': str(user.id),
            'username': user.username,
            'email': user.email,
            'role': 'super_admin',
            'sub_role': 'super_admin',
        }
        
        if super_admin_obj:
            user_data['full_name'] = super_admin_obj.full_name

        return Response({
            'success': True,
            'message': 'Login successful',
            'token': token,
            'user': user_data,
            'redirect_url': '/super-admin/dashboard'
        })

    except Exception as e:
        print(f"❌ Error in verify_super_admin_otp: {str(e)}")
        return Response({'success': False, 'error': str(e)}, status=500)