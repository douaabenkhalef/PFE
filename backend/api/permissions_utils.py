# backend/api/permissions_utils.py
from .models import User, UserPermission
from datetime import datetime

def get_user_permissions(user):
    """Récupère les permissions d'un utilisateur"""
    try:
        if user.permissions:
            return user.permissions
        return create_default_permissions(user)
    except Exception as e:
        print(f"Erreur récupération permissions: {e}")
        return None

def create_default_permissions(user):
    """Crée des permissions par défaut basées sur le rôle"""
    try:
        if user.role == 'company':
            if user.sub_role == 'company_manager':
                # Company Manager a toutes les permissions
                perm = UserPermission(
                    user_id=str(user.id),
                    can_manage_applications=True,
                    can_manage_hiring_managers=True,
                    can_create_offer=True,
                    can_modify_offer=True,
                    can_delete_offer=True,
                    can_manage_company_profile=True
                )
            else:  # hiring_manager
                # Hiring Manager a les permissions de base
                perm = UserPermission(
                    user_id=str(user.id),
                    can_manage_applications=True,
                    can_manage_hiring_managers=False,
                    can_create_offer=True,
                    can_modify_offer=True,
                    can_delete_offer=True,
                    can_manage_company_profile=False
                )
        elif user.role == 'admin':
            if user.sub_role == 'admin':  # Department Head
                # Department Head a toutes les permissions
                perm = UserPermission(
                    user_id=str(user.id),
                    can_manage_conventions=True,
                    can_manage_co_dept_heads=True,
                    can_add_signature=True,
                    can_add_stamp=True,
                    can_manage_university_profile=True
                )
            else:  # co_dept_head
                # Co Department Head a les permissions de base
                perm = UserPermission(
                    user_id=str(user.id),
                    can_manage_conventions=True,
                    can_manage_co_dept_heads=False,
                    can_add_signature=True,
                    can_add_stamp=True,
                    can_manage_university_profile=False
                )
        else:
            return None
        
        perm.save()
        user.permissions = perm
        user.save()
        return perm
    except Exception as e:
        print(f"Erreur création permissions: {e}")
        return None

def update_user_permissions(user_id, permissions_data):
    """Met à jour les permissions d'un utilisateur"""
    try:
        perm = UserPermission.objects(user_id=user_id).first()
        if not perm:
            user = User.objects(id=user_id).first()
            if user:
                perm = create_default_permissions(user)
        
        if perm:
            for key, value in permissions_data.items():
                if hasattr(perm, key):
                    setattr(perm, key, value)
            perm.updated_at = datetime.now()
            perm.save()
            return True
        return False
    except Exception as e:
        print(f"Erreur mise à jour permissions: {e}")
        return False

def check_permission(user, permission_name):
    """Vérifie si un utilisateur a une permission spécifique"""
    try:
        perm = get_user_permissions(user)
        if perm and hasattr(perm, permission_name):
            return getattr(perm, permission_name)
        return False
    except Exception:
        return False