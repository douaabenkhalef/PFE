from mongoengine import Document, StringField, DateTimeField, ListField, BooleanField
from datetime import datetime
import bcrypt

# UTILISATEUR (dans MongoDB)
class User(Document):
    username = StringField(max_length=100, required=True, unique=True)
    email = StringField(max_length=100, required=True, unique=True)
    password_hash = StringField(required=True)
    role = StringField(choices=['student', 'company', 'admin'], default='student')
    is_active = BooleanField(default=True)
    created_at = DateTimeField(default=datetime.utcnow)
    
    meta = {
        'collection': 'users',
        'indexes': [
            {'fields': ['username'], 'unique': True},
            {'fields': ['email'], 'unique': True}
        ]
    }
    
    def set_password(self, password):
        salt = bcrypt.gensalt()
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    def check_password(self, password):
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
    
    def __str__(self):
        return f"{self.username} ({self.role})"

# ÉTUDIANT
class Student(Document):
    user = StringField(required=True)  # Référence à User._id
    full_name = StringField()
    wilaya = StringField()
    skills = ListField(StringField())
    github = StringField()
    portfolio = StringField()
    cv_url = StringField()
    is_placed = BooleanField(default=False)
    
    meta = {
        'collection': 'students',
        'indexes': [
            {'fields': ['skills']},
            {'fields': ['wilaya']}
        ]
    }

# ENTREPRISE
class Company(Document):
    user = StringField(required=True)
    name = StringField(required=True)
    description = StringField()
    logo_url = StringField()
    wilaya = StringField()
    website = StringField()
    
    meta = {'collection': 'companies'}

# OFFRE DE STAGE
class JobOffer(Document):
    company = StringField(required=True)
    title = StringField(required=True)
    description = StringField()
    required_skills = ListField(StringField())
    wilaya = StringField()
    type = StringField(choices=['PFE', 'Stage', 'Alternance'])
    duration = StringField()
    is_active = BooleanField(default=True)
    created_at = DateTimeField(default=datetime.utcnow)
    
    meta = {
        'collection': 'offers',
        'indexes': [
            {'fields': ['required_skills']},
            {'fields': ['wilaya']},
            {'fields': ['type']}
        ]
    }

# CANDIDATURE
class Application(Document):
    student = StringField(required=True)
    offer = StringField(required=True)
    status = StringField(choices=['pending', 'accepted', 'refused'], default='pending')
    applied_at = DateTimeField(default=datetime.utcnow)
    company_viewed = BooleanField(default=False)
    
    meta = {
        'collection': 'applications',
        'indexes': [
            {'fields': ['student']},
            {'fields': ['offer']},
            {'fields': ['status']}
        ]
    }

# CONVENTION DE STAGE
class InternshipAgreement(Document):
    application = StringField(required=True)
    pdf_url = StringField()
    validated_by_admin = BooleanField(default=False)
    validated_at = DateTimeField()
    generated_at = DateTimeField(default=datetime.utcnow)
    
    meta = {'collection': 'agreements'}

# VOS ITEMS EXISTANTS
class Item(Document):
    name = StringField(max_length=100, required=True)
    description = StringField(required=True)
    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)

    meta = {
        'collection': 'items',
        'ordering': ['-created_at']
    }

    def __str__(self):
        return self.name
