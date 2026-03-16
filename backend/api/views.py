from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import User, Student, Company, InternshipOffer, Application
from .serializers import (
    StudentRegistrationSerializer, 
    CompanyRegistrationSerializer,
     AdminRegistrationSerializer,
    InternshipOfferSerializer,
    ApplicationSerializer
)
from .auth import create_token
from datetime import datetime
import json
import traceback

# ============= AUTHENTICATION =============
@api_view(['POST'])
@permission_classes([AllowAny])
def register_student(request):
    """Student registration with digital CV"""
    print("\n" + "="*60)
    print("🔵 NOUVELLE TENTATIVE D'INSCRIPTION")
    print("="*60)
    print("📦 Données reçues:", request.data)
    
    serializer = StudentRegistrationSerializer(data=request.data)
    
    if serializer.is_valid():
        data = serializer.validated_data
        print("✅ Données validées")
        print("📝 Détails des données:", data)
        
        try:
            # Vérifier si l'email existe
            if User.objects(email=data['email']).first():
                print("❌ Email déjà utilisé")
                return Response({
                    'success': False,
                    'message': 'Email déjà utilisé'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Vérifier si le username existe
            if User.objects(username=data['username']).first():
                print("❌ Nom d'utilisateur déjà pris")
                return Response({
                    'success': False,
                    'message': 'Nom d\'utilisateur déjà pris'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Créer l'utilisateur
            print("🔄 Création de l'utilisateur...")
            user = User(
                username=data['username'],
                email=data['email'],
                role='student',
                is_university_email='univ.dz' in data['email']
            )
            user.set_password(data['password'])
            user.save()
            print(f"✅ Utilisateur créé avec ID: {user.id}")
            
            # Vérification que tous les champs requis pour student sont présents
            print("🔄 Vérification des champs requis pour le profil étudiant...")
            required_fields = ['full_name', 'wilaya', 'skills', 'education_level', 'university', 'major', 'graduation_year']
            missing_fields = []
            for field in required_fields:
                if field not in data or data[field] is None or (isinstance(data[field], str) and not data[field]):
                    missing_fields.append(field)
                else:
                    print(f"   ✅ {field}: {data[field]}")
            
            if missing_fields:
                print(f"❌ Champs requis manquants: {missing_fields}")
                # Supprimer l'utilisateur créé si la création du profil échoue
                user.delete()
                return Response({
                    'success': False,
                    'message': f'Champs requis manquants: {missing_fields}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Créer le profil étudiant
            print("🔄 Création du profil étudiant...")
            print(f"   - user: {user.id}")
            print(f"   - full_name: {data['full_name']}")
            print(f"   - wilaya: {data['wilaya']}")
            print(f"   - skills: {data['skills']}")
            print(f"   - github: {data.get('github', '')}")
            print(f"   - portfolio: {data.get('portfolio', '')}")
            print(f"   - education_level: {data['education_level']}")
            print(f"   - university: {data['university']}")
            print(f"   - major: {data['major']}")
            print(f"   - graduation_year: {data['graduation_year']}")
            
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
                graduation_year=data['graduation_year']
            )
            student.save()
            print(f"✅ Profil étudiant créé avec ID: {student.id}")
            
            # Générer le token JWT
            print("🔄 Génération du token JWT...")
            token = create_token(user)
            print("✅ Token généré avec succès")
            
            print("="*60)
            print("🎉 INSCRIPTION RÉUSSIE !")
            print("="*60)
            
            return Response({
                'success': True,
                'message': 'Inscription réussie',
                'token': token,
                'user': {
                    'id': str(user.id),
                    'email': user.email,
                    'role': user.role,
                    'full_name': student.full_name
                },
                'redirect_url': '/student/dashboard'
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            print(f"❌ ERREUR: {str(e)}")
            print("📋 Traceback complet:")
            traceback.print_exc()
            
            # Nettoyer l'utilisateur créé si erreur
            if 'user' in locals():
                try:
                    user.delete()
                    print("🗑️ Utilisateur supprimé suite à l'erreur")
                except:
                    pass
            
            return Response({
                'success': False,
                'message': f'Erreur lors de l\'inscription: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    print("❌ Erreurs de validation:", serializer.errors)
    return Response({
        'success': False,
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def register_company(request):
    """Company registration"""
    print("\n" + "="*60)
    print("🔵 INSCRIPTION ENTREPRISE")
    print("="*60)
    print("📦 Données reçues:", request.data)
    
    serializer = CompanyRegistrationSerializer(data=request.data)
    
    if serializer.is_valid():
        data = serializer.validated_data
        print("✅ Données validées")
        
        try:
            # Vérifier si l'email existe
            if User.objects(email=data['email']).first():
                print("❌ Email déjà utilisé")
                return Response({
                    'success': False,
                    'message': 'Email déjà utilisé'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Vérifier si le username existe
            if User.objects(username=data['username']).first():
                print("❌ Nom d'utilisateur déjà pris")
                return Response({
                    'success': False,
                    'message': 'Nom d\'utilisateur déjà pris'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Créer l'utilisateur
            print("🔄 Création de l'utilisateur...")
            user = User(
                username=data['username'],
                email=data['email'],
                role='company'
            )
            user.set_password(data['password'])
            user.save()
            print(f"✅ Utilisateur créé: {user.id}")
            
            # Créer l'entreprise
            print("🔄 Création du profil entreprise...")
            company = Company(
                user=user,
                company_name=data['company_name'],
                description=data['description'],
                location=data['location'],
                website=data.get('website', ''),
                industry=data['industry']
            )
            company.save()
            print(f"✅ Profil entreprise créé")
            
            # Générer le token
            print("🔄 Génération du token...")
            token = create_token(user)
            
            return Response({
                'success': True,
                'message': 'Inscription entreprise réussie',
                'token': token,
                'user': {
                    'id': str(user.id),
                    'email': user.email,
                    'role': user.role,
                    'company_name': company.company_name
                },
                'redirect_url': '/company/dashboard'
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            print(f"❌ Erreur: {str(e)}")
            traceback.print_exc()
            
            # Nettoyer l'utilisateur créé si erreur
            if 'user' in locals():
                try:
                    user.delete()
                except:
                    pass
            
            return Response({
                'success': False,
                'message': f'Erreur: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return Response({
        'success': False,
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """User login"""
    email = request.data.get('email')
    password = request.data.get('password')
    
    print(f"🔵 Tentative de connexion: {email}")
    
    # Chercher l'utilisateur
    user = User.objects(email=email).first()
    
    if user and user.check_password(password):
        print(f"✅ Connexion réussie pour {email}")
        token = create_token(user)
        
        # URLs de redirection selon le rôle
        redirect_urls = {
            'student': '/student/dashboard',
            'company': '/company/dashboard',
            'admin': '/admin/dashboard'
        }
        
        user_data = {
            'id': str(user.id),
            'email': user.email,
            'role': user.role
        }
        
        # Ajouter les infos spécifiques au rôle
        if user.role == 'student':
            student = Student.objects.get(user=user)
            user_data['full_name'] = student.full_name
        elif user.role == 'company':
            company = Company.objects.get(user=user)
            user_data['company_name'] = company.company_name
        
        return Response({
            'success': True,
            'message': 'Connexion réussie',
            'token': token,
            'user': user_data,
            'redirect_url': redirect_urls.get(user.role, '/dashboard')
        })
    
    print(f"❌ Échec de connexion pour {email}")
    return Response({
        'success': False,
        'message': 'Email ou mot de passe incorrect.'
    }, status=status.HTTP_401_UNAUTHORIZED)


# ============= STUDENT SPACE =============
@api_view(['GET'])
def student_dashboard(request):
    """Student dashboard"""
    # À implémenter avec vérification du token
    return Response({'message': 'Student dashboard'})


@api_view(['GET'])
def search_offers(request):
    """Search internship offers"""
    return Response({'message': 'Search offers'})


@api_view(['POST'])
def apply_to_offer(request, offer_id):
    """Apply to an offer"""
    return Response({'message': f'Apply to offer {offer_id}'})


# ============= COMPANY SPACE =============
@api_view(['GET'])
def company_dashboard(request):
    """Company dashboard"""
    return Response({'message': 'Company dashboard'})


@api_view(['POST'])
def create_offer(request):
    """Create internship offer"""
    return Response({'message': 'Create offer'})


@api_view(['PUT'])
def update_offer(request, offer_id):
    """Update offer"""
    return Response({'message': f'Update offer {offer_id}'})


@api_view(['POST'])
def respond_to_candidate(request, application_id):
    """Respond to candidate"""
    return Response({'message': f'Respond to candidate {application_id}'})


# ============= ADMIN SPACE =============
@api_view(['GET'])
def admin_dashboard(request):
    """Admin dashboard"""
    return Response({'message': 'Admin dashboard'})


@api_view(['POST'])
def validate_application(request, application_id):
    """Validate application"""
    return Response({'message': f'Validate application {application_id}'})


@api_view(['GET'])
def generate_agreement(request, application_id):
    """Generate agreement"""
    return Response({'message': f'Generate agreement {application_id}'})


# ============= UTILITIES =============
@api_view(['GET'])
@permission_classes([AllowAny])
def get_skills_tags(request):
    """Get list of common tech skills"""
    common_skills = [
        'React', 'Angular', 'Vue.js', 'Node.js', 'Django', 'Flask',
        'Java', 'Spring Boot', 'Python', 'PHP', 'Laravel',
        'JavaScript', 'TypeScript', 'HTML/CSS', 'Bootstrap',
        'MongoDB', 'MySQL', 'PostgreSQL', 'Firebase',
        'Git', 'Docker', 'AWS', 'REST API', 'GraphQL'
    ]
    return Response({'skills': common_skills})
@api_view(['POST'])
@permission_classes([AllowAny])
def register_admin(request):
    """Admin registration"""
    print("\n" + "="*60)
    print("🔵 INSCRIPTION ADMIN")
    print("="*60)
    print("📦 Données reçues:", request.data)
    
    serializer = AdminRegistrationSerializer(data=request.data)
    
    if serializer.is_valid():
        data = serializer.validated_data
        print("✅ Données validées")
        
        try:
            # Vérifier si l'email existe déjà
            if User.objects(email=data['email']).first():
                return Response({
                    'success': False,
                    'message': 'Email déjà utilisé'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Vérifier si le username existe déjà
            if User.objects(username=data['username']).first():
                return Response({
                    'success': False,
                    'message': 'Nom d\'utilisateur déjà pris'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Créer l'utilisateur avec rôle admin
            user = User(
                username=data['username'],
                email=data['email'],
                role='admin',
                is_university_email='univ.dz' in data['email']
            )
            user.set_password(data['password'])
            user.save()
            print(f"✅ Admin créé avec ID: {user.id}")
            
            # Créer le profil admin avec wilaya et university
            try:
                from .models import Admin
                admin = Admin(
                    user=user,
                    full_name=data['full_name'],
                    wilaya=data['wilaya'],  # ← AJOUTÉ
                    university=data['university']  # ← AJOUTÉ
                )
                admin.save()
                print("✅ Profil admin créé avec wilaya et university")
            except Exception as e:
                print(f"⚠️ Profil admin non créé: {e}")
            
            # Générer le token
            token = create_token(user)
            
            return Response({
                'success': True,
                'message': 'Inscription admin réussie',
                'token': token,
                'user': {
                    'id': str(user.id),
                    'email': user.email,
                    'role': user.role,
                    'full_name': data['full_name'],
                    'wilaya': data['wilaya'],  # ← AJOUTÉ
                    'university': data['university']  # ← AJOUTÉ
                },
                'redirect_url': '/admin/dashboard'
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            print(f"❌ Erreur: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({
                'success': False,
                'message': f'Erreur: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    print("❌ Erreurs de validation:", serializer.errors)
    return Response({
        'success': False,
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)