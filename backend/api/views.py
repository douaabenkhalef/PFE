# api/views.py
from rest_framework import status
from django.utils import timezone
from rest_framework.decorators import api_view, parser_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import HttpResponse
from datetime import datetime
import traceback
from django.conf import settings


from .models import User, Student, Company, Admin, InternshipOffer, Application, OTPVerification, PendingApproval, Notification
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
    send_company_response_email
)
from .decorators import jwt_authenticated, role_required


# ============= UTILITY =============
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


# ============= AUTHENTICATION =============

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
    elif user.role == 'company':
        company = Company.objects(user=user).first()
        if company:
            user_data['company_name'] = company.company_name
    elif user.role == 'admin':
        admin = Admin.objects(user=user).first()
        if admin:
            user_data['full_name'] = admin.full_name

    return Response({
        'success': True,
        'message': 'Login successful',
        'token': token,
        'user': user_data,
        'redirect_url': redirect_urls.get(user.role, '/dashboard'),
    })


# ============= OTP FUNCTIONS =============

@api_view(['POST'])
def initiate_signup(request):
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
    email_sent = send_otp_email(email, code, "inscription")
    if not email_sent:
        return Response({'success': False, 'message': 'Failed to send verification email.'},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response({'success': True, 'message': 'Verification code sent', 'email': email})


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


# ============= PASSWORD RESET =============

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

    # Password strength (simplified)
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


# ============= STUDENT SPACE =============

@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['student'])
def student_dashboard(request):
    return Response({'message': 'Student dashboard', 'success': True})


@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['student'])
def search_offers(request):
    """
    Returns active internship offers with filters:
      - search (text in title, description, company_name)
      - company_name (exact)
      - wilaya
      - internship_type
      - skills (comma-separated)
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

    # Already applied?
    existing = Application.objects(student=student, offer=offer).first()
    if existing:
        return Response({'success': False, 'message': 'You have already applied to this offer'}, status=400)

    # Check deadline & active
    if not offer.is_active or offer.deadline < datetime.now():
        return Response({'success': False, 'message': 'This internship is currently unavailable'}, status=400)

    # Profile completeness
    required_fields = ['full_name', 'wilaya', 'skills', 'education_level', 'university', 'major', 'graduation_year']
    missing = [f for f in required_fields if not getattr(student, f, None)]
    if missing:
        return Response({'success': False, 'message': 'Please complete your profile before applying',
                         'missing_fields': missing}, status=400)

    # CV file
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

    # Send notifications
    send_application_confirmation_student(student.user.email, student.full_name, offer.title)
    company = offer.company
    if company and company.user:
        send_application_notification_company(company.user.email, offer.title, student.full_name)

    return Response({
        'success': True,
        'message': 'Your application has been successfully submitted',
        'application_id': str(application.id)
    }, status=201)


# ============= COMPANY SPACE =============

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


# ============= INTERNSHIP OFFERS — COMPANY CRUD =============

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
        start_date = timezone.make_aware(start_date),
        deadline = timezone.make_aware(deadline),
        is_active=request.data.get('is_active', True),
    )
    offer.save()

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

    # Check duplicate title only if changed
    if 'title' in request.data:
        duplicate = InternshipOffer.objects(company=company, title=request.data['title']).first()
        if duplicate and str(duplicate.id) != offer_id:
            return Response({'success': False, 'message': 'An offer with this title already exists.'}, status=400)

    offer.save()
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
    return Response({'success': True, 'message': f'Offer "{title}" deleted successfully.'})


# ============= COMPANY MANAGER — HIRING MANAGER MANAGEMENT =============

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

    hiring_user.rejected = True
    hiring_user.save()
    return Response({'success': True, 'message': f'Hiring manager {hiring_user.username} rejected.'})


# ============= ADMIN SPACE — COMPANY MANAGERS =============

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


# ============= ADMIN SPACE — CO DEPARTMENT HEADS =============

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

    # Create Admin profile if missing
    if not Admin.objects(user=co_dept).first():
        Admin(user=co_dept, full_name=co_dept.username, wilaya=dept_head_admin.wilaya,
              university=dept_head_admin.university).save()

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

    co_dept.rejected = True
    co_dept.save()
    return Response({'success': True, 'message': f'Co Department Head {co_dept.username} rejected.'})


# ============= OTHER ADMIN ENDPOINTS =============

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


# ============= PROOF MANAGEMENT =============

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


# ============= UTILITIES =============

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

        # For rejections, a reason is required
        if new_status == 'rejected':
            reason = request.data.get('rejection_reason', '').strip()
            if not reason:
                return Response({'error': 'A rejection reason is required.'}, status=400)
            app.company_notes = reason
        else:
            app.company_notes = request.data.get('notes', '')

        app.status = new_status
        app.company_response_date = datetime.now()
        app.save()

        # Envoi de l'email
        send_company_response_email(app.student.user.email, app.offer.title, new_status)

        # Création de la notification (champ correct = related_id)
        try:
            from .models import Notification
            Notification.objects.create(
                recipient=app.student.user,
                message=f"Your application for '{app.offer.title}' has been {new_status}.",
                related_id=str(app.id)   # ✅ champ utilisé dans le modèle Notification
            )
        except Exception as notif_err:
            print(f"Notification failed but application was saved: {notif_err}")

        return Response({'success': True, 'message': f'Application {new_status} successfully.'})

    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['student'])
def get_notifications(request):
    notifications = Notification.objects(recipient=request.user).order_by('-created_at')
    data = [{
        'id': str(n.id),
        'message': n.message,
        'is_read': n.is_read,
        'created_at': n.created_at.strftime("%Y-%m-%d %H:%M")
    } for n in notifications]
    return Response({'success': True, 'notifications': data})

@api_view(['POST'])
@jwt_authenticated
def mark_notifications_read(request):
    Notification.objects(recipient=request.user, is_read=False).update(set__is_read=True)
    return Response({'success': True})



@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['company'])
def download_application_cv(request, application_id):
    """Serve the CV file attached to an application."""
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
        from django.http import HttpResponse
        response = HttpResponse(app.cv_file.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="cv_{application_id}.pdf"'
        return response
    except Exception as e:
        return Response({'error': str(e)}, status=500)
@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['student'])
def download_application_cv_student(request, application_id):
    """Serve the CV file attached to an application for the student who owns it."""
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
    """Endpoint public pour récupérer les offres de stage actives (page d'accueil)"""
    today_start = timezone.make_aware(datetime.combine(timezone.now().date(), datetime.min.time()))
    offers = InternshipOffer.objects(is_active=True, deadline__gte=today_start).order_by('-created_at')[:6]
    serializer = InternshipOfferSerializer(offers, many=True)
    return Response({'success': True, 'offers': serializer.data})


# api/views.py (within the existing file, replace the generate_custom_cv function)

@api_view(['POST'])
@jwt_authenticated
@role_required(allowed_roles=['student'])
def generate_custom_cv(request):
    """
    Generate a professional CV PDF from the student's provided data.
    Accepts a JSON body with CV fields.
    """
    data = request.data
    student = Student.objects(user=request.user).first()
    if not student:
        return Response({'error': 'Student profile not found'}, status=404)

    # Extract fields with defaults from student profile
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
    wilaya = student.wilaya  # from student profile, used for contact info

    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{full_name}_CV.pdf"'
    
    # Import reportlab components
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    from reportlab.lib.utils import ImageReader
    import os

    # ===== STYLES =====
    styles = getSampleStyleSheet()
    
    # Title style (name)
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Title'],
        fontName='Helvetica-Bold',
        fontSize=24,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#2c3e50'),      # dark blue-gray
        spaceAfter=12,
    )
    
    # Contact info style
    contact_style = ParagraphStyle(
        'Contact',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        textColor=colors.HexColor('#7f8c8d'),      # gray
        alignment=TA_CENTER,
        spaceAfter=12,
    )
    
    # Section heading style
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        textColor=colors.HexColor('#2980b9'),      # blue
        spaceBefore=12,
        spaceAfter=6,
        borderPadding=0,
        backColor=None,
    )
    
    # Body text style
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        alignment=TA_LEFT,
        spaceAfter=4,
    )
    
    # Subheading for experience titles
    subheading_style = ParagraphStyle(
        'Subheading',
        parent=body_style,
        fontName='Helvetica-Bold',
        fontSize=10,
        spaceAfter=2,
    )
    
    # ===== DOCUMENT SETUP =====
    # Margins: 2cm on left/right, 2cm top/bottom
    doc = SimpleDocTemplate(
        response,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm,
    )
    story = []

    # Optional: add a logo if file exists
    logo_path = os.path.join(settings.BASE_DIR, 'media', 'logo.png')
    if os.path.exists(logo_path):
        img = Image(logo_path, width=2*cm, height=2*cm)
        img.hAlign = 'CENTER'
        story.append(img)
        story.append(Spacer(1, 0.2*cm))

    # Name
    story.append(Paragraph(full_name, title_style))
    
    # Contact line: email | phone (if available) | wilaya
    phone = getattr(request.user, 'phone', '') if hasattr(request.user, 'phone') else ''
    contact_parts = [email]
    if phone:
        contact_parts.append(phone)
    if wilaya:
        contact_parts.append(wilaya)
    contact_text = " | ".join(contact_parts)
    story.append(Paragraph(contact_text, contact_style))
    
    story.append(Spacer(1, 0.5*cm))

    # ===== OBJECTIVE SECTION =====
    if objective:
        story.append(Paragraph("OBJECTIF", heading_style))
        story.append(Paragraph(objective, body_style))
        story.append(Spacer(1, 0.3*cm))

    # ===== EDUCATION SECTION =====
    story.append(Paragraph("FORMATION", heading_style))
    edu_text = f"{education_level} en {major}<br/>{university} | Diplômé(e) en {graduation_year}"
    story.append(Paragraph(edu_text, body_style))
    story.append(Spacer(1, 0.3*cm))

    # ===== SKILLS SECTION =====
    if skills:
        story.append(Paragraph("COMPÉTENCES", heading_style))
        # Format skills as comma-separated string
        skills_text = ", ".join(skills)
        story.append(Paragraph(skills_text, body_style))
        story.append(Spacer(1, 0.3*cm))

    # ===== LANGUAGES SECTION (as a table) =====
    if languages:
        story.append(Paragraph("LANGUES", heading_style))
        # Create a table with two columns: Language | Level
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

    # ===== EXPERIENCE SECTION (as a table per experience) =====
    if experience:
        story.append(Paragraph("EXPÉRIENCES", heading_style))
        for exp in experience:
            title = exp.get('title', '')
            company = exp.get('company', '')
            dates = exp.get('dates', '')
            desc = exp.get('description', '')
            
            # Create a sub-table for each experience
            exp_data = [
                [Paragraph(f"<b>{title}</b>", subheading_style), Paragraph(dates, body_style)],
                [Paragraph(company, body_style), ''],
                [Paragraph(desc, body_style), ''],
            ]
            exp_table = Table(exp_data, colWidths=[9*cm, 3*cm])
            exp_table.setStyle(TableStyle([
                ('SPAN', (0,0), (0,0)),   # title spans first row only
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

    # Build the PDF
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

    # Remplacer l'URL du CV par une URL relative sans /api
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