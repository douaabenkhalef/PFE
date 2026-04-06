
import time
import threading
from datetime import datetime, timedelta
from api.models import User, Company, Admin, PendingApproval
from api.email_utils import send_approval_email, send_rejection_email, send_proof_request_email

class StatusChecker:
    """
    Vérifie périodiquement les changements dans la base de données
    et envoie des emails pour:
    - Les approbations (status: false → true)
    - Les refus (rejected: false → true)
    - Les demandes de preuves (verification_status: pending → proof_requested)
    - Les approbations/refus finaux (verification_status: approved/rejected)
    """
    
    def __init__(self, check_interval=30):
        self.check_interval = check_interval
        self.running = False
        self.last_check_time = datetime.now()
        self.processed_approvals = set()
        self.processed_rejections = set()
        self.thread = None
    
    def start(self):
        """Démarre la vérification périodique"""
        if self.running:
            return
        self.running = True
        self.thread = threading.Thread(target=self._check_loop, daemon=True)
        self.thread.start()
        print(f" Status checker démarré - Vérification toutes les {self.check_interval} secondes")
    
    def stop(self):
        """Arrête la vérification"""
        self.running = False
    
    def _check_loop(self):
        """Boucle de vérification"""
        while self.running:
            try:
                self._check_newly_approved_users()
                self._check_newly_rejected_users()
                self._check_pending_approvals()
                self._check_pending_approvals_status()
            except Exception as e:
                print(f" Erreur dans le status checker: {e}")
            time.sleep(self.check_interval)
    
    def _check_newly_approved_users(self):
        """Vérifie les nouveaux utilisateurs approuvés (status: false → true)"""
        time_threshold = self.last_check_time - timedelta(seconds=self.check_interval)
        
        users = User.objects(
            status=True,
            rejected=False,
            updated_at__gte=time_threshold
        )
        
        for user in users:
            user_id = str(user.id)
            
            if user_id not in self.processed_approvals:
                role = user.sub_role or user.role
                if role in ['company_manager', 'hiring_manager', 'admin', 'co_dept_head']:
                    
                    role_display = {
                        'company_manager': 'Company Manager',
                        'hiring_manager': 'Hiring Manager',
                        'admin': 'Department Head',
                        'co_dept_head': 'Co Department Head'
                    }.get(role, role)
                    
                    send_approval_email(
                        recipient=user.email,
                        name=user.username,
                        role=role_display,
                        approver="Administrateur (via base de données)"
                    )
                    
                    self.processed_approvals.add(user_id)
                    print(f" Email d'approbation envoyé à {user.email} ({role_display})")
        
        self.last_check_time = datetime.now()
    
    def _check_newly_rejected_users(self):
        """Vérifie les nouveaux utilisateurs refusés (rejected: false → true)"""
        time_threshold = self.last_check_time - timedelta(seconds=self.check_interval)
        
        users = User.objects(
            rejected=True,
            updated_at__gte=time_threshold
        )
        
        for user in users:
            user_id = str(user.id)
            
            if user_id not in self.processed_rejections:
                role = user.sub_role or user.role
                if role in ['company_manager', 'hiring_manager', 'admin', 'co_dept_head']:
                    
                    role_display = {
                        'company_manager': 'Company Manager',
                        'hiring_manager': 'Hiring Manager',
                        'admin': 'Department Head',
                        'co_dept_head': 'Co Department Head'
                    }.get(role, role)
                    
                    user_email = user.email
                    user_name = user.username
                    
                    send_rejection_email(
                        recipient=user_email,
                        name=user_name,
                        role=role_display,
                        approver="Administrateur (via base de données)"
                    )
                    
                    self.processed_rejections.add(user_id)
                    print(f" Email de refus envoyé à {user_email} ({role_display})")
                    
                    user.delete()
                    print(f" Utilisateur {user_email} supprimé")
    
    def _check_pending_approvals(self):
        """
        Vérifie les demandes en attente qui sont marquées 'proof_requested'
        et qui n'ont pas encore reçu d'email
        """
        pending_list = PendingApproval.objects(
            verification_status='proof_requested',
            email_sent=False
        )
        
        for pending in pending_list:
            if pending.sub_role == 'company_manager':
                role_display = "Company Manager"
            elif pending.sub_role == 'admin':
                role_display = "Department Head"
            else:
                role_display = pending.sub_role or pending.role
            
            admin_email = "stageplatform.verification@gmail.com"
            
            result = send_proof_request_email(
                recipient=pending.email,
                name=pending.username,
                role=role_display,
                admin_email=admin_email
            )
            
            if result:
                pending.email_sent = True
                pending.save()
                print(f" Email de demande de preuves envoyé à {pending.email} ({role_display})")
            else:
                print(f" Erreur d'envoi pour {pending.email}")
    
    def _check_pending_approvals_status(self):
        """
        Vérifie les demandes qui sont marquées 'approved' ou 'rejected'
        et met à jour l'utilisateur correspondant
        """
       
        approved_list = PendingApproval.objects(
            verification_status='approved',
            email_sent=False
        )
        
        for pending in approved_list:
            user = User.objects(id=pending.user_id).first()
            
            role_display = "Company Manager" if pending.sub_role == 'company_manager' else "Department Head"
            
            if user:
                
                user.status = True
                user.save()
                
               
                send_approval_email(
                    recipient=pending.email,
                    name=pending.username,
                    role=role_display,
                    approver="Administrateur (via base de données)"
                )
                
                pending.email_sent = True
                pending.save()
                print(f" Compte approuvé et email envoyé à {pending.email} ({role_display})")
            else:
                
                pending.email_sent = True
                pending.save()
                print(f" Utilisateur {pending.email} non trouvé, demande marquée comme traitée")
        
        
        rejected_list = PendingApproval.objects(
            verification_status='rejected',
            email_sent=False
        )
        
        for pending in rejected_list:
            user = User.objects(id=pending.user_id).first()
            
            role_display = "Company Manager" if pending.sub_role == 'company_manager' else "Department Head"
            
            if user:
                
                send_rejection_email(
                    recipient=pending.email,
                    name=pending.username,
                    role=role_display,
                    approver="Administrateur (via base de données)"
                )
                
                
                if pending.sub_role == 'company_manager':
                    company = Company.objects(user=user).first()
                    if company:
                        company.delete()
                elif pending.sub_role == 'admin':
                    admin = Admin.objects(user=user).first()
                    if admin:
                        admin.delete()
                user.delete()
                
                pending.email_sent = True
                pending.save()
                print(f" Compte refusé et email envoyé à {pending.email} ({role_display})")
            else:
                
                pending.email_sent = True
                pending.save()
                print(f" Utilisateur {pending.email} non trouvé, demande marquée comme traitée")


status_checker = StatusChecker(check_interval=30)

def start_status_checker():
    """Démarre le status checker"""
    status_checker.start()

def stop_status_checker():
    """Arrête le status checker"""
    status_checker.stop()