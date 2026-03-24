from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import User, Student, Company, Admin, InternshipOffer, Application
from .serializers import (
    StudentRegistrationSerializer,
    CompanyRegistrationSerializer,
    AdminRegistrationSerializer,
    InternshipOfferSerializer,
    ApplicationSerializer,
)
from .auth import create_token
from datetime import datetime
import traceback


# ============= AUTHENTICATION =============

@api_view(['POST'])
@permission_classes([AllowAny])
def register_student(request):
    """Student registration — email must contain univ.dz"""
    serializer = StudentRegistrationSerializer(data=request.data)

    if not serializer.is_valid():
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data

    # University email gate
    if 'univ.dz' not in data['email']:
        return Response({
            'success': False,
            'errors': {'email': ['Your email must be a university email address (must contain univ.dz).']}
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        if User.objects(email=data['email']).first():
            return Response({
                'success': False,
                'errors': {'email': ['This email is already in use.']}
            }, status=status.HTTP_400_BAD_REQUEST)

        if User.objects(username=data['username']).first():
            return Response({
                'success': False,
                'errors': {'username': ['This username is already taken.']}
            }, status=status.HTTP_400_BAD_REQUEST)

        # Students are approved immediately (status=True)
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

        required_fields = ['full_name', 'wilaya', 'skills', 'education_level', 'university', 'major', 'graduation_year']
        missing = [f for f in required_fields if not data.get(f)]
        if missing:
            user.delete()
            return Response({
                'success': False,
                'errors': {f: ['This field is required.'] for f in missing}
            }, status=status.HTTP_400_BAD_REQUEST)

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
            'message': 'Registration successful! Welcome aboard.',
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
        return Response({
            'success': False,
            'errors': {'non_field_errors': [f'Registration failed: {str(e)}']}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def register_company(request):
    """
    Company registration.
    - company_manager : approved by super admin
    - hiring_manager  : approved by their company manager
    Both start with status=False and receive a pending response (no token).
    """
    serializer = CompanyRegistrationSerializer(data=request.data)

    if not serializer.is_valid():
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data

    try:
        if User.objects(email=data['email']).first():
            return Response({
                'success': False,
                'errors': {'email': ['This email is already in use.']}
            }, status=status.HTTP_400_BAD_REQUEST)

        if User.objects(username=data['username']).first():
            return Response({
                'success': False,
                'errors': {'username': ['This username is already taken.']}
            }, status=status.HTTP_400_BAD_REQUEST)

        # Resolve parent company for hiring managers
        parent_company = None
        if data['sub_role'] == 'hiring_manager':
            manager_user = User.objects(
                email=data['company_manager_email'],
                role='company',
                sub_role='company_manager',
                status=True,
            ).first()

            if not manager_user:
                return Response({
                    'success': False,
                    'errors': {'company_manager_email': [
                        'No approved company manager found with this email. '
                        'Make sure the company manager has been approved before you register as a hiring manager.'
                    ]}
                }, status=status.HTTP_400_BAD_REQUEST)

            parent_company = Company.objects(user=manager_user).first()
            if not parent_company:
                return Response({
                    'success': False,
                    'errors': {'company_manager_email': [
                        'Company profile not found for this manager.'
                    ]}
                }, status=status.HTTP_400_BAD_REQUEST)

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
            'message': (
                'Your account has been created and is pending approval. '
                'You will be notified once an administrator activates your account.'
            ),
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        traceback.print_exc()
        if 'user' in locals():
            try:
                user.delete()
            except Exception:
                pass
        return Response({
            'success': False,
            'errors': {'non_field_errors': [f'Registration failed: {str(e)}']}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def register_admin(request):
    """
    Admin registration.
    - admin        : approved by super admin
    - co_dept_head : approved by the admin of their university
    Both start with status=False and receive a pending response (no token).
    """
    serializer = AdminRegistrationSerializer(data=request.data)

    if not serializer.is_valid():
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data

    try:
        # For co_dept_head, verify an approved admin exists for the given university
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
                return Response({
                    'success': False,
                    'errors': {'university': [
                        'No approved admin found for this university. '
                        'Please check the university name or contact your administrator.'
                    ]}
                }, status=status.HTTP_400_BAD_REQUEST)

        user = User(
            username=data['username'],
            email=data['email'],
            role='admin',
            sub_role=data['sub_role'],
            status=False,
            is_university_email='univ.dz' in data['email'],
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
            'message': (
                'Your account has been created and is pending approval. '
                'You will be notified once an administrator activates your account.'
            ),
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        traceback.print_exc()
        if 'user' in locals():
            try:
                user.delete()
            except Exception:
                pass
        return Response({
            'success': False,
            'errors': {'non_field_errors': [f'Registration failed: {str(e)}']}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """User login — blocked if status is False"""
    email = request.data.get('email')
    password = request.data.get('password')

    if not email or not password:
        return Response({
            'success': False,
            'errors': {'non_field_errors': ['Email and password are required.']}
        }, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects(email=email).first()

    if not user or not user.check_password(password):
        return Response({
            'success': False,
            'errors': {'non_field_errors': ['Incorrect email or password.']}
        }, status=status.HTTP_401_UNAUTHORIZED)

    if not user.status:
        return Response({
            'success': False,
            'errors': {'non_field_errors': [
                'Your account is pending approval. '
                'Please wait for an administrator to activate your account.'
            ]}
        }, status=status.HTTP_403_FORBIDDEN)

    token = create_token(user)

    redirect_urls = {
        'student': '/student/dashboard',
        'company': '/company/dashboard',
        'admin':   '/admin/dashboard',
    }

    user_data = {
        'id':       str(user.id),
        'email':    user.email,
        'role':     user.role,
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
        'message': 'Login successful.',
        'token': token,
        'user': user_data,
        'redirect_url': redirect_urls.get(user.role, '/dashboard'),
    })


# ============= STUDENT SPACE =============

@api_view(['GET'])
def student_dashboard(request):
    return Response({'message': 'Student dashboard'})


@api_view(['GET'])
def search_offers(request):
    return Response({'message': 'Search offers'})


@api_view(['POST'])
def apply_to_offer(request, offer_id):
    return Response({'message': f'Apply to offer {offer_id}'})


# ============= COMPANY SPACE =============

@api_view(['GET'])
def company_dashboard(request):
    return Response({'message': 'Company dashboard'})


@api_view(['POST'])
def create_offer(request):
    return Response({'message': 'Create offer'})


@api_view(['PUT'])
def update_offer(request, offer_id):
    return Response({'message': f'Update offer {offer_id}'})


@api_view(['POST'])
def respond_to_candidate(request, application_id):
    return Response({'message': f'Respond to candidate {application_id}'})


# ============= ADMIN SPACE =============

@api_view(['GET'])
def admin_dashboard(request):
    return Response({'message': 'Admin dashboard'})


@api_view(['POST'])
def validate_application(request, application_id):
    return Response({'message': f'Validate application {application_id}'})


@api_view(['GET'])
def generate_agreement(request, application_id):
    return Response({'message': f'Generate agreement {application_id}'})


# ============= UTILITIES =============

@api_view(['GET'])
@permission_classes([AllowAny])
def get_skills_tags(request):
    common_skills = [
        'React', 'Angular', 'Vue.js', 'Node.js', 'Django', 'Flask',
        'Java', 'Spring Boot', 'Python', 'PHP', 'Laravel',
        'JavaScript', 'TypeScript', 'HTML/CSS', 'Bootstrap',
        'MongoDB', 'MySQL', 'PostgreSQL', 'Firebase',
        'Git', 'Docker', 'AWS', 'REST API', 'GraphQL',
    ]
    return Response({'skills': common_skills})