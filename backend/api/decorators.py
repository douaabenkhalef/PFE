
from functools import wraps
from rest_framework.response import Response
from rest_framework import status

def jwt_authenticated(view_func):
    """Décorateur pour vérifier que l'utilisateur est authentifié"""
    @wraps(view_func)
    def wrapped_view(request, *args, **kwargs):
        
        if not hasattr(request, 'user') or request.user is None:
            return Response({
                'error': 'Authentication required',
                'success': False
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Vérifier que l'utilisateur est actif
        if not request.user.status:
            return Response({
                'error': 'Account is not active',
                'success': False
            }, status=status.HTTP_403_FORBIDDEN)
        
        return view_func(request, *args, **kwargs)
    return wrapped_view

def role_required(allowed_roles=None, allowed_sub_roles=None):
    """Décorateur pour vérifier les rôles"""
    def decorator(view_func):
        @wraps(view_func)
        def wrapped_view(request, *args, **kwargs):
            if request.user is None:
                return Response({
                    'error': 'Authentication required',
                    'success': False
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            if allowed_roles and request.user.role not in allowed_roles:
                return Response({
                    'error': f'Access denied. Required roles: {allowed_roles}, your role: {request.user.role}',
                    'success': False
                }, status=status.HTTP_403_FORBIDDEN)
            
            if allowed_sub_roles and request.user.sub_role not in allowed_sub_roles:
                return Response({
                    'error': f'Access denied. Required sub-roles: {allowed_sub_roles}, your sub_role: {request.user.sub_role}',
                    'success': False
                }, status=status.HTTP_403_FORBIDDEN)
            
            return view_func(request, *args, **kwargs)
        return wrapped_view
    return decorator