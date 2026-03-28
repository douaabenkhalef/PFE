import jwt
from datetime import datetime, timedelta
from django.conf import settings

SECRET_KEY = settings.SECRET_KEY

def create_token(user):
    payload = {
        'user_id': str(user.id),
        'email': user.email,
        'role': user.role,
        'sub_role': user.sub_role,
        'status': user.status,
        'exp': datetime.utcnow() + timedelta(days=1),
        'iat': datetime.utcnow()
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')
    return token

def verify_token(token):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        from .models import User
        user = User.objects(id=payload['user_id']).first()
        return user
    except:
        return None