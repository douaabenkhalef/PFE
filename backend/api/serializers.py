
from rest_framework import serializers
from .models import User


class StudentRegistrationSerializer(serializers.Serializer):
    
    email = serializers.EmailField()
    username = serializers.CharField(min_length=3, max_length=50)
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    
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
            raise serializers.ValidationError("At least one skill is required.")
        return value

    def validate_graduation_year(self, value):
        if value < 1900 or value > 2100:
            raise serializers.ValidationError("Invalid graduation year. Must be between 1900 and 2100.")
        return value

    def validate_email(self, value):
        if User.objects(email=value).first():
            raise serializers.ValidationError("Cet email est déjà utilisé.")
        return value

    def validate_username(self, value):
        if User.objects(username=value).first():
            raise serializers.ValidationError("Ce nom d'utilisateur est déjà pris.")
        return value

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({'confirm_password': ['Passwords do not match.']})
        return data


class CompanyRegistrationSerializer(serializers.Serializer):
    
    email = serializers.EmailField()
    username = serializers.CharField(min_length=3, max_length=50)
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    
    sub_role = serializers.ChoiceField(choices=['company_manager', 'hiring_manager'])

    
    company_name = serializers.CharField(max_length=200, required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    location = serializers.CharField(max_length=100, required=False, allow_blank=True)
    website = serializers.URLField(required=False, allow_blank=True)
    industry = serializers.CharField(max_length=100, required=False, allow_blank=True)

    
    company_manager_email = serializers.EmailField(required=False, allow_blank=True)
    company_name_for_hiring = serializers.CharField(required=False, allow_blank=True)

    def validate_email(self, value):
        if User.objects(email=value).first():
            raise serializers.ValidationError("Cet email est déjà utilisé.")
        return value

    def validate_username(self, value):
        if User.objects(username=value).first():
            raise serializers.ValidationError("Ce nom d'utilisateur est déjà pris.")
        return value

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({'confirm_password': ['Passwords do not match.']})
        
        
        if data.get('sub_role') == 'company_manager':
            
            required_fields = ['company_name', 'description', 'location', 'industry']
            missing = [f for f in required_fields if not data.get(f)]
            if missing:
                raise serializers.ValidationError(
                    {f: ['Ce champ est requis pour les company managers.'] for f in missing}
                )
        
        elif data.get('sub_role') == 'hiring_manager':
            
            if not data.get('company_manager_email'):
                raise serializers.ValidationError(
                    {'company_manager_email': ['L\'email du gestionnaire d\'entreprise est requis pour les recruteurs.']}
                )
            if not data.get('company_name_for_hiring'):
                raise serializers.ValidationError(
                    {'company_name_for_hiring': ['Le nom de l\'entreprise est requis pour les recruteurs.']}
                )
            
            data['company_name'] = ''
            data['description'] = ''
            data['location'] = ''
            data['industry'] = ''
        
        return data




class AdminRegistrationSerializer(serializers.Serializer):
    
    email = serializers.EmailField()
    username = serializers.CharField(min_length=3, max_length=50)
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    
    sub_role = serializers.ChoiceField(choices=['admin', 'co_dept_head'])

    
    full_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    wilaya = serializers.CharField(max_length=50, required=False, allow_blank=True)
    university = serializers.CharField(max_length=200, required=False, allow_blank=True)

    
    dept_head_email = serializers.EmailField(required=False, allow_blank=True)
    university_for_verification = serializers.CharField(required=False, allow_blank=True)

    def validate_email(self, value):
        if User.objects(email=value).first():
            raise serializers.ValidationError("Cet email est déjà utilisé.")
        return value

    def validate_username(self, value):
        if User.objects(username=value).first():
            raise serializers.ValidationError("Ce nom d'utilisateur est déjà pris.")
        return value

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({'confirm_password': ['Passwords do not match.']})
        
        
        if data.get('sub_role') == 'admin':
            
            required_fields = ['full_name', 'wilaya', 'university']
            missing = [f for f in required_fields if not data.get(f)]
            if missing:
                raise serializers.ValidationError(
                    {f: ['Ce champ est requis pour les administrateurs.'] for f in missing}
                )
        
        elif data.get('sub_role') == 'co_dept_head':
            
            if not data.get('dept_head_email'):
                raise serializers.ValidationError(
                    {'dept_head_email': ['L\'email du Department Head est requis pour les co-department heads.']}
                )
            if not data.get('university_for_verification'):
                raise serializers.ValidationError(
                    {'university_for_verification': ['Le nom de l\'université est requis pour la vérification.']}
                )
            
            data['full_name'] = ''
            data['wilaya'] = ''
            data['university'] = ''
        
        return data




class InternshipOfferSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    title = serializers.CharField(max_length=200)
    description = serializers.CharField()
    wilaya = serializers.CharField(max_length=50)
    internship_type = serializers.ChoiceField(choices=['PFE', 'ouvrier', 'technicien', 'été'])
    required_skills = serializers.ListField(child=serializers.CharField())
    duration = serializers.CharField(max_length=50)
    start_date = serializers.DateTimeField()  
    deadline = serializers.DateTimeField()
    is_active = serializers.BooleanField(default=True)
    created_at = serializers.DateTimeField(read_only=True)
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
    status = serializers.ChoiceField(
        choices=['pending', 'accepted', 'rejected', 'validated', 'completed'],
        default='pending'
    )
    applied_at = serializers.DateTimeField(read_only=True)
    company_response_date = serializers.DateTimeField(allow_null=True, required=False)
    
    company_notes = serializers.CharField(allow_blank=True, required=False)
    admin_validation_date = serializers.DateTimeField(allow_null=True, required=False)
    admin_notes = serializers.CharField(allow_blank=True, required=False)
    cover_letter = serializers.CharField(allow_blank=True, required=False)

    
    student_name = serializers.SerializerMethodField()
    student_email = serializers.SerializerMethodField()
    student_wilaya = serializers.SerializerMethodField()
    student_university = serializers.SerializerMethodField()
    student_major = serializers.SerializerMethodField()
    student_education_level = serializers.SerializerMethodField()
    student_graduation_year = serializers.SerializerMethodField()
    student_skills = serializers.SerializerMethodField()
    student_github = serializers.SerializerMethodField()
    student_portfolio = serializers.SerializerMethodField()
    cv_file_url = serializers.SerializerMethodField()
    offer_title = serializers.SerializerMethodField()
    offer_type = serializers.SerializerMethodField()
    offer_wilaya = serializers.SerializerMethodField()
    offer_duration = serializers.SerializerMethodField()
    company_name = serializers.SerializerMethodField()

    def get_student_name(self, obj):
        return obj.student.full_name if obj.student else None

    def get_student_email(self, obj):
        try: return obj.student.user.email
        except Exception: return None

    def get_student_wilaya(self, obj):
        return obj.student.wilaya if obj.student else None

    def get_student_university(self, obj):
        return obj.student.university if obj.student else None

    def get_student_major(self, obj):
        return obj.student.major if obj.student else None

    def get_student_education_level(self, obj):
        return obj.student.education_level if obj.student else None

    def get_student_graduation_year(self, obj):
        return obj.student.graduation_year if obj.student else None

    def get_student_skills(self, obj):
        return obj.student.skills if obj.student else []

    def get_student_github(self, obj):
        return obj.student.github if obj.student else None

    def get_student_portfolio(self, obj):
        return obj.student.portfolio if obj.student else None

    def get_cv_file_url(self, obj):
        
        try:
            if obj.cv_file:
                return f"/api/company/applications/{str(obj.id)}/cv/"
        except Exception:
            pass
        return None

    def get_offer_title(self, obj):
        return obj.offer.title if obj.offer else None

    def get_offer_type(self, obj):
        return obj.offer.internship_type if obj.offer else None

    def get_offer_wilaya(self, obj):
        return obj.offer.wilaya if obj.offer else None

    def get_offer_duration(self, obj):
        return obj.offer.duration if obj.offer else None

    def get_company_name(self, obj):
        try: return obj.offer.company.company_name
        except Exception: return None

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
    sub_role = serializers.CharField()
    status = serializers.BooleanField()
    is_university_email = serializers.BooleanField()
    created_at = serializers.DateTimeField(read_only=True)
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
                    'is_placed': student.is_placed,
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
                    'verified': company.verified,
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
    email = serializers.SerializerMethodField()
    username = serializers.SerializerMethodField()

    def get_email(self, obj):
        return obj.user.email if obj.user else None

    def get_username(self, obj):
        return obj.user.username if obj.user else None


class CompanyProfileSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    company_name = serializers.CharField()
    description = serializers.CharField()
    location = serializers.CharField()
    website = serializers.URLField(allow_blank=True)
    industry = serializers.CharField()
    verified = serializers.BooleanField()
    email = serializers.SerializerMethodField()
    username = serializers.SerializerMethodField()

    def get_email(self, obj):
        return obj.user.email if obj.user else None

    def get_username(self, obj):
        return obj.user.username if obj.user else None


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
    application_id = serializers.SerializerMethodField()

    def get_application_id(self, obj):
        return str(obj.application.id) if obj.application else None

    def create(self, validated_data):
        from .models import InternshipAgreement
        return InternshipAgreement(**validated_data).save()