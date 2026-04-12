# backend/api/middleware.py
import jwt
from django.conf import settings
from django.utils.deprecation import MiddlewareMixin
from datetime import datetime  # 🔥 AJOUTER CETTE IMPORTATION

class JWTAuthenticationMiddleware(MiddlewareMixin):
    """
    Middleware pour ajouter l'utilisateur authentifié à la requête
    """
    def process_request(self, request):
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
                    request.user = None
            except jwt.ExpiredSignatureError:
                print(f"⚠️ Token expiré")
                request.user = None
            except jwt.InvalidTokenError as e:
                print(f"❌ Token invalide: {e}")
                request.user = None
            except Exception as e:
                print(f"❌ Erreur JWT: {e}")
                request.user = None
    
    def process_response(self, request, response):
        return response
    
    def process_exception(self, request, exception):
        return None


class LastActivityMiddleware(MiddlewareMixin):
    """
    Middleware pour mettre à jour la dernière activité de l'utilisateur
    """
    def process_request(self, request):
        if hasattr(request, 'user') and request.user and hasattr(request.user, 'id'):
            try:
                from .models import User
                from datetime import datetime  # 🔥 IMPORTANT
                user = User.objects(id=str(request.user.id)).first()
                if user:
                    last_activity = user.last_activity or datetime.now()
                    if (datetime.now() - last_activity).seconds > 60:
                        user.last_activity = datetime.now()
                        user.save()
            except Exception as e:
                print(f"⚠️ Erreur mise à jour last_activity: {e}")
        return None