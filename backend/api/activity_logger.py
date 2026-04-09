
from datetime import datetime
from .models import ActivityLog

def log_activity(
    user,
    action_type,
    target_type,
    target_id,
    target_name='',
    details=None,
    status='success',
    error_message='',
    ip_address=''
):
   
    try:
        log = ActivityLog(
            user_id=str(user.id),
            user_email=user.email,
            user_role=user.role,
            user_sub_role=user.sub_role or '',
            action_type=action_type,
            target_type=target_type,
            target_id=target_id,
            target_name=target_name,
            details=details or {},
            status=status,
            error_message=error_message,
            ip_address=ip_address,
            created_at=datetime.now()
        )
        log.save()
        return True
    except Exception as e:
        print(f"Erreur lors du logging: {e}")
        return False