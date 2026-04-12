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

from .models import (
    User, Student, Company, Admin, InternshipOffer, Application, 
    OTPVerification, PendingApproval, Notification, ActivityLog
)
from .serializers import (
    StudentRegistrationSerializer,
    CompanyRegistrationSerializer,
    AdminRegistrationSerializer,
    InternshipOfferSerializer,
    ApplicationSerializer,
)
from .auth import create_token
from .otp_utils import create_otp_verification, send_otp_email, verify_otp_code
from .email_utils import (
    send_email, send_approval_email, send_rejection_email,
    send_proof_request_email, send_proof_received_confirmation,
    send_application_confirmation_student, send_application_notification_company,
    send_company_response_email, send_validation_pending_to_co_dept,
    send_convention_validated_email, send_convention_rejected_email
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

    token = create_token(user)
    redirect_urls = {
        'student': '/student/dashboard',
        'company': '/company/dashboard',
        'admin':   '/admin/dashboard',
    }
    user_data = {
        'id': str(user.id),
        'email': user.email,
        'role': user.role,
        'sub_role': user.sub_role,
    }
    if user.role == 'student':
        student = Student.objects(user=user).first()
        if student:
            user_data['full_name'] = student.full_name
            user_data['university'] = student.university  # 🔥 AJOUTE CETTE LIGNE
    elif user.role == 'company':
        company = Company.objects(user=user).first()
        if company:
            user_data['company_name'] = company.company_name
    elif user.role == 'admin':
        admin = Admin.objects(user=user).first()
        if admin:
            user_data['full_name'] = admin.full_name
            user_data['university'] = admin.university  # 🔥 AJOUTE CETTE LIGNE

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

        if role == 'student':
            serializer = StudentRegistrationSerializer(data=clean_data)
        elif role == 'company':
            serializer = CompanyRegistrationSerializer(data=clean_data)
        elif role == 'admin':
            serializer = AdminRegistrationSerializer(data=clean_data)
        else:
            return Response({'success': False, 'message': 'Invalid role'}, status=status.HTTP_400_BAD_REQUEST)

        if not serializer.is_valid():
            return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        email = data['email']

        if User.objects(email=email).first():
            return Response({'success': False, 'errors': {'email': ['Email already in use.']}},
                            status=status.HTTP_400_BAD_REQUEST)

        if role == 'student' and ('univ' not in email or '.dz' not in email):
            return Response({'success': False, 'errors': {'email': ['University email required.']}},
                            status=status.HTTP_400_BAD_REQUEST)

        if role == 'company' and data.get('sub_role') == 'hiring_manager':
            manager_email = data.get('company_manager_email')
            company_name = data.get('company_name_for_hiring')
            manager_user = User.objects(
                email=manager_email,
                role='company',
                sub_role='company_manager',
                status=True
            ).first()
            if not manager_user:
                return Response({'success': False, 'errors': {'company_manager_email': ['No approved company manager found.']}},
                                status=status.HTTP_400_BAD_REQUEST)
            manager_company = Company.objects(user=manager_user).first()
            if not manager_company:
                return Response({'success': False, 'errors': {'company_manager_email': ['Company profile not found.']}},
                                status=status.HTTP_400_BAD_REQUEST)
            if manager_company.company_name.lower() != company_name.lower():
                return Response({'success': False,
                                 'errors': {'company_name_for_hiring': ['Company name does not match manager\'s company.']}},
                                status=status.HTTP_400_BAD_REQUEST)

        if role == 'admin' and data.get('sub_role') == 'co_dept_head':
            dept_head_email = data.get('dept_head_email')
            university_name = data.get('university_for_verification')
            dept_head_user = User.objects(
                email=dept_head_email,
                role='admin',
                sub_role='admin',
                status=True
            ).first()
            if not dept_head_user:
                return Response({'success': False, 'errors': {'dept_head_email': ['No approved department head found.']}},
                                status=status.HTTP_400_BAD_REQUEST)
            dept_head_admin = Admin.objects(user=dept_head_user).first()
            if not dept_head_admin:
                return Response({'success': False, 'errors': {'dept_head_email': ['Admin profile not found.']}},
                                status=status.HTTP_400_BAD_REQUEST)
            if dept_head_admin.university.lower() != university_name.lower():
                return Response({'success': False,
                                 'errors': {'university_for_verification': ['University name does not match.']}},
                                status=status.HTTP_400_BAD_REQUEST)

        temp_data = {'role': role, 'data': data}
        code = create_otp_verification(email, temp_data)
        
        
        print("\n" + "="*60)
        print(f" CODE DE VÉRIFICATION POUR {email} : {code}")
        print("="*60 + "\n")
        
        
        try:
            email_sent = send_otp_email(email, code, "inscription")
        except Exception as e:
            print(f" Erreur lors de l'envoi de l'email: {e}")
            email_sent = False
        
        if not email_sent:
            
            print(" L'envoi d'email a échoué, mais le code est affiché ci-dessus.")
        
        return Response({'success': True, 'message': 'Verification code sent', 'email': email})

    except Exception as e:
        traceback.print_exc()
        return Response({'success': False, 'message': f'Erreur interne: {str(e)}'}, status=500)


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
    serializer = InternshipOfferSerializer(offers, many=True)
    return Response({'success': True, 'offers': serializer.data})


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

    send_application_confirmation_student(student.user.email, student.full_name, offer.title)
    company = offer.company
    if company and company.user:
        send_application_notification_company(company.user.email, offer.title, student.full_name)

    return Response({
        'success': True,
        'message': 'Your application has been successfully submitted',
        'application_id': str(application.id)
    }, status=201)




@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['company'])
def company_dashboard(request):
    return Response({'message': 'Company dashboard', 'success': True})


@api_view(['POST'])
@jwt_authenticated
@role_required(allowed_roles=['company'])
def respond_to_candidate(request, application_id):
    return Response({'message': f'Respond to candidate {application_id}', 'success': True})




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
        } for o in offers]
    })


@api_view(['POST'])
@jwt_authenticated
@role_required(allowed_roles=['company'])
def create_offer(request):
    company = _get_user_company(request.user)
    if not company:
        return Response({'success': False, 'message': 'Company profile not found.'}, status=404)

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
    )
    offer.save()

    # LOG ACTIVITY - Create Offer
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
        }
    }, status=201)


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
        }
    })


@api_view(['PUT', 'PATCH'])
@jwt_authenticated
@role_required(allowed_roles=['company'])
def update_offer(request, offer_id):
    company = _get_user_company(request.user)
    if not company:
        return Response({'success': False, 'message': 'Company profile not found.'}, status=404)

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

    offer.save()

    # LOG ACTIVITY - Update Offer
    log_activity(
        user=request.user,
        action_type='update_offer',
        target_type='offer',
        target_id=str(offer.id),
        target_name=offer.title,
        details={'updated_fields': list(request.data.keys())}
    )

    return Response({'success': True, 'message': 'Offer updated successfully.'})


@api_view(['DELETE'])
@jwt_authenticated
@role_required(allowed_roles=['company'])
def delete_offer(request, offer_id):
    company = _get_user_company(request.user)
    if not company:
        return Response({'success': False, 'message': 'Company profile not found.'}, status=404)

    try:
        offer = InternshipOffer.objects(id=offer_id, company=company).first()
    except Exception:
        return Response({'success': False, 'message': 'Invalid offer ID.'}, status=400)

    if not offer:
        return Response({'success': False, 'message': 'Offer not found or does not belong to your company.'}, status=404)

    title = offer.title
    offer.delete()

    # LOG ACTIVITY - Delete Offer
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
    
    # LOG ACTIVITY - Approve Hiring Manager
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

    # Récupérer l'email avant suppression
    hiring_user_email = hiring_user.email
    hiring_user_username = hiring_user.username
    
    # Supprimer l'utilisateur
    hiring_user.delete()
    
    # LOG ACTIVITY - Reject Hiring Manager
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

    # LOG ACTIVITY - Approve Co Dept Head
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

    # Récupérer l'email avant suppression
    co_dept_email = co_dept.email
    co_dept_username = co_dept.username
    
    # Supprimer le profil Admin associé s'il existe
    admin_profile = Admin.objects(user=co_dept).first()
    if admin_profile:
        admin_profile.delete()
    
    # Supprimer l'utilisateur
    co_dept.delete()
    
    # LOG ACTIVITY - Reject Co Dept Head
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
    serializer = ApplicationSerializer(applications, many=True)
    return Response({'success': True, 'applications': serializer.data})


@api_view(['POST'])
@jwt_authenticated
@role_required(allowed_roles=['company'])
def respond_to_application(request, application_id):
    company = _get_user_company(request.user)
    if not company:
        return Response({'error': 'Company not found'}, status=404)

    try:
        app = Application.objects(id=application_id).first()
        if not app:
            return Response({'error': 'Application not found'}, status=404)
        
        if str(app.offer.company.id) != str(company.id):
            return Response({'error': 'Unauthorized'}, status=403)

        new_status = request.data.get('status')
        if new_status not in ['accepted', 'rejected']:
            return Response({'error': 'Status must be "accepted" or "rejected"'}, status=400)

        if new_status == 'rejected':
            reason = request.data.get('rejection_reason', '').strip()
            if not reason:
                return Response({'error': 'A rejection reason is required.'}, status=400)
            app.company_notes = reason
            app.status = 'rejected_by_company'
            
            # LOG ACTIVITY - Reject Application
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
        else:
            app.company_notes = request.data.get('notes', '')
            app.status = 'accepted_by_company'
            app.company_response_date = datetime.now()
            
            # LOG ACTIVITY - Accept Application
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

        app.save()

        send_company_response_email(app.student.user.email, app.offer.title, new_status)

        if new_status == 'accepted':
            student = app.student
            student_university = student.university
            
            print(f" Recherche d'admin pour l'université: {student_university}")
            
            dept_head_admins = Admin.objects(university=student_university)
            admin_list = []
            
            for admin in dept_head_admins:
                if admin.user and admin.user.role == 'admin' and admin.user.sub_role == 'admin' and admin.user.status:
                    admin_list.append(admin)
                    print(f" Department Head trouvé: {admin.full_name} ({admin.user.email})")
            
            if not admin_list:
                for admin in dept_head_admins:
                    if admin.user and admin.user.role == 'admin' and admin.user.sub_role == 'co_dept_head' and admin.user.status:
                        admin_list.append(admin)
                        print(f" Co Department Head trouvé: {admin.full_name} ({admin.user.email})")
            
            for admin in admin_list:
                admin_user = admin.user
                if admin_user and admin_user.email:
                    send_validation_pending_to_co_dept(
                        co_dept_email=admin_user.email,
                        co_dept_name=admin.full_name,
                        student_name=student.full_name,
                        company_name=company.company_name,
                        offer_title=app.offer.title,
                        application_id=str(app.id)
                    )
                    
                    Notification.objects.create(
                        recipient=admin_user,
                        message=f" Nouvelle convention à valider : {student.full_name} - {app.offer.title}",
                        related_id=str(app.id)
                    )
                    print(f" Notification envoyée à {admin_user.email}")
            
            if not admin_list:
                print(f" AUCUN admin trouvé pour l'université: {student_university}")
            
            Notification.objects.create(
                recipient=app.student.user,
                message=f" Votre candidature pour '{app.offer.title}' a été acceptée par {company.company_name}. En attente de validation par votre université.",
                related_id=str(app.id)
            )
        
        else:
            Notification.objects.create(
                recipient=app.student.user,
                message=f" Votre candidature pour '{app.offer.title}' a été refusée par {company.company_name}.",
                related_id=str(app.id)
            )

        return Response({'success': True, 'message': f'Application {new_status} successfully.'})

    except Exception as e:
        print(f" Erreur: {str(e)}")
        traceback.print_exc()
        return Response({'error': str(e)}, status=500)


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
@role_required(allowed_roles=['student'])
def download_application_cv_student(request, application_id):
    student = Student.objects(user=request.user).first()
    if not student:
        return Response({'error': 'Student profile not found'}, status=404)
    try:
        app = Application.objects(id=application_id).first()
        if not app:
            return Response({'error': 'Application not found'}, status=404)
        if str(app.student.id) != str(student.id):
            return Response({'error': 'Unauthorized'}, status=403)
        if not app.cv_file:
            return Response({'error': 'No CV file attached'}, status=404)
        response = HttpResponse(app.cv_file.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="cv_{application_id}.pdf"'
        return response
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
def list_companies(request):
    companies = []
    for company in Company.objects(verified=True):
        active_offers = InternshipOffer.objects(company=company, is_active=True, deadline__gte=datetime.now()).count()
        if active_offers > 0:
            companies.append({
                'id': str(company.id),
                'company_name': company.company_name,
                'description': company.description,
                'sector': company.industry,
                'logo': company.logo.url if company.logo else None,
                'students_applied': sum(Application.objects(offer__company=company).count())
            })
    return Response(companies)


@api_view(['GET'])
def public_offers(request):
    today_start = timezone.make_aware(datetime.combine(timezone.now().date(), datetime.min.time()))
    offers = InternshipOffer.objects(is_active=True, deadline__gte=today_start).order_by('-created_at')[:6]
    serializer = InternshipOfferSerializer(offers, many=True)
    return Response({'success': True, 'offers': serializer.data})




@api_view(['POST'])
@jwt_authenticated
@role_required(allowed_roles=['student'])
def generate_custom_cv(request):
    data = request.data
    student = Student.objects(user=request.user).first()
    if not student:
        return Response({'error': 'Student profile not found'}, status=404)

    full_name = data.get('full_name', student.full_name)
    email = data.get('email', request.user.email)
    university = data.get('university', student.university)
    major = data.get('major', student.major)
    education_level = data.get('education_level', student.education_level)
    graduation_year = data.get('graduation_year', student.graduation_year)
    skills = data.get('skills', student.skills)
    objective = data.get('objective', '')
    experience = data.get('experience', [])
    languages = data.get('languages', [])
    wilaya = student.wilaya

    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{full_name}_CV.pdf"'
    
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_LEFT

    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle('CustomTitle', parent=styles['Title'], fontName='Helvetica-Bold', fontSize=24, alignment=TA_CENTER, textColor=colors.HexColor('#2c3e50'), spaceAfter=12)
    contact_style = ParagraphStyle('Contact', parent=styles['Normal'], fontName='Helvetica', fontSize=9, textColor=colors.HexColor('#7f8c8d'), alignment=TA_CENTER, spaceAfter=12)
    heading_style = ParagraphStyle('CustomHeading', parent=styles['Heading2'], fontName='Helvetica-Bold', fontSize=14, textColor=colors.HexColor('#2980b9'), spaceBefore=12, spaceAfter=6)
    body_style = ParagraphStyle('Body', parent=styles['Normal'], fontName='Helvetica', fontSize=10, leading=14, alignment=TA_LEFT, spaceAfter=4)
    subheading_style = ParagraphStyle('Subheading', parent=body_style, fontName='Helvetica-Bold', fontSize=10, spaceAfter=2)
    
    doc = SimpleDocTemplate(response, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    story = []

    logo_path = os.path.join(settings.BASE_DIR, 'media', 'logo.png')
    if os.path.exists(logo_path):
        img = Image(logo_path, width=2*cm, height=2*cm)
        img.hAlign = 'CENTER'
        story.append(img)
        story.append(Spacer(1, 0.2*cm))

    story.append(Paragraph(full_name, title_style))
    
    contact_parts = [email]
    if wilaya:
        contact_parts.append(wilaya)
    contact_text = " | ".join(contact_parts)
    story.append(Paragraph(contact_text, contact_style))
    story.append(Spacer(1, 0.5*cm))

    if objective:
        story.append(Paragraph("OBJECTIF", heading_style))
        story.append(Paragraph(objective, body_style))
        story.append(Spacer(1, 0.3*cm))

    story.append(Paragraph("FORMATION", heading_style))
    edu_text = f"{education_level} en {major}<br/>{university} | Diplômé(e) en {graduation_year}"
    story.append(Paragraph(edu_text, body_style))
    story.append(Spacer(1, 0.3*cm))

    if skills:
        story.append(Paragraph("COMPÉTENCES", heading_style))
        story.append(Paragraph(", ".join(skills), body_style))
        story.append(Spacer(1, 0.3*cm))

    if languages:
        story.append(Paragraph("LANGUES", heading_style))
        lang_data = [['Langue', 'Niveau']] + [[lang.get('name', ''), lang.get('level', '')] for lang in languages]
        lang_table = Table(lang_data, colWidths=[6*cm, 6*cm])
        lang_table.setStyle(TableStyle([
            ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
            ('FONTSIZE', (0,0), (-1,-1), 9),
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#ecf0f1')),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#bdc3c7')),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        story.append(lang_table)
        story.append(Spacer(1, 0.3*cm))

    if experience:
        story.append(Paragraph("EXPÉRIENCES", heading_style))
        for exp in experience:
            title = exp.get('title', '')
            company_name = exp.get('company', '')
            dates = exp.get('dates', '')
            desc = exp.get('description', '')
            
            exp_data = [
                [Paragraph(f"<b>{title}</b>", subheading_style), Paragraph(dates, body_style)],
                [Paragraph(company_name, body_style), ''],
                [Paragraph(desc, body_style), ''],
            ]
            exp_table = Table(exp_data, colWidths=[9*cm, 3*cm])
            exp_table.setStyle(TableStyle([
                ('ALIGN', (1,0), (1,0), 'RIGHT'),
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
                ('FONTSIZE', (0,0), (-1,-1), 9),
                ('LEFTPADDING', (0,0), (-1,-1), 0),
                ('RIGHTPADDING', (0,0), (-1,-1), 0),
                ('TOPPADDING', (0,0), (-1,-1), 2),
                ('BOTTOMPADDING', (0,0), (-1,-1), 2),
            ]))
            story.append(exp_table)
            story.append(Spacer(1, 0.2*cm))
        story.append(Spacer(1, 0.3*cm))

    doc.build(story)
    return response





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




# ==================== CO DEPT HEAD ENDPOINTS ====================

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
        # Vérifier les permissions
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
        
        # LOG ACTIVITY - Validate Convention
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
            message=f"✅ Félicitations ! Votre stage '{application.offer.title}' a été validé par {co_dept.full_name}. Votre convention de stage est disponible.",
            related_id=str(application.id)
        )
        Notification.objects.create(
            recipient=application.offer.company.user,
            message=f"✅ La candidature de {application.student.full_name} pour '{application.offer.title}' a été validée par l'université {co_dept.university}.",
            related_id=str(application.id)
        )
        
        return Response({
            'success': True,
            'message': 'Candidature validée et convention générée',
            'convention_url': f'/api/co-dept/download-convention/{application.id}/'
        })
        
    except Exception as e:
        print(f"❌ Erreur: {str(e)}")
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['POST'])
@jwt_authenticated
@role_required(allowed_roles=['admin'], allowed_sub_roles=['co_dept_head'])
def co_dept_reject_application(request, application_id):
    try:
        # Vérifier les permissions
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
        
        # LOG ACTIVITY - Reject Convention
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
            message=f"❌ Votre stage '{application.offer.title}' a été refusé par {co_dept.full_name}. Motif: {rejection_reason[:100]}...",
            related_id=str(application.id)
        )
        Notification.objects.create(
            recipient=application.offer.company.user,
            message=f"❌ La candidature de {application.student.full_name} pour '{application.offer.title}' a été refusée par l'université.",
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
        
        # LOG ACTIVITY - Validate Convention (Dept Head validating Co Dept Head's work)
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
        
        # LOG ACTIVITY - Reject Convention (Dept Head)
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


# ==================== ACTIVITY LOGS ENDPOINTS ====================

@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['company'], allowed_sub_roles=['company_manager'])
def get_company_activity_logs(request):
    """
    Company Manager consulte l'activité des Hiring Managers de son entreprise
    """
    try:
        company = Company.objects(user=request.user).first()
        if not company:
            return Response({'success': False, 'error': 'Company not found'}, status=404)
        
        # Récupérer tous les hiring managers de cette entreprise
        hiring_managers = User.objects(
            role='company',
            sub_role='hiring_manager',
            status=True,
            pending_company_id=str(company.id)
        )
        hiring_manager_ids = [str(hm.id) for hm in hiring_managers]
        
        # Ajouter le company manager lui-même
        hiring_manager_ids.append(str(request.user.id))
        
        # Récupérer les logs des actions des hiring managers
        logs = ActivityLog.objects(
            user_id__in=hiring_manager_ids,
            action_type__in=[
                'create_offer', 'update_offer', 'delete_offer',
                'accept_application', 'reject_application',
                'approve_hiring_manager', 'reject_hiring_manager'
            ]
        ).order_by('-created_at')
        
        # Filtrer par date si spécifié
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
        
        # Formatage des logs
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
        
        # Statistiques
        stats = {
            'total_actions': logs.count(),
            'by_type': {},
            'last_7_days': logs.filter(created_at__gte=datetime.now() - timedelta(days=7)).count(),
            'top_actors': {}
        }
        
        # Compter par type d'action
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
    """
    Department Head consulte l'activité des Co Dept Heads de son université
    """
    try:
        dept_head = Admin.objects(user=request.user).first()
        if not dept_head:
            return Response({'success': False, 'error': 'Admin profile not found'}, status=404)
        
        # Récupérer TOUS les admins (Co Dept Heads) de la même université
        co_dept_admins = Admin.objects(university=dept_head.university)
        
        # Filtrer ceux qui ont le rôle co_dept_head
        co_dept_ids = []
        for admin in co_dept_admins:
            if admin.user and admin.user.role == 'admin' and admin.user.sub_role == 'co_dept_head':
                co_dept_ids.append(str(admin.user.id))
        
        # Ajouter le dept head lui-même
        co_dept_ids.append(str(request.user.id))
        
        # Récupérer TOUS les logs
        logs = ActivityLog.objects(
            user_id__in=co_dept_ids
        ).order_by('-created_at')
        
        # Filtres optionnels
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
        
        # Statistiques
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
    """
    Vérifie si l'utilisateur existe toujours dans la base de données
    """
    try:
        user = User.objects(id=str(request.user.id)).first()
        return Response({'exists': user is not None})
    except Exception as e:
        return Response({'exists': False, 'error': str(e)})


def generate_internship_agreement_pdf(application, admin_user):
    """Génère une convention de stage avec signature et cachet importé"""
    from reportlab.lib.pagesizes import A4
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.lib import colors
    from django.core.files.base import ContentFile
    from io import BytesIO
    import base64
    import io
    
    buffer = BytesIO()
    
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=2*cm, bottomMargin=2*cm, leftMargin=2*cm, rightMargin=2*cm)
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle('CustomTitle', parent=styles['Title'], fontSize=16, alignment=1, spaceAfter=20, fontName='Helvetica-Bold')
    heading_style = ParagraphStyle('CustomHeading', parent=styles['Heading2'], fontSize=12, alignment=0, spaceBefore=12, spaceAfter=6, fontName='Helvetica-Bold')
    normal_style = ParagraphStyle('CustomNormal', parent=styles['Normal'], fontSize=10, alignment=0, spaceAfter=4, leading=14)
    bold_style = ParagraphStyle('BoldNormal', parent=normal_style, fontName='Helvetica-Bold')
    
    story = []
    
    today = datetime.now().strftime('%d/%m/%Y')
    
    story.append(Paragraph("CONVENTION DE STAGE", title_style))
    story.append(Spacer(1, 0.5*cm))
    
    story.append(Paragraph("ENTRE", bold_style))
    story.append(Spacer(1, 0.3*cm))
    
    company = application.offer.company
    story.append(Paragraph(f"<b>L'entreprise (nom et adresse)</b><br/>{company.company_name}<br/>{company.location}<br/>Tel: {getattr(company, 'phone', 'Non renseigné')}<br/>Fax: ...", normal_style))
    story.append(Spacer(1, 0.3*cm))
    
    story.append(Paragraph(f"<b>L'UNIVERSITE DE {application.student.university.upper()}</b><br/>{application.student.university}<br/>Representee par: {admin_user.full_name}<br/>Tel/Fax: 021 30 31 82", normal_style))
    story.append(Spacer(1, 0.3*cm))
    
    story.append(Paragraph("ET", bold_style))
    story.append(Spacer(1, 0.3*cm))
    
    story.append(Paragraph(f"<b>Monsieur/Madame :</b> {application.student.full_name}", normal_style))
    story.append(Spacer(1, 0.5*cm))
    
    story.append(Paragraph("DONNEES RELATIVES A L'ETUDIANT", heading_style))
    story.append(Spacer(1, 0.3*cm))
    
    student_data = [
        ["Nom et prenom:", application.student.full_name],
        ["Faculte:", application.student.major.split()[0] if application.student.major else "Informatique"],
        ["Departement:", application.student.major.split()[0] if application.student.major else "Informatique"],
        ["Carte d'etudiant n°:", str(application.student.user.id)[-8:]],
        ["N° Securite Sociale:", "Non renseigné"],
        ["Tel:", application.student.user.email],
        ["Diplome prepare:", application.student.education_level],
        ["Theme du stage:", application.offer.title],
        ["Responsable pedagogique:", admin_user.full_name],
        ["Duree du stage:", application.offer.duration],
        ["Date de debut du stage:", application.offer.start_date.strftime('%d/%m/%Y') if application.offer.start_date else "À déterminer"],
        ["Date de fin du stage:", "À déterminer"],
    ]
    
    student_table = Table(student_data, colWidths=[5*cm, 11*cm])
    student_table.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 2),
        ('RIGHTPADDING', (0,0), (-1,-1), 2),
        ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.black),
    ]))
    story.append(student_table)
    story.append(Spacer(1, 0.5*cm))
    
    story.append(Paragraph("Etablie en 02 exemplaires originaux: 1 exemplaire pour l'universite et 01 exemplaire pour l'entreprise", normal_style))
    story.append(Spacer(1, 0.5*cm))
    
    story.append(Paragraph(f"Fait a Constantine le: {today}", normal_style))
    story.append(Spacer(1, 1*cm))
    
    story.append(Paragraph("Signatures et Cachet:", heading_style))
    story.append(Spacer(1, 0.3*cm))
    
    # Charger la signature
    signature_img = None
    stamp_img = None
    
    if application.university_signature:
        try:
            sig_data = application.university_signature
            if ',' in sig_data:
                sig_data = sig_data.split(',')[1]
            img_data = base64.b64decode(sig_data)
            img_io = io.BytesIO(img_data)
            signature_img = Image(img_io, width=4*cm, height=1.5*cm)
        except Exception as e:
            print(f"Erreur chargement signature: {e}")
    
    # Charger le cachet importé
    if application.university_stamp:
        try:
            stamp_data = application.university_stamp
            if ',' in stamp_data:
                stamp_data = stamp_data.split(',')[1]
            stamp_img_data = base64.b64decode(stamp_data)
            stamp_io = io.BytesIO(stamp_img_data)
            stamp_img = Image(stamp_io, width=3*cm, height=3*cm)
        except Exception as e:
            print(f"Erreur chargement cachet: {e}")
    
    signature_data = [
        ["", "", "", ""],
        ["<b>Visa du chef de departement:</b>", "<b>Pour l'entreprise</b>", "<b>Pour l'universite</b>", "<b>Cachet de l'universite</b>"],
        ["", "", "", ""],
        ["", "", "", ""],
    ]
    
    # Remplir les cellules
    if signature_img:
        signature_data[3][2] = signature_img
    else:
        signature_data[3][2] = Paragraph("Signature :", normal_style)
    
    if stamp_img:
        signature_data[3][3] = stamp_img
    else:
        signature_data[3][3] = Paragraph("Cachet :", normal_style)
    
    signature_table = Table(signature_data, colWidths=[3.5*cm, 3.5*cm, 3.5*cm, 3.5*cm])
    signature_table.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 0.5, colors.black),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('FONTNAME', (0,1), (-1,1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('BACKGROUND', (0,1), (-1,1), colors.HexColor('#f0f0f0')),
    ]))
    story.append(signature_table)
    
    doc.build(story)
    
    pdf_content = ContentFile(buffer.getvalue())
    pdf_content.name = f"convention_{application.student.full_name}_{application.offer.company.company_name}.pdf"
    return pdf_content


@api_view(['POST'])
@jwt_authenticated
@role_required(allowed_roles=['admin'], allowed_sub_roles=['admin', 'co_dept_head'])
def add_university_signature(request, application_id):
    """
    Department Head ou Co Department Head - Ajoute la signature de l'université
    """
    try:
        # 🔥 AJOUT DE LA VÉRIFICATION DES PERMISSIONS POUR LA SIGNATURE
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
        
        # RÉGÉNÉRER LE PDF AVEC LA SIGNATURE
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
    """
    Génère une convention de stage en utilisant le template fourni
    avec les informations de l'étudiant, l'entreprise et l'université
    """
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
        
        # LOG ACTIVITY - Generate Convention from template
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
    """Génère une convention de stage en utilisant le template avec signatures"""
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
    
    # Charger les signatures
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


# ==================== PERMISSIONS MANAGEMENT ENDPOINTS ====================

@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['company'], allowed_sub_roles=['company_manager'])
def get_hiring_managers_list(request):
    """
    Company Manager - Liste des hiring managers avec leurs permissions
    """
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
                    'can_create_offer': permissions.can_create_offer if permissions else True,
                    'can_modify_offer': permissions.can_modify_offer if permissions else True,
                    'can_delete_offer': permissions.can_delete_offer if permissions else True,
                }
            })
        
        return Response({'success': True, 'hiring_managers': result})
        
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)


@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['admin'], allowed_sub_roles=['admin'])
def get_co_dept_heads_list(request):
    """
    Department Head - Liste des co dept heads avec leurs permissions
    """
    try:
        dept_head = Admin.objects(user=request.user).first()
        if not dept_head:
            return Response({'success': False, 'error': 'Admin profile not found'}, status=404)
        
        # Récupérer TOUS les co dept heads de la même université
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
                        'can_add_stamp': permissions.can_add_stamp if permissions else True,  # 🔥 AJOUTER CETTE LIGNE
                        'can_manage_university_profile': permissions.can_manage_university_profile if permissions else False,
                    }
                })
        
        return Response({'success': True, 'co_dept_heads': result})
        
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)
# ==================== UPDATE PERMISSIONS ENDPOINTS ====================

@api_view(['PUT'])
@jwt_authenticated
def update_hiring_manager_permissions(request, user_id):
    """
    Company Manager - Met à jour les permissions d'un hiring manager
    """
    try:
        # Vérifier que l'utilisateur actuel est company manager
        if request.user.role != 'company' or request.user.sub_role != 'company_manager':
            return Response({'success': False, 'error': 'Unauthorized'}, status=403)
        
        company = Company.objects(user=request.user).first()
        if not company:
            return Response({'success': False, 'error': 'Company not found'}, status=404)
        
        # Vérifier que le hiring manager appartient à cette entreprise
        hiring_manager = User.objects(id=user_id, role='company', sub_role='hiring_manager').first()
        if not hiring_manager or hiring_manager.pending_company_id != str(company.id):
            return Response({'success': False, 'error': 'Hiring manager not found'}, status=404)
        
        # Mettre à jour les permissions
        permissions_data = {
            'can_manage_applications': request.data.get('can_manage_applications', True),
            'can_manage_hiring_managers': request.data.get('can_manage_hiring_managers', False),
            'can_create_offer': request.data.get('can_create_offer', True),
            'can_modify_offer': request.data.get('can_modify_offer', True),
            'can_delete_offer': request.data.get('can_delete_offer', True),
            'can_manage_company_profile': request.data.get('can_manage_company_profile', False),
        }
        
        update_user_permissions(user_id, permissions_data)
        
        # Log l'activité
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
    """
    Department Head - Met à jour les permissions d'un co dept head
    """
    try:
        # Vérifier que l'utilisateur actuel est department head
        if request.user.role != 'admin' or request.user.sub_role != 'admin':
            return Response({'success': False, 'error': 'Unauthorized'}, status=403)
        
        dept_head = Admin.objects(user=request.user).first()
        if not dept_head:
            return Response({'success': False, 'error': 'Admin profile not found'}, status=404)
        
        # Chercher le co dept head
        co_dept = User.objects(id=user_id, role='admin', sub_role='co_dept_head').first()
        if not co_dept:
            return Response({'success': False, 'error': 'Co Dept Head not found'}, status=404)
        
        # Vérifier par université
        co_dept_admin = Admin.objects(user=co_dept).first()
        if not co_dept_admin:
            return Response({'success': False, 'error': 'Co Dept Head admin profile not found'}, status=404)
        
        if co_dept_admin.university != dept_head.university:
            return Response({'success': False, 'error': f'Unauthorized - Different university'}, status=403)
        
        # Mettre à jour les permissions
        permissions_data = {
            'can_manage_conventions': request.data.get('can_manage_conventions', True),
            'can_manage_co_dept_heads': request.data.get('can_manage_co_dept_heads', False),
            'can_add_signature': request.data.get('can_add_signature', True),
            'can_add_stamp': request.data.get('can_add_stamp', True),  # 🔥 AJOUTER CETTE LIGNE
            'can_manage_university_profile': request.data.get('can_manage_university_profile', False),
        }
        
        update_user_permissions(user_id, permissions_data)
        
        # Log l'activité
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
# ==================== DELETE ENDPOINTS ====================

@api_view(['DELETE'])
@jwt_authenticated
def delete_hiring_manager(request, user_id):
    """
    Company Manager - Supprime un hiring manager
    """
    try:
        if request.user.role != 'company' or request.user.sub_role != 'company_manager':
            return Response({'success': False, 'error': 'Unauthorized'}, status=403)
        
        company = Company.objects(user=request.user).first()
        if not company:
            return Response({'success': False, 'error': 'Company not found'}, status=404)
        
        hiring_manager = User.objects(id=user_id, role='company', sub_role='hiring_manager').first()
        if not hiring_manager or hiring_manager.pending_company_id != str(company.id):
            return Response({'success': False, 'error': 'Hiring manager not found'}, status=404)
        
        # Supprimer les permissions
        UserPermission.objects(user_id=user_id).delete()
        
        # Supprimer l'utilisateur
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
    """
    Department Head - Supprime un co dept head
    """
    try:
        if request.user.role != 'admin' or request.user.sub_role != 'admin':
            return Response({'success': False, 'error': 'Unauthorized'}, status=403)
        
        dept_head = Admin.objects(user=request.user).first()
        if not dept_head:
            return Response({'success': False, 'error': 'Admin profile not found'}, status=404)
        
        co_dept = User.objects(id=user_id, role='admin', sub_role='co_dept_head').first()
        if not co_dept or co_dept.pending_admin_id != str(request.user.id):
            return Response({'success': False, 'error': 'Co Dept Head not found'}, status=404)
        
        # Supprimer le profil Admin associé
        admin_profile = Admin.objects(user=co_dept).first()
        if admin_profile:
            admin_profile.delete()
        
        # Supprimer les permissions
        UserPermission.objects(user_id=user_id).delete()
        
        # Supprimer l'utilisateur
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


# ==================== APPROVED LISTS ENDPOINTS ====================

@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['company'], allowed_sub_roles=['company_manager'])
def get_approved_hiring_managers(request):
    """
    Company Manager - Liste des hiring managers APPROUVÉS (status=True)
    """
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
    """
    Department Head - Liste des co dept heads APPROUVÉS (status=True)
    """
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
        
        # Si aucun trouvé, chercher par université
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
                    'can_manage_co_dept_heads': permissions.can_manage_co_dept_heads if permissions else False,
                    'can_add_signature': permissions.can_add_signature if permissions else True,
                    'can_add_stamp': permissions.can_add_stamp if permissions else True,  # 🔥 AJOUTER CETTE LIGNE
                    'can_manage_university_profile': permissions.can_manage_university_profile if permissions else False,
                }
            })
        
        return Response({'success': True, 'co_dept_heads': result})
        
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=500)

# ==================== STUDENT MANAGEMENT ENDPOINTS ====================

@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['admin'], allowed_sub_roles=['admin', 'co_dept_head'])
def get_university_students(request):
    """
    Department Head ou Co Department Head - Liste des étudiants de l'université
    """
    try:
        admin_profile = Admin.objects(user=request.user).first()
        if not admin_profile:
            return Response({'success': False, 'error': 'Admin profile not found'}, status=404)
        
        university = admin_profile.university
        students = Student.objects(university=university)
        
        # Filtres
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
    """
    Department Head ou Co Department Head - Détails d'un étudiant
    """
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
    """
    Department Head ou Co Department Head - Statistiques de l'université
    """
    try:
        admin_profile = Admin.objects(user=request.user).first()
        if not admin_profile:
            return Response({'success': False, 'error': 'Admin profile not found'}, status=404)
        
        university = admin_profile.university
        
        total_students = Student.objects(university=university).count()
        placed_students = Student.objects(university=university, is_placed=True).count()
        
        # Statistiques par filière
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
        
        # Statistiques par année
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
        
        # Top compétences
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
    """
    Department Head ou Co Department Head - Statistiques détaillées de placement
    """
    try:
        admin_profile = Admin.objects(user=request.user).first()
        if not admin_profile:
            return Response({'success': False, 'error': 'Admin profile not found'}, status=404)
        
        university = admin_profile.university
        
        total_students = Student.objects(university=university).count()
        placed_students = Student.objects(university=university, is_placed=True).count()
        unplaced_students = total_students - placed_students
        placement_rate = round((placed_students / total_students * 100), 1) if total_students > 0 else 0
        
        # Statistiques par filière
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
        
        # Statistiques par année
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
        
        # Top compétences
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


# ==================== SIGNATURE MANAGEMENT ENDPOINTS ====================

@api_view(['POST'])
@jwt_authenticated
@role_required(allowed_roles=['company'])
def add_company_signature(request, application_id):
    """
    Company - Ajoute la signature de l'entreprise à la convention
    """
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
    """
    Student - Ajoute la signature de l'étudiant à la convention
    """
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
    """
    Récupère le statut des signatures d'une convention
    """
    try:
        application = Application.objects(id=application_id).first()
        if not application:
            return Response({'success': False, 'error': 'Application not found'}, status=404)
        
        # Vérifier les permissions
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
    """Department Head - Récupère les conventions déjà validées (prêtes à signer)"""
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


@api_view(['POST'])
@jwt_authenticated
@role_required(allowed_roles=['admin'], allowed_sub_roles=['admin', 'co_dept_head'])
def add_university_stamp(request, application_id):
    """
    Department Head ou Co Department Head - Ajoute le cachet de l'université
    """
    try:
        # Vérifier les permissions pour ajouter le cachet
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
        
        # 🔥 RÉGÉNÉRER LE PDF AVEC LE CACHET (même si signature pas encore ajoutée)
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
    """
    Récupère le statut du cachet d'une convention
    """
    try:
        application = Application.objects(id=application_id).first()
        if not application:
            return Response({'success': False, 'error': 'Application not found'}, status=404)
        
        # Vérifier les permissions
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
    """
    Récupère la liste des utilisateurs (admins et co dept heads) de la même université
    avec leur statut en ligne/hors ligne
    """
    try:
        admin_profile = Admin.objects(user=request.user).first()
        if not admin_profile:
            return Response({'success': False, 'error': 'Admin profile not found'}, status=404)
        
        university = admin_profile.university
        
        # Récupérer tous les admins (Department Heads) de la même université
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
    
    # backend/api/views.py - AJOUTER CET ENDPOINT

@api_view(['GET'])
@jwt_authenticated
def get_current_user(request):
    """
    Récupère les informations de l'utilisateur connecté
    """
    try:
        user = request.user
        user_data = {
            'id': str(user.id),
            'username': user.username,
            'email': user.email,
            'role': user.role,
            'sub_role': user.sub_role,
            'status': user.status,
        }
        
        # Ajouter les permissions si elles existent
        permissions = get_user_permissions(user)
        if permissions:
            user_data['permissions'] = {
                'can_manage_conventions': permissions.can_manage_conventions,
                'can_manage_co_dept_heads': permissions.can_manage_co_dept_heads,
                'can_add_signature': permissions.can_add_signature,
                'can_add_stamp': permissions.can_add_stamp if hasattr(permissions, 'can_add_stamp') else True,
                'can_manage_university_profile': permissions.can_manage_university_profile,
            }
        
        # Ajouter les infos spécifiques selon le rôle
        if user.role == 'student':
            student = Student.objects(user=user).first()
            if student:
                user_data['full_name'] = student.full_name
                user_data['university'] = student.university
        elif user.role == 'company':
            company = Company.objects(user=user).first()
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