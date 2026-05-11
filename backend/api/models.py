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
    can_manage_applications = BooleanField(default=True)
    can_manage_hiring_managers = BooleanField(default=False)
    can_create_offer = BooleanField(default=True)
    can_modify_offer = BooleanField(default=True)
    can_delete_offer = BooleanField(default=True)
    can_manage_company_profile = BooleanField(default=False)
    
    # ============ PERMISSIONS CO DEPT HEAD ============
    can_manage_conventions = BooleanField(default=True)
    can_manage_co_dept_heads = BooleanField(default=False)
    can_add_signature = BooleanField(default=True)
    can_add_stamp = BooleanField(default=True)
    can_manage_university_profile = BooleanField(default=False)
    
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
    role = StringField(required=True, choices=['student', 'company', 'admin', 'super_admin'])
    sub_role = StringField(default='')
    status = BooleanField(default=False)
    rejected = BooleanField(default=False)
    is_university_email = BooleanField(default=False)
    created_at = DateTimeField(default=datetime.now)
    updated_at = DateTimeField(default=datetime.now)
    two_fa_enabled = BooleanField(default=False)
    recovery_email = EmailField(blank=True, null=True)
    is_super_admin = BooleanField(default=False)
    
    
    bio = StringField(max_length=500, default='')
    phone = StringField(max_length=30, default='')
    profile_picture = StringField(blank=True, default='')
   
    last_activity = DateTimeField(default=datetime.now)
    
    pending_company_id = StringField(default='')
    pending_admin_id = StringField(default='')
    
    permissions = ReferenceField('UserPermission', null=True, reverse_delete_rule=2)
    
    def set_password(self, password):
        salt = bcrypt.gensalt()
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
        self.save()
    
    def check_password(self, password):
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
    
    def is_online(self):
        """Vérifie si l'utilisateur est en ligne (activité dans les 5 dernières minutes)"""
        if not self.last_activity:
            return False
        return (datetime.now() - self.last_activity).seconds < 300  # 5 minutes
    
    def __str__(self):
        return f"{self.email} - {self.role}"


# ==================== COMPANY MODEL ====================

class Company(Document):
    meta = {'collection': 'companies'}
    
    user = ReferenceField(User, required=False, unique=True, null=True, blank=True, reverse_delete_rule=2)
    company_name = StringField(required=True, max_length=200)
    logo = StringField(blank=True, default='')
    description = StringField(required=True)
    location = StringField(required=True, max_length=100)
    website = StringField(blank=True, default='')
    phone = StringField(blank=True, default='')
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
    created_at = DateTimeField(default=datetime.now)
    # Ajouter ces champs dans la classe Student
    bio = StringField(max_length=500, default='')
    phone = StringField(max_length=20, default='')
    profile_picture = StringField(blank=True, default='')
    cover_image = FileField(blank=True)
    profile_visibility = DictField(default={
       'email_visible': True,
       'phone_visible': True,
       'wilaya_visible': True,
       'university_visible': True,
       'skills_visible': True,
       'contact_visible': True,
       'profile_public': True
     })
    
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
    image = FileField(blank=True)
    
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
    
    # ============ CHAMPS POUR LES SIGNATURES ============
    university_signature = StringField(blank=True, default='')
    university_signature_date = DateTimeField(null=True)
    university_signed_by = StringField(blank=True)
    
    company_signature = StringField(blank=True, default='')
    company_signature_date = DateTimeField(null=True)
    company_signed_by = StringField(blank=True)
    
    student_signature = StringField(blank=True, default='')
    student_signature_date = DateTimeField(null=True)
    student_signed_by = StringField(blank=True)
    
    signature_status = StringField(
        choices=['pending', 'university_signed', 'company_signed', 'student_signed', 'fully_signed'],
        default='pending'
    )
    
    # ============ CHAMPS POUR LE CACHET (TAMPON) ============
    university_stamp = StringField(blank=True, default='')
    university_stamp_date = DateTimeField(null=True)
    stamp_added_by = StringField(blank=True)
    stamp_status = StringField(
        choices=['pending', 'stamped'],
        default='pending'
    )
    
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
        'delete_co_dept_head',
        'add_signature',
        'update_company_profile',
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
    
class ChatMessage(Document):
    """
    Messages de chat entre les membres de l'université
    """
    meta = {'collection': 'chat_messages'}
    
    university = StringField(required=True, max_length=200)
    user_id = StringField(required=True)
    username = StringField(required=True, max_length=50)
    message = StringField(required=True)
    created_at = DateTimeField(default=datetime.now)
    is_read = BooleanField(default=False)
    internship_id = StringField(blank=True, default='') 
    
    def __str__(self):
        return f"{self.username}: {self.message[:50]}"
   



class PrivateChatMessage(Document):
  
    meta = {'collection': 'private_chat_messages'}
    
    sender_id = StringField(required=True)
    sender_name = StringField(required=True)
    receiver_id = StringField(required=True)
    receiver_name = StringField(required=True)
    university = StringField(required=True, max_length=200)
    message = StringField(required=True)
    message_type = StringField(default='text', choices=['text', 'image', 'file'])
    file_url = StringField(default='')
    file_name = StringField(default='')
    file_size = IntField(default=0)
    is_read = BooleanField(default=False)
    created_at = DateTimeField(default=datetime.now)
    
    def __str__(self):
        return f"{self.sender_name} -> {self.receiver_name}: {self.message[:50]}"


# ===========UNIVERSITY PROFILE======================
class UniversityProfile(Document):
   
    meta = {'collection': 'university_profiles'}
 
    university = StringField(required=True, unique=True, max_length=200)
 
    name = StringField(max_length=200, default='')
    description = StringField(default='')
    email = StringField(default='')
    phone = StringField(default='', max_length=30)
    address = StringField(default='')
    wilaya = StringField(default='', max_length=50)
    website = StringField(default='')
    linkedin = StringField(default='')
 
    logo = StringField(default='')
    cover_picture = StringField(default='')
 
    faculties = ListField(StringField(), default=[])
 
    created_at = DateTimeField(default=datetime.now)
    updated_at = DateTimeField(default=datetime.now)
 
    def __str__(self):
        return f"UniversityProfile: {self.university}"
    

    # ==================== COMPANY PROFILE MODEL ====================
 
class CompanyProfile(Document):
    
    meta = {'collection': 'company_profiles'}
 
    company_id = StringField(required=True, unique=True)
 
    name = StringField(max_length=200, default='')
    description = StringField(default='')
    phone = StringField(default='', max_length=30)
    contact_email = StringField(default='')
    location = StringField(default='', max_length=200)
    website = StringField(default='')
    linkedin = StringField(default='')
    twitter = StringField(default='')
    industry = StringField(default='', max_length=100)
 
    logo = StringField(default='')
    cover_picture = StringField(default='')
 
    created_at = DateTimeField(default=datetime.now)
    updated_at = DateTimeField(default=datetime.now)
 
    def __str__(self):
        return f"CompanyProfile: {self.company_id}"



class CvHistory(Document):
    """
    Historique des CVs téléchargés par l'étudiant
    """
    meta = {'collection': 'cv_history'}
    
    student = ReferenceField('Student', required=True, reverse_delete_rule=2)
    file = FileField(required=True)
    filename = StringField(max_length=255)
    uploaded_at = DateTimeField(default=datetime.now)
    
    def __str__(self):
        return f"{self.student.full_name} - {self.filename}"
    


class GroupChatMessage(Document):
    """Messages de chat de groupe"""
    meta = {'collection': 'group_chat_messages'}
    
    group_id = StringField(required=True)
    sender_id = StringField(required=True)
    sender_name = StringField(required=True)
    message = StringField(required=True)
    message_type = StringField(default='text', choices=['text', 'image', 'file'])
    file_url = StringField(default='')
    file_name = StringField(default='')
    created_at = DateTimeField(default=datetime.now)
    is_read = BooleanField(default=False)
    
    def __str__(self):
        return f"{self.sender_name} in {self.group_id}: {self.message[:50]}"

# api/models.py - أضف هذه الفئة في نهاية الملف

class SuperAdmin(Document):
    """
    Modèle pour le Super Admin avec des permissions absolues sur tout le système
    """
    meta = {'collection': 'super_admins'}
    
    user = ReferenceField(User, required=True, unique=True, reverse_delete_rule=2)
    full_name = StringField(required=True, max_length=100)
    email = StringField(required=True, unique=True)
    created_at = DateTimeField(default=datetime.now)
    last_login = DateTimeField(null=True)
    
    def __str__(self):
        return f"Super Admin: {self.full_name} - {self.email}"