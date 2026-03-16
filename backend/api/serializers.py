from rest_framework import serializers
from .models import User

class StudentRegistrationSerializer(serializers.Serializer):
    # Authentication
    email = serializers.EmailField()
    username = serializers.CharField(min_length=3, max_length=50)
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)
    
    # Digital CV fields
    full_name = serializers.CharField(max_length=100)
    wilaya = serializers.CharField(max_length=50)
    skills = serializers.ListField(child=serializers.CharField(), required=True)
    github = serializers.URLField(required=False, allow_blank=True)
    portfolio = serializers.URLField(required=False, allow_blank=True)
    education_level = serializers.CharField(max_length=100)
    university = serializers.CharField(max_length=200)
    major = serializers.CharField(max_length=100)
    graduation_year = serializers.IntegerField()
    
    def validate_skills(self, value):
        if not value:
            raise serializers.ValidationError("Au moins une compétence est requise.")
        return value
    
    def validate_graduation_year(self, value):
        if value < 1900 or value > 2100:
            raise serializers.ValidationError("Année de graduation invalide. Doit être entre 1900 et 2100.")
        return value
    
    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError("Les mots de passe ne correspondent pas.")
        return data


class CompanyRegistrationSerializer(serializers.Serializer):
    # Authentication
    email = serializers.EmailField()
    username = serializers.CharField(min_length=3, max_length=50)
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)
    
    # Company profile
    company_name = serializers.CharField(max_length=200)
    description = serializers.CharField()
    location = serializers.CharField(max_length=100)
    website = serializers.URLField(required=False, allow_blank=True)
    industry = serializers.CharField(max_length=100)
    
    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError("Les mots de passe ne correspondent pas.")
        return data


class InternshipOfferSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    title = serializers.CharField(max_length=200)
    description = serializers.CharField()
    wilaya = serializers.CharField(max_length=50)
    internship_type = serializers.ChoiceField(choices=['PFE', 'ouvrier', 'technicien', 'été'])
    required_skills = serializers.ListField(child=serializers.CharField())
    duration = serializers.CharField(max_length=50)
    start_date = serializers.DateField()
    is_active = serializers.BooleanField(default=True)
    created_at = serializers.DateTimeField(read_only=True)
    
    # Champs supplémentaires pour l'affichage
    company_name = serializers.SerializerMethodField()
    
    def get_company_name(self, obj):
        if hasattr(obj, 'company') and obj.company:
            return obj.company.company_name
        return None
    
    def create(self, validated_data):
        from .models import InternshipOffer
        return InternshipOffer(**validated_data).save()
    
    def update(self, instance, validated_data):
        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()
        return instance


class ApplicationSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    status = serializers.ChoiceField(choices=['pending', 'accepted', 'rejected', 'validated', 'completed'], default='pending')
    applied_at = serializers.DateTimeField(read_only=True)
    company_response_date = serializers.DateTimeField(allow_null=True, required=False)
    company_notes = serializers.CharField(allow_blank=True, required=False)
    admin_validation_date = serializers.DateTimeField(allow_null=True, required=False)
    admin_notes = serializers.CharField(allow_blank=True, required=False)
    
    # Champs pour l'affichage
    student_name = serializers.SerializerMethodField()
    student_skills = serializers.SerializerMethodField()
    offer_title = serializers.SerializerMethodField()
    company_name = serializers.SerializerMethodField()
    
    def get_student_name(self, obj):
        if hasattr(obj, 'student') and obj.student:
            return obj.student.full_name
        return None
    
    def get_student_skills(self, obj):
        if hasattr(obj, 'student') and obj.student:
            return obj.student.skills
        return []
    
    def get_offer_title(self, obj):
        if hasattr(obj, 'offer') and obj.offer:
            return obj.offer.title
        return None
    
    def get_company_name(self, obj):
        if hasattr(obj, 'offer') and obj.offer and hasattr(obj.offer, 'company') and obj.offer.company:
            return obj.offer.company.company_name
        return None
    
    def create(self, validated_data):
        from .models import Application
        return Application(**validated_data).save()
    
    def update(self, instance, validated_data):
        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()
        return instance


class UserSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    username = serializers.CharField()
    email = serializers.EmailField()
    role = serializers.CharField()
    is_university_email = serializers.BooleanField()
    created_at = serializers.DateTimeField(read_only=True)
    
    # Champs spécifiques selon le rôle
    student_profile = serializers.SerializerMethodField()
    company_profile = serializers.SerializerMethodField()
    
    def get_student_profile(self, obj):
        if obj.role == 'student':
            from .models import Student
            student = Student.objects(user=obj).first()
            if student:
                return {
                    'full_name': student.full_name,
                    'wilaya': student.wilaya,
                    'skills': student.skills,
                    'github': student.github,
                    'portfolio': student.portfolio,
                    'education_level': student.education_level,
                    'university': student.university,
                    'major': student.major,
                    'graduation_year': student.graduation_year,
                    'is_placed': student.is_placed
                }
        return None
    
    def get_company_profile(self, obj):
        if obj.role == 'company':
            from .models import Company
            company = Company.objects(user=obj).first()
            if company:
                return {
                    'company_name': company.company_name,
                    'description': company.description,
                    'location': company.location,
                    'website': company.website,
                    'industry': company.industry,
                    'verified': company.verified
                }
        return None


class StudentProfileSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    full_name = serializers.CharField()
    wilaya = serializers.CharField()
    skills = serializers.ListField(child=serializers.CharField())
    github = serializers.URLField(allow_blank=True)
    portfolio = serializers.URLField(allow_blank=True)
    education_level = serializers.CharField()
    university = serializers.CharField()
    major = serializers.CharField()
    graduation_year = serializers.IntegerField()
    is_placed = serializers.BooleanField()
    
    # Informations de l'utilisateur associé
    email = serializers.SerializerMethodField()
    username = serializers.SerializerMethodField()
    
    def get_email(self, obj):
        if obj.user:
            return obj.user.email
        return None
    
    def get_username(self, obj):
        if obj.user:
            return obj.user.username
        return None


class CompanyProfileSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    company_name = serializers.CharField()
    description = serializers.CharField()
    location = serializers.CharField()
    website = serializers.URLField(allow_blank=True)
    industry = serializers.CharField()
    verified = serializers.BooleanField()
    
    # Informations de l'utilisateur associé
    email = serializers.SerializerMethodField()
    username = serializers.SerializerMethodField()
    
    def get_email(self, obj):
        if obj.user:
            return obj.user.email
        return None
    
    def get_username(self, obj):
        if obj.user:
            return obj.user.username
        return None


class InternshipAgreementSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    document = serializers.FileField()
    generated_at = serializers.DateTimeField(read_only=True)
    student_name = serializers.CharField()
    company_name = serializers.CharField()
    university = serializers.CharField()
    internship_title = serializers.CharField()
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    
    # Informations de l'application associée
    application_id = serializers.SerializerMethodField()
    
    def get_application_id(self, obj):
        if obj.application:
            return str(obj.application.id)
        return None
    
    def create(self, validated_data):
        from .models import InternshipAgreement
        return InternshipAgreement(**validated_data).save()
class AdminRegistrationSerializer(serializers.Serializer):
    # Authentication
    email = serializers.EmailField()
    username = serializers.CharField(min_length=3, max_length=50)
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)
    
    # Admin profile
    full_name = serializers.CharField(max_length=100)
    wilaya = serializers.CharField(max_length=50)  # ← AJOUTÉ
    university = serializers.CharField(max_length=200)  # ← AJOUTÉ
    
    def validate_email(self, value):
        if User.objects(email=value).first():
            raise serializers.ValidationError("Email déjà utilisé.")
        return value
    
    def validate_username(self, value):
        if User.objects(username=value).first():
            raise serializers.ValidationError("Nom d'utilisateur déjà pris.")
        return value
    
    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError("Les mots de passe ne correspondent pas.")
        return data