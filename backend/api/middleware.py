# api/middleware.py
import jwt
from django.conf import settings
from django.utils.deprecation import MiddlewareMixin
from rest_framework import status
from rest_framework.response import Response

class JWTAuthenticationMiddleware(MiddlewareMixin):
    """
    Middleware pour ajouter l'utilisateur authentifié à la requête
    """
    def process_request(self, request):
        # Initialiser request.user à None par défaut
        request.user = None
        
        auth_header = request.headers.get('Authorization')
        
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            try:
                payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
                from .models import User
                user = User.objects(id=payload['user_id']).first()
                if user and user.status:
                    request.user = user
                    print(f"✅ Utilisateur authentifié: {user.email} (role: {user.role}, sub_role: {user.sub_role})")
                else:
                    print(f"❌ Utilisateur non trouvé ou inactif")
                    request.user = None
            except jwt.ExpiredSignatureError:
                print(f"❌ Token expiré")
                request.user = None
            except jwt.InvalidTokenError as e:
                print(f"❌ Token invalide: {e}")
                request.user = None
            except Exception as e:
                print(f"❌ Erreur JWT: {e}")
                request.user = None
        else:
            print(f"ℹ️ Pas de token Authorization dans la requête")
    
    def process_response(self, request, response):
        return response
    
    def process_exception(self, request, exception):
        return None