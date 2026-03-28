# api/authentication.py
import jwt
from django.conf import settings
from rest_framework import authentication
from rest_framework import exceptions
from .models import User

class JWTAuthentication(authentication.BaseAuthentication):
    """
    Authentification JWT personnalisée pour DRF
    """
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        
        if not auth_header:
            return None
        
        if not auth_header.startswith('Bearer '):
            return None
        
        token = auth_header.split(' ')[1]
        
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            user = User.objects(id=payload['user_id']).first()
            
            if not user:
                raise exceptions.AuthenticationFailed('Utilisateur non trouvé')
            
            if not user.status:
                raise exceptions.AuthenticationFailed('Compte inactif')
            
            print(f"✅ DRF Auth - Utilisateur authentifié: {user.email}")
            return (user, token)
            
        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed('Token expiré')
        except jwt.InvalidTokenError:
            raise exceptions.AuthenticationFailed('Token invalide')
        except Exception as e:
            print(f"❌ Erreur authentication: {e}")
            raise exceptions.AuthenticationFailed(f'Erreur: {str(e)}')