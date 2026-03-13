from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, Student, Company

@api_view(['POST'])
@permission_classes([AllowAny])
def register_student(request):
    """Inscription étudiant"""
    data = request.data
    
    if User.objects(username=data.get('username')).first():
        return Response({'error': 'Nom d\'utilisateur déjà pris'}, status=400)
    
    if User.objects(email=data.get('email')).first():
        return Response({'error': 'Email déjà utilisé'}, status=400)
    
    user = User(
        username=data.get('username'),
        email=data.get('email'),
        role='student'
    )
    user.set_password(data.get('password'))
    user.save()
    
    student = Student(
        user=str(user.id),
        full_name=data.get('full_name', ''),
        wilaya=data.get('wilaya', ''),
        skills=data.get('skills', []),
        github=data.get('github', ''),
        portfolio=data.get('portfolio', '')
    )
    student.save()
    
    refresh = RefreshToken()
    refresh['user_id'] = str(user.id)
    refresh['username'] = user.username
    refresh['role'] = user.role
    
    return Response({
        'token': str(refresh.access_token),
        'refresh': str(refresh),
        'user': {
            'id': str(user.id),
            'username': user.username,
            'email': user.email,
            'role': user.role
        }
    }, status=201)

@api_view(['POST'])
@permission_classes([AllowAny])
def register_company(request):
    """Inscription entreprise"""
    data = request.data
    
    if User.objects(username=data.get('username')).first():
        return Response({'error': 'Nom d\'utilisateur déjà pris'}, status=400)
    
    if User.objects(email=data.get('email')).first():
        return Response({'error': 'Email déjà utilisé'}, status=400)
    
    user = User(
        username=data.get('username'),
        email=data.get('email'),
        role='company'
    )
    user.set_password(data.get('password'))
    user.save()
    
    company = Company(
        user=str(user.id),
        name=data.get('company_name'),
        description=data.get('description', ''),
        wilaya=data.get('wilaya', ''),
        website=data.get('website', '')
    )
    company.save()
    
    refresh = RefreshToken()
    refresh['user_id'] = str(user.id)
    refresh['username'] = user.username
    refresh['role'] = user.role
    
    return Response({
        'token': str(refresh.access_token),
        'refresh': str(refresh),
        'user': {
            'id': str(user.id),
            'username': user.username,
            'email': user.email,
            'role': user.role
        }
    }, status=201)

@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """Connexion"""
    data = request.data
    username = data.get('username')
    password = data.get('password')
    
    user = User.objects(username=username).first()
    
    if not user or not user.check_password(password):
        return Response({'error': 'Identifiants invalides'}, status=401)
    
    refresh = RefreshToken()
    refresh['user_id'] = str(user.id)
    refresh['username'] = user.username
    refresh['role'] = user.role
    
    return Response({
        'token': str(refresh.access_token),
        'refresh': str(refresh),
        'user': {
            'id': str(user.id),
            'username': user.username,
            'email': user.email,
            'role': user.role
        }
    })

@api_view(['GET'])
def me(request):
    """Récupérer l'utilisateur connecté"""
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return Response({'error': 'Non authentifié'}, status=401)
    
    try:
        token = auth_header.split(' ')[1]
        from rest_framework_simplejwt.tokens import AccessToken
        token_obj = AccessToken(token)
        user_id = token_obj['user_id']
        
        user = User.objects(id=user_id).first()
        if not user:
            return Response({'error': 'Utilisateur non trouvé'}, status=404)
        
        return Response({
            'id': str(user.id),
            'username': user.username,
            'email': user.email,
            'role': user.role
        })
    except Exception as e:
        return Response({'error': str(e)}, status=401)
