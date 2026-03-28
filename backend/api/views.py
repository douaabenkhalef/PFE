# api/views.py
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import User, Student, Company, Admin, InternshipOffer, Application, OTPVerification, PendingApproval
from .serializers import (
    StudentRegistrationSerializer,
    CompanyRegistrationSerializer,
    AdminRegistrationSerializer,
    InternshipOfferSerializer,
    ApplicationSerializer,
)
from .auth import create_token
from .otp_utils import create_otp_verification, send_otp_email, verify_otp_code
from .email_utils import send_email, send_approval_email, send_rejection_email, send_proof_request_email, send_proof_received_confirmation
from .decorators import jwt_authenticated, role_required
from datetime import datetime
import traceback


# ============= FONCTION UTILITAIRE =============

def cleanup_pending_approval(user_id):
    """Supprime l'entrée de pending_approvals après approbation"""
    try:
        pending = PendingApproval.objects(user_id=user_id).first()
        if pending:
            pending.delete()
            print(f"🗑️ Demande supprimée de pending_approvals")
    except Exception as e:
        print(f"⚠️ Erreur lors du nettoyage: {e}")


# ============= AUTHENTICATION =============

@api_view(['POST'])
def register_student(request):
    """Student registration — email must contain univ and .dz"""
    serializer = StudentRegistrationSerializer(data=request.data)

    if not serializer.is_valid():
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data

    # University email gate (must contain "univ" AND ".dz")
    if 'univ' not in data['email'] or '.dz' not in data['email']:
        return Response({
            'success': False,
            'errors': {'email': ['Your email must be an Algerian university email address (must contain "univ" and ".dz").']}
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
def register_company(request):
    """Company registration with pending approval"""
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
                        'No approved company manager found with this email.'
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
            'message': 'Your account has been created and is pending approval.'
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
def register_admin(request):
    """Admin registration with pending approval"""
    serializer = AdminRegistrationSerializer(data=request.data)

    if not serializer.is_valid():
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

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
                return Response({
                    'success': False,
                    'errors': {'university': [
                        'No approved admin found for this university.'
                    ]}
                }, status=status.HTTP_400_BAD_REQUEST)

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
            'message': 'Your account has been created and is pending approval.'
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
def login(request):
    """User login — blocked if status is False"""
    email = request.data.get('email')
    password = request.data.get('password')

    if not email or not password:
        return Response({
            'success': False,
            'errors': {'non_field_errors': ['Email et mot de passe requis.']}
        }, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects(email=email).first()

    if not user or not user.check_password(password):
        return Response({
            'success': False,
            'errors': {'non_field_errors': ['Email ou mot de passe incorrect.']}
        }, status=status.HTTP_401_UNAUTHORIZED)

    if not user.status:
        return Response({
            'success': False,
            'errors': {'non_field_errors': [
                'Votre compte est en attente d\'approbation. Veuillez patienter.'
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
        'message': 'Connexion réussie !',
        'token': token,
        'user': user_data,
        'redirect_url': redirect_urls.get(user.role, '/dashboard'),
    })


# ============= OTP FUNCTIONS =============

@api_view(['POST'])
def initiate_signup(request):
    """Première étape de l'inscription : envoi d'un code OTP par email"""
    print("="*60)
    print("🔵 initiate_signup appelé")
    print("📦 Données reçues:", request.data)
    print("📦 Role:", request.data.get('role'))
    print("="*60)
    
    role = request.data.get('role')
    
    clean_data = {k: v for k, v in request.data.items() if k != 'role'}
    print("📦 Données nettoyées:", clean_data)
    
    if role == 'student':
        serializer = StudentRegistrationSerializer(data=clean_data)
    elif role == 'company':
        serializer = CompanyRegistrationSerializer(data=clean_data)
    elif role == 'admin':
        serializer = AdminRegistrationSerializer(data=clean_data)
    else:
        return Response({
            'success': False,
            'message': 'Rôle invalide'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if not serializer.is_valid():
        print("❌ Erreurs de validation:")
        for field, errors in serializer.errors.items():
            print(f"   {field}: {errors}")
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    print("✅ Données validées avec succès")
    data = serializer.validated_data
    email = data['email']
    
    existing_user = User.objects(email=email).first()
    if existing_user:
        print(f"❌ Email déjà utilisé: {email}")
        return Response({
            'success': False,
            'errors': {'email': ['Cet email est déjà utilisé']}
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if role == 'student':
        if 'univ' not in email or '.dz' not in email:
            print(f"❌ Email rejeté: {email}")
            return Response({
                'success': False,
                'errors': {'email': ['Vous devez utiliser une adresse email universitaire algérienne (contenant "univ" et ".dz")']}
            }, status=status.HTTP_400_BAD_REQUEST)
    
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
            print(f"❌ Company Manager non trouvé: {manager_email}")
            return Response({
                'success': False,
                'errors': {'company_manager_email': [
                    f'Aucun gestionnaire d\'entreprise approuvé trouvé avec l\'email "{manager_email}".'
                ]}
            }, status=status.HTTP_400_BAD_REQUEST)
        
        manager_company = Company.objects(user=manager_user).first()
        if not manager_company:
            return Response({
                'success': False,
                'errors': {'company_manager_email': [
                    'Profil d\'entreprise non trouvé pour ce gestionnaire.'
                ]}
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if manager_company.company_name.lower() != company_name.lower():
            print(f"❌ Nom d'entreprise incorrect: {company_name} vs {manager_company.company_name}")
            return Response({
                'success': False,
                'errors': {'company_name_for_hiring': [
                    f'Le nom de l\'entreprise "{company_name}" ne correspond pas à celui du gestionnaire "{manager_company.company_name}".'
                ]}
            }, status=status.HTTP_400_BAD_REQUEST)
        
        print(f"✅ Vérification réussie pour hiring manager: {manager_email} / {company_name}")
    
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
            print(f"❌ Department Head non trouvé: {dept_head_email}")
            return Response({
                'success': False,
                'errors': {'dept_head_email': [
                    f'Aucun Department Head approuvé trouvé avec l\'email "{dept_head_email}".'
                ]}
            }, status=status.HTTP_400_BAD_REQUEST)
        
        dept_head_admin = Admin.objects(user=dept_head_user).first()
        if not dept_head_admin:
            return Response({
                'success': False,
                'errors': {'dept_head_email': [
                    'Profil administrateur non trouvé pour ce Department Head.'
                ]}
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if dept_head_admin.university.lower() != university_name.lower():
            print(f"❌ Nom d'université incorrect: {university_name} vs {dept_head_admin.university}")
            return Response({
                'success': False,
                'errors': {'university_for_verification': [
                    f'Le nom de l\'université "{university_name}" ne correspond pas à celle du Department Head "{dept_head_admin.university}".'
                ]}
            }, status=status.HTTP_400_BAD_REQUEST)
        
        print(f"✅ Vérification réussie pour co_dept_head: {dept_head_email} / {university_name}")
    
    temp_data = {
        'role': role,
        'data': data
    }
    
    code = create_otp_verification(email, temp_data)
    print(f"🔑 Code OTP généré: {code}")
    
    email_sent = send_otp_email(email, code, "inscription")
    
    if not email_sent:
        return Response({
            'success': False,
            'message': "Erreur lors de l'envoi de l'email de vérification"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    print("✅ Email envoyé avec succès")
    
    return Response({
        'success': True,
        'message': 'Un code de vérification a été envoyé à votre email',
        'email': email
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
def complete_signup(request):
    """Deuxième étape de l'inscription : vérification du code OTP et création du compte"""
    print("="*60)
    print("🔵 complete_signup appelé")
    print("📦 Données reçues:", request.data)
    print("="*60)
    
    email = request.data.get('email')
    code = request.data.get('code')
    
    if not email or not code:
        return Response({
            'success': False,
            'message': 'Email et code requis'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    temp_data, error = verify_otp_code(email, code)
    
    if error:
        print(f"❌ Erreur OTP: {error}")
        return Response({
            'success': False,
            'message': error,
            'code_invalid': True
        }, status=status.HTTP_400_BAD_REQUEST)
    
    role = temp_data.get('role')
    data = temp_data.get('data')
    print(f"✅ OTP vérifié pour {email}, rôle: {role}")
    
    try:
        if role == 'student':
            if User.objects(username=data['username']).first():
                return Response({
                    'success': False,
                    'errors': {'username': ['Ce nom d\'utilisateur est déjà pris']}
                }, status=status.HTTP_400_BAD_REQUEST)
            
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
            print(f"✅ Utilisateur créé: {user.id}")
            
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
            print(f"✅ Profil étudiant créé: {student.id}")
            
            token = create_token(user)
            
            return Response({
                'success': True,
                'message': 'Inscription réussie !',
                'token': token,
                'user': {
                    'id': str(user.id),
                    'email': user.email,
                    'role': user.role,
                    'full_name': student.full_name,
                },
                'redirect_url': '/student/dashboard'
            }, status=status.HTTP_201_CREATED)
        
        elif role == 'company':
            if User.objects(username=data['username']).first():
                return Response({
                    'success': False,
                    'errors': {'username': ['Ce nom d\'utilisateur est déjà pris']}
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Si c'est un Company Manager
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
                print(f"✅ Utilisateur company manager créé: {user.id}")
                
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
                print(f"✅ Profil entreprise créé pour company manager: {company.id}")
                
                # Ajouter à la collection PendingApproval
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
                print(f"✅ Demande ajoutée à pending_approvals pour {user.email}")
                
                pending_message = "Votre compte a été créé et est en attente d'approbation. Vous recevrez un email une fois votre compte activé."
                
                return Response({
                    'success': True,
                    'pending': True,
                    'message': pending_message,
                    'redirect_url': None,
                    'sub_role': data['sub_role']
                }, status=status.HTTP_201_CREATED)
            
            # Si c'est un Hiring Manager
            else:
                parent_company = None
                manager_user = None
                
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
                            'Aucun gestionnaire d\'entreprise approuvé trouvé avec cet email'
                        ]}
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                parent_company = Company.objects(user=manager_user).first()
                
                if not parent_company:
                    return Response({
                        'success': False,
                        'errors': {'company_manager_email': [
                            'Profil d\'entreprise non trouvé pour ce gestionnaire'
                        ]}
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                if parent_company.company_name.lower() != data.get('company_name_for_hiring', '').lower():
                    return Response({
                        'success': False,
                        'errors': {'company_name_for_hiring': [
                            f'Le nom de l\'entreprise "{data.get("company_name_for_hiring")}" ne correspond pas à celui du gestionnaire "{parent_company.company_name}".'
                        ]}
                    }, status=status.HTTP_400_BAD_REQUEST)
                
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
                print(f"✅ Utilisateur hiring manager créé: {user.id}")
                
                pending_message = f"Votre compte a été créé et est en attente d'approbation. Veuillez attendre que votre Company Manager ({manager_user.username}) active votre compte."
                
                return Response({
                    'success': True,
                    'pending': True,
                    'message': pending_message,
                    'redirect_url': None,
                    'sub_role': data['sub_role']
                }, status=status.HTTP_201_CREATED)
        
        elif role == 'admin':
            if User.objects(username=data['username']).first():
                return Response({
                    'success': False,
                    'errors': {'username': ['Ce nom d\'utilisateur est déjà pris']}
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Si c'est un Department Head
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
                print(f"✅ Utilisateur Department Head créé: {user.id}")
                
                admin_profile = Admin(
                    user=user,
                    full_name=data['full_name'],
                    wilaya=data['wilaya'],
                    university=data['university'],
                )
                admin_profile.save()
                print(f"✅ Profil admin créé pour Department Head: {admin_profile.id}")
                
                # Ajouter à la collection PendingApproval
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
                print(f"✅ Demande ajoutée à pending_approvals pour {user.email}")
                
                pending_message = "Votre compte a été créé et est en attente d'approbation. Vous recevrez un email une fois votre compte activé."
                
                return Response({
                    'success': True,
                    'pending': True,
                    'message': pending_message,
                    'redirect_url': None,
                    'sub_role': data['sub_role']
                }, status=status.HTTP_201_CREATED)
            
            # Si c'est un Co Department Head
            else:
                dept_head_user = None
                parent_admin = None
                
                dept_head_user = User.objects(
                    email=data['dept_head_email'],
                    role='admin',
                    sub_role='admin',
                    status=True,
                ).first()
                
                if not dept_head_user:
                    return Response({
                        'success': False,
                        'errors': {'dept_head_email': [
                            'Aucun Department Head approuvé trouvé avec cet email'
                        ]}
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                parent_admin = Admin.objects(user=dept_head_user).first()
                
                if not parent_admin:
                    return Response({
                        'success': False,
                        'errors': {'dept_head_email': [
                            'Profil administrateur non trouvé pour ce Department Head'
                        ]}
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                if parent_admin.university.lower() != data.get('university_for_verification', '').lower():
                    return Response({
                        'success': False,
                        'errors': {'university_for_verification': [
                            f'Le nom de l\'université "{data.get("university_for_verification")}" ne correspond pas à celle du Department Head "{parent_admin.university}".'
                        ]}
                    }, status=status.HTTP_400_BAD_REQUEST)
                
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
                print(f"✅ Utilisateur co_dept_head créé: {user.id}")
                
                pending_message = f"Votre compte a été créé et est en attente d'approbation. Veuillez attendre que le Department Head ({dept_head_user.username}) active votre compte."
                
                return Response({
                    'success': True,
                    'pending': True,
                    'message': pending_message,
                    'redirect_url': None,
                    'sub_role': data['sub_role']
                }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        traceback.print_exc()
        if 'user' in locals():
            try:
                user.delete()
            except:
                pass
        return Response({
            'success': False,
            'message': f'Erreur lors de la création du compte: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============= PASSWORD RESET =============

@api_view(['POST'])
def forgot_password(request):
    """
    Étape 1: Envoyer un OTP pour la réinitialisation du mot de passe
    """
    email = request.data.get('email')
    
    if not email:
        return Response({
            'success': False,
            'message': 'Email requis'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    user = User.objects(email=email).first()
    if not user:
        return Response({
            'success': False,
            'message': 'Aucun compte trouvé avec cet email.',
            'email_exists': False
        }, status=status.HTTP_404_NOT_FOUND)
    
    temp_data = {
        'action': 'reset_password',
        'email': email,
        'user_id': str(user.id)
    }
    
    code = create_otp_verification(email, temp_data)
    print(f"🔑 Code OTP pour réinitialisation: {code}")
    
    email_sent = send_otp_email(email, code, "reset_password")
    
    if not email_sent:
        return Response({
            'success': False,
            'message': "Erreur lors de l'envoi de l'email"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return Response({
        'success': True,
        'message': 'Un code de réinitialisation a été envoyé à votre email',
        'email': email,
        'email_exists': True
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
def reset_password(request):
    """
    Étape 2: Vérifier l'OTP et réinitialiser le mot de passe
    """
    email = request.data.get('email')
    code = request.data.get('code')
    new_password = request.data.get('new_password')
    confirm_password = request.data.get('confirm_password')
    
    if not email or not code or not new_password:
        return Response({
            'success': False,
            'message': 'Email, code et nouveau mot de passe requis'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if new_password != confirm_password:
        return Response({
            'success': False,
            'message': 'Les mots de passe ne correspondent pas.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if len(new_password) < 8:
        return Response({
            'success': False,
            'message': 'Le mot de passe doit contenir au moins 8 caractères.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if new_password.isdigit():
        return Response({
            'success': False,
            'message': 'Le mot de passe ne peut pas être composé uniquement de chiffres.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if not any(c.isupper() for c in new_password):
        return Response({
            'success': False,
            'message': 'Le mot de passe doit contenir au moins une lettre majuscule.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if not any(c.islower() for c in new_password):
        return Response({
            'success': False,
            'message': 'Le mot de passe doit contenir au moins une lettre minuscule.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if not any(c.isdigit() for c in new_password):
        return Response({
            'success': False,
            'message': 'Le mot de passe doit contenir au moins un chiffre.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    temp_data, error = verify_otp_code(email, code)
    
    if error:
        return Response({
            'success': False,
            'message': error,
            'code_invalid': True
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if temp_data.get('action') != 'reset_password':
        return Response({
            'success': False,
            'message': 'Code invalide pour cette action. Veuillez demander un nouveau code.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    user = User.objects(email=email).first()
    if not user:
        return Response({
            'success': False,
            'message': 'Utilisateur non trouvé'
        }, status=status.HTTP_404_NOT_FOUND)
    
    user.set_password(new_password)
    user.save()
    
    return Response({
        'success': True,
        'message': 'Votre mot de passe a été réinitialisé avec succès.'
    }, status=status.HTTP_200_OK)


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
    return Response({'message': 'Search offers', 'success': True})


@api_view(['POST'])
@jwt_authenticated
@role_required(allowed_roles=['student'])
def apply_to_offer(request, offer_id):
    return Response({'message': f'Apply to offer {offer_id}', 'success': True})


# ============= COMPANY SPACE =============

@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['company'])
def company_dashboard(request):
    return Response({'message': 'Company dashboard', 'success': True})


@api_view(['POST'])
@jwt_authenticated
@role_required(allowed_roles=['company'])
def create_offer(request):
    return Response({'message': 'Create offer', 'success': True})


@api_view(['PUT'])
@jwt_authenticated
@role_required(allowed_roles=['company'])
def update_offer(request, offer_id):
    return Response({'message': f'Update offer {offer_id}', 'success': True})


@api_view(['POST'])
@jwt_authenticated
@role_required(allowed_roles=['company'])
def respond_to_candidate(request, application_id):
    return Response({'message': f'Respond to candidate {application_id}', 'success': True})


# ============= ADMIN SPACE =============

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


# ============= COMPANY SPACE - GESTION DES HIRING MANAGERS =============

@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['company'], allowed_sub_roles=['company_manager'])
def get_pending_hiring_managers(request):
    company = Company.objects(user=request.user).first()
    if not company:
        return Response({'error': 'Entreprise non trouvée', 'success': False}, status=status.HTTP_404_NOT_FOUND)
    
    pending_hiring_managers = []
    users = User.objects(
        role='company',
        sub_role='hiring_manager',
        status=False
    )
    
    for user in users:
        if user.pending_company_id == str(company.id):
            pending_hiring_managers.append({
                'id': str(user.id),
                'username': user.username,
                'email': user.email,
                'company_name': company.company_name,
                'created_at': user.created_at,
                'description': "En attente d'approbation",
                'location': company.location,
                'industry': company.industry
            })
    
    return Response({
        'success': True,
        'hiring_managers': pending_hiring_managers
    })


@api_view(['POST'])
@jwt_authenticated
@role_required(allowed_roles=['company'], allowed_sub_roles=['company_manager'])
def approve_hiring_manager(request, user_id):
    hiring_user = User.objects(id=user_id, role='company', sub_role='hiring_manager', status=False).first()
    if not hiring_user:
        return Response({'error': 'Hiring manager non trouvé', 'success': False}, status=status.HTTP_404_NOT_FOUND)
    
    company = Company.objects(user=request.user).first()
    
    if not hiring_user.pending_company_id or hiring_user.pending_company_id != str(company.id):
        return Response({'error': 'Ce hiring manager n\'appartient pas à votre entreprise', 'success': False}, status=status.HTTP_403_FORBIDDEN)
    
    hiring_user.status = True
    hiring_user.save()
    
    send_approval_email(
        recipient=hiring_user.email,
        name=hiring_user.username,
        role="Hiring Manager",
        approver=request.user.username
    )
    
    return Response({
        'success': True,
        'message': f'Hiring manager {hiring_user.username} a été approuvé avec succès. Un email de confirmation lui a été envoyé.'
    })


@api_view(['POST'])
@jwt_authenticated
@role_required(allowed_roles=['company'], allowed_sub_roles=['company_manager'])
def reject_hiring_manager(request, user_id):
    hiring_user = User.objects(id=user_id, role='company', sub_role='hiring_manager', status=False).first()
    if not hiring_user:
        return Response({'error': 'Hiring manager non trouvé', 'success': False}, status=status.HTTP_404_NOT_FOUND)
    
    company = Company.objects(user=request.user).first()
    
    if not hiring_user.pending_company_id or hiring_user.pending_company_id != str(company.id):
        return Response({'error': 'Ce hiring manager n\'appartient pas à votre entreprise', 'success': False}, status=status.HTTP_403_FORBIDDEN)
    
    hiring_user.rejected = True
    hiring_user.save()
    
    return Response({
        'success': True,
        'message': f'Hiring manager {hiring_user.username} a été refusé. Un email de notification lui sera envoyé.'
    })


# ============= ADMIN SPACE - GESTION DES COMPANY MANAGERS =============

@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['admin'])
def get_pending_company_managers(request):
    pending_managers = []
    users = User.objects(
        role='company',
        sub_role='company_manager',
        status=False
    )
    
    for user in users:
        company = Company.objects(user=user).first()
        pending_managers.append({
            'id': str(user.id),
            'username': user.username,
            'email': user.email,
            'company_name': company.company_name if company else '',
            'description': company.description if company else '',
            'location': company.location if company else '',
            'website': company.website if company else '',
            'industry': company.industry if company else '',
            'created_at': user.created_at
        })
    
    return Response({
        'success': True,
        'company_managers': pending_managers
    })


@api_view(['POST'])
@jwt_authenticated
@role_required(allowed_roles=['admin'])
def approve_company_manager(request, user_id):
    manager_user = User.objects(id=user_id, role='company', sub_role='company_manager', status=False).first()
    if not manager_user:
        return Response({'error': 'Company manager non trouvé', 'success': False}, status=status.HTTP_404_NOT_FOUND)
    
    manager_user.status = True
    manager_user.save()
    
    cleanup_pending_approval(str(manager_user.id))
    
    send_approval_email(
        recipient=manager_user.email,
        name=manager_user.username,
        role="Company Manager",
        approver=request.user.username
    )
    
    return Response({
        'success': True,
        'message': f'Company manager {manager_user.username} a été approuvé. Un email de confirmation lui a été envoyé.'
    })


@api_view(['POST'])
@jwt_authenticated
@role_required(allowed_roles=['admin'])
def reject_company_manager(request, user_id):
    manager_user = User.objects(id=user_id, role='company', sub_role='company_manager', status=False).first()
    if not manager_user:
        return Response({'error': 'Company manager non trouvé', 'success': False}, status=status.HTTP_404_NOT_FOUND)
    
    manager_user.rejected = True
    manager_user.save()
    
    return Response({
        'success': True,
        'message': f'Company manager {manager_user.username} a été refusé. Un email de notification lui sera envoyé.'
    })


# ============= ADMIN SPACE - GESTION DES CO DEPARTMENT HEADS =============

@api_view(['GET'])
@jwt_authenticated
@role_required(allowed_roles=['admin'], allowed_sub_roles=['admin'])
def get_pending_co_dept_heads(request):
    dept_head_admin = Admin.objects(user=request.user).first()
    if not dept_head_admin:
        return Response({'error': 'Profil administrateur non trouvé', 'success': False}, status=status.HTTP_404_NOT_FOUND)
    
    pending_co_dept_heads = []
    users = User.objects(
        role='admin',
        sub_role='co_dept_head',
        status=False
    )
    
    for user in users:
        if user.pending_admin_id == str(dept_head_admin.id):
            pending_co_dept_heads.append({
                'id': str(user.id),
                'username': user.username,
                'email': user.email,
                'full_name': "En attente d'approbation",
                'wilaya': dept_head_admin.wilaya,
                'university': dept_head_admin.university,
                'created_at': user.created_at
            })
    
    return Response({
        'success': True,
        'co_dept_heads': pending_co_dept_heads
    })


@api_view(['POST'])
@jwt_authenticated
@role_required(allowed_roles=['admin'], allowed_sub_roles=['admin'])
def approve_co_dept_head(request, user_id):
    co_dept_user = User.objects(id=user_id, role='admin', sub_role='co_dept_head', status=False).first()
    if not co_dept_user:
        return Response({'error': 'Co Department Head non trouvé', 'success': False}, status=status.HTTP_404_NOT_FOUND)
    
    dept_head_admin = Admin.objects(user=request.user).first()
    
    if not dept_head_admin:
        return Response({'error': 'Profil administrateur non trouvé', 'success': False}, status=status.HTTP_404_NOT_FOUND)
    
    if not co_dept_user.pending_admin_id or co_dept_user.pending_admin_id != str(dept_head_admin.id):
        return Response({'error': 'Ce Co Department Head n\'appartient pas à votre université', 'success': False}, status=status.HTTP_403_FORBIDDEN)
    
    co_dept_user.status = True
    co_dept_user.save()
    
    existing_admin = Admin.objects(user=co_dept_user).first()
    if not existing_admin:
        admin_profile = Admin(
            user=co_dept_user,
            full_name=co_dept_user.username,
            wilaya=dept_head_admin.wilaya,
            university=dept_head_admin.university,
        )
        admin_profile.save()
        print(f"✅ Profil Admin créé pour Co Department Head: {admin_profile.id}")
    
    send_approval_email(
        recipient=co_dept_user.email,
        name=co_dept_user.username,
        role="Co Department Head",
        approver=request.user.username
    )
    
    return Response({
        'success': True,
        'message': f'Co Department Head {co_dept_user.username} a été approuvé avec succès. Un email de confirmation lui a été envoyé.'
    })


@api_view(['POST'])
@jwt_authenticated
@role_required(allowed_roles=['admin'], allowed_sub_roles=['admin'])
def reject_co_dept_head(request, user_id):
    co_dept_user = User.objects(id=user_id, role='admin', sub_role='co_dept_head', status=False).first()
    if not co_dept_user:
        return Response({'error': 'Co Department Head non trouvé', 'success': False}, status=status.HTTP_404_NOT_FOUND)
    
    dept_head_admin = Admin.objects(user=request.user).first()
    
    if not dept_head_admin:
        return Response({'error': 'Profil administrateur non trouvé', 'success': False}, status=status.HTTP_404_NOT_FOUND)
    
    if not co_dept_user.pending_admin_id or co_dept_user.pending_admin_id != str(dept_head_admin.id):
        return Response({'error': 'Ce Co Department Head n\'appartient pas à votre université', 'success': False}, status=status.HTTP_403_FORBIDDEN)
    
    co_dept_user.rejected = True
    co_dept_user.save()
    
    return Response({
        'success': True,
        'message': f'Co Department Head {co_dept_user.username} a été refusé. Un email de notification lui sera envoyé.'
    })


# ============= GESTION DES DEMANDES DE PREUVES =============

@api_view(['POST'])
def request_proof_from_admin(request, pending_id):
    """
    Endpoint pour que le Super Admin demande des preuves
    Appelé via MongoDB Compass ou API
    """
    from .models import PendingApproval
    
    pending = PendingApproval.objects(id=pending_id, verification_status='pending').first()
    if not pending:
        return Response({'error': 'Demande non trouvée', 'success': False}, status=status.HTTP_404_NOT_FOUND)
    
    pending.verification_status = 'proof_requested'
    pending.proof_requested_at = datetime.now()
    pending.save()
    
    role_display = "Company Manager" if pending.sub_role == 'company_manager' else "Department Head"
    
    admin_email = "stageplatform.verification@gmail.com"
    
    send_proof_request_email(
        recipient=pending.email,
        name=pending.username,
        role=role_display,
        admin_email=admin_email
    )
    
    return Response({
        'success': True,
        'message': f'Demande de preuves envoyée à {pending.email}',
        'admin_email': admin_email
    })


@api_view(['POST'])
def mark_proof_received(request, pending_id):
    """
    Marque que les preuves ont été reçues (après que l'utilisateur a répondu)
    """
    from .models import PendingApproval
    
    pending = PendingApproval.objects(id=pending_id, verification_status='proof_requested').first()
    if not pending:
        return Response({'error': 'Demande non trouvée', 'success': False}, status=status.HTTP_404_NOT_FOUND)
    
    pending.verification_status = 'proof_received'
    pending.proof_received_at = datetime.now()
    pending.save()
    
    send_proof_received_confirmation(pending.email, pending.username)
    
    return Response({
        'success': True,
        'message': f'Documents marqués comme reçus pour {pending.email}'
    })


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