from mongoengine import Document, StringField, EmailField, ListField, URLField, IntField, BooleanField, DateTimeField, ReferenceField, FileField, DictField
from datetime import datetime
import bcrypt


# ==================== PERMISSION MODEL (DOIT ÊTRE AVANT USER) ====================

class UserPermission(Document):
    """
    Gestion des permissions avancées pour les utilisateurs
    """
    meta = {'collection': 'user_permissions'}
    
    user_id = StringField(required=True, unique=True)
    
    # ============ PERMISSIONS HIRING MANAGER ============
    can_manage_applications = BooleanField(default=True)      # Gérer les candidatures
    can_manage_hiring_managers = BooleanField(default=False)  # Gérer les hiring managers (réservé Company Manager)
    can_create_offer = BooleanField(default=True)             # Créer des offres
    can_modify_offer = BooleanField(default=True)             # Modifier des offres
    can_delete_offer = BooleanField(default=True)             # Supprimer des offres
    can_manage_company_profile = BooleanField(default=False)  # Gérer le profil entreprise (réservé Company Manager)
    
    # ============ PERMISSIONS CO DEPT HEAD ============
    can_manage_conventions = BooleanField(default=True)       # Gérer les conventions (valider/refuser)
    can_manage_co_dept_heads = BooleanField(default=False)    # Gérer les co dept heads (réservé Dept Head)
    can_add_signature = BooleanField(default=True)            # Ajouter une signature
    can_manage_university_profile = BooleanField(default=False) # Gérer le profil université (réservé Dept Head)
    
    created_at = DateTimeField(default=datetime.now)
    updated_at = DateTimeField(default=datetime.now)
    
    def __str__(self):
        return f"Permissions for user {self.user_id}"

# ==================== USER MODEL ====================

class User(Document):
    meta = {'collection': 'users'}
    
    username = StringField(required=True, unique=True, max_length=50)
    email = EmailField(required=True, unique=True)
    password_hash = StringField(required=True, max_length=128)
    role = StringField(required=True, choices=['student', 'company', 'admin'])
    sub_role = StringField(default='')
    status = BooleanField(default=False)
    rejected = BooleanField(default=False)
    is_university_email = BooleanField(default=False)
    created_at = DateTimeField(default=datetime.now)
    updated_at = DateTimeField(default=datetime.now)
    
    pending_company_id = StringField(default='')
    pending_admin_id = StringField(default='')
    
    # Référence vers les permissions (maintenant UserPermission est défini)
    permissions = ReferenceField('UserPermission', null=True, reverse_delete_rule=2)
    
    def set_password(self, password):
        salt = bcrypt.gensalt()
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
        self.save()
    
    def check_password(self, password):
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
    
    def __str__(self):
        return f"{self.email} - {self.role}"


# ==================== COMPANY MODEL ====================

class Company(Document):
    meta = {'collection': 'companies'}
    
    user = ReferenceField(User, required=False, unique=True, null=True, blank=True, reverse_delete_rule=2)
    company_name = StringField(required=True, max_length=200)
    logo = FileField(blank=True)
    description = StringField(required=True)
    location = StringField(required=True, max_length=100)
    website = StringField(blank=True, default='')
    industry = StringField(required=True, max_length=100)
    verified = BooleanField(default=False)
    parent_company = ReferenceField('self', null=True, default=None)
    
    def __str__(self):
        return self.company_name


# ==================== STUDENT MODEL ====================

class Student(Document):
    meta = {'collection': 'students'}
    
    user = ReferenceField(User, required=True, unique=True, reverse_delete_rule=2)
    full_name = StringField(required=True, max_length=100)
    wilaya = StringField(required=True, max_length=50)
    skills = ListField(StringField(), default=[])
    github = StringField(blank=True, default='')
    portfolio = StringField(blank=True, default='')
    education_level = StringField(required=True, max_length=100)
    university = StringField(required=True, max_length=200)
    major = StringField(required=True, max_length=100)
    graduation_year = IntField(required=True)
    cv_file = FileField(blank=True)
    is_placed = BooleanField(default=False)
    placed_company = ReferenceField(Company, null=True, reverse_delete_rule=3)
    placement_date = DateTimeField(null=True)
    
    def __str__(self):
        return self.full_name


# ==================== INTERNSHIP OFFER MODEL ====================

class InternshipOffer(Document):
    meta = {'collection': 'offers'}
    
    company = ReferenceField(Company, required=True, reverse_delete_rule=2)
    title = StringField(required=True, max_length=200)
    description = StringField(required=True)
    wilaya = StringField(required=True, max_length=50)
    internship_type = StringField(required=True, choices=['PFE', 'ouvrier', 'technicien', 'été'])
    required_skills = ListField(StringField(), default=[])
    duration = StringField(required=True, max_length=50)
    start_date = DateTimeField(required=True)
    is_active = BooleanField(default=True)
    created_at = DateTimeField(default=datetime.now)
    deadline = DateTimeField(required=True)
    company_name = StringField(max_length=200)
    
    def __str__(self):
        return f"{self.title} - {self.company.company_name}"


# ==================== APPLICATION MODEL ====================

class Application(Document):
    meta = {'collection': 'applications'}
    
    student = ReferenceField(Student, required=True, reverse_delete_rule=2)
    offer = ReferenceField(InternshipOffer, required=True, reverse_delete_rule=2)
    
    status = StringField(required=True, choices=[
        'pending',                    
        'accepted_by_company',        
        'rejected_by_company',        
        'validated_by_co_dept',       
        'rejected_by_co_dept',        
        'completed'                   
    ], default='pending')
    
    applied_at = DateTimeField(default=datetime.now)
    company_response_date = DateTimeField(null=True)
    company_notes = StringField(blank=True)
    admin_validation_date = DateTimeField(null=True)
    admin_notes = StringField(blank=True)
    internship_agreement = FileField(blank=True)
    cv_file = FileField(blank=True)
    cover_letter = StringField(blank=True)
    
    co_dept_validation_date = DateTimeField(null=True)
    co_dept_notes = StringField(blank=True)      
    convention_pdf = FileField(blank=True)       
    co_dept_id = StringField(blank=True)         
    
    def __str__(self):
        return f"{self.student.full_name} - {self.offer.title}"


# ==================== NOTIFICATION MODEL ====================

class Notification(Document):
    meta = {'collection': 'notifications'}
    
    recipient = ReferenceField(User, required=True)
    message = StringField(required=True)
    is_read = BooleanField(default=False)
    created_at = DateTimeField(default=datetime.now)
    related_id = StringField(blank=True, null=True)
    
    def __str__(self):
        return f"Notification for {self.recipient.email}: {self.message[:20]}"


# ==================== INTERNSHIP AGREEMENT MODEL ====================

class InternshipAgreement(Document):
    meta = {'collection': 'agreements'}
    
    application = ReferenceField(Application, required=True, unique=True, reverse_delete_rule=2)
    document = FileField(required=True)
    generated_at = DateTimeField(default=datetime.now)
    student_name = StringField(required=True, max_length=200)
    company_name = StringField(required=True, max_length=200)
    university = StringField(required=True, max_length=200)
    internship_title = StringField(required=True, max_length=200)
    start_date = DateTimeField(required=True)
    end_date = DateTimeField(required=True)
    
    def __str__(self):
        return f"Convention - {self.student_name} - {self.company_name}"


# ==================== ADMIN MODEL ====================

class Admin(Document):
    meta = {'collection': 'admins'}
    
    user = ReferenceField(User, required=True, unique=True, reverse_delete_rule=2)
    full_name = StringField(required=True, max_length=100)
    wilaya = StringField(required=True, max_length=50)
    university = StringField(required=True, max_length=200)
    
    def __str__(self):
        return f"{self.full_name} - {self.user.email}"


# ==================== OTP VERIFICATION MODEL ====================

class OTPVerification(Document):
    """Stocke les codes OTP temporaires pour la vérification d'email"""
    meta = {'collection': 'otp_verifications'}
    
    email = StringField(required=True)
    code = StringField(required=True)
    data = DictField()  
    created_at = DateTimeField(default=datetime.now)
    expires_at = DateTimeField(required=True)
    used = BooleanField(default=False)
    
    def is_valid(self):
        return not self.used and datetime.now() < self.expires_at
    
    def __str__(self):
        return f"{self.email} - {self.code} - Valid: {self.is_valid()}"


# ==================== PENDING APPROVAL MODEL ====================

class PendingApproval(Document):
    """
    Collection pour les comptes en attente d'approbation
    """
    meta = {'collection': 'pending_approvals'}
    
    user_id = StringField(required=True, unique=True)
    email = StringField(required=True)
    username = StringField(required=True)
    role = StringField(required=True, choices=['company', 'admin'])
    sub_role = StringField(required=True)
    
    full_name = StringField()
    company_name = StringField()
    description = StringField()
    location = StringField()
    website = StringField()
    industry = StringField()
    university = StringField()
    wilaya = StringField()
    
    verification_status = StringField(
        default='pending', 
        choices=['pending', 'proof_requested', 'proof_received', 'approved', 'rejected']
    )
    admin_notes = StringField(default='')
    proof_requested_at = DateTimeField(null=True)
    proof_received_at = DateTimeField(null=True)
    email_sent = BooleanField(default=False)
    
    created_at = DateTimeField(default=datetime.now)
    updated_at = DateTimeField(default=datetime.now)
    
    def __str__(self):
        return f"{self.username} - {self.role}/{self.sub_role} - {self.verification_status}"


# ==================== ACTIVITY LOG MODEL ====================

class ActivityLog(Document):
    """
    Collection pour les logs d'activité des utilisateurs
    """
    meta = {'collection': 'activity_logs'}
    
    user_id = StringField(required=True)
    user_email = StringField(required=True)
    user_role = StringField(required=True)
    user_sub_role = StringField(required=True)
    
    action_type = StringField(required=True, choices=[
        'approve_hiring_manager',
        'reject_hiring_manager',
        'create_offer',
        'update_offer',
        'delete_offer',
        'accept_application',
        'reject_application',
        'approve_co_dept_head',
        'reject_co_dept_head',
        'validate_convention',
        'reject_convention',
        'generate_convention',
        'update_permissions',
        'delete_hiring_manager',
        'delete_co_dept_head'
    ])
    
    target_type = StringField(required=True, choices=[
        'user', 'offer', 'application', 'convention'
    ])
    target_id = StringField(required=True)
    target_name = StringField()
    
    details = DictField(default={})
    
    status = StringField(choices=['success', 'failed'], default='success')
    error_message = StringField(default='')
    
    created_at = DateTimeField(default=datetime.now)
    ip_address = StringField(default='')
    
    def __str__(self):
        return f"{self.created_at} - {self.user_email} - {self.action_type}"
    

 
