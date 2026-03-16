from django.urls import path
from . import views

urlpatterns = [
    # Authentication
    path('auth/register/student/', views.register_student, name='register-student'),
    path('auth/register/company/', views.register_company, name='register-company'),
    path('auth/login/', views.login, name='login'),
    
    # Student Space
    path('student/dashboard/', views.student_dashboard, name='student-dashboard'),
    path('student/offers/search/', views.search_offers, name='search-offers'),
    path('student/offers/<int:offer_id>/apply/', views.apply_to_offer, name='apply-offer'),
    
    # Company Space
    path('company/dashboard/', views.company_dashboard, name='company-dashboard'),
    path('company/offers/create/', views.create_offer, name='create-offer'),
    path('company/offers/<int:offer_id>/update/', views.update_offer, name='update-offer'),
    path('company/applications/<int:application_id>/respond/', 
         views.respond_to_candidate, name='respond-candidate'),
    
    # Admin Space
    path('admin/dashboard/', views.admin_dashboard, name='admin-dashboard'),
    path('admin/applications/<int:application_id>/validate/', 
         views.validate_application, name='validate-application'),
    path('admin/applications/<int:application_id>/agreement/', 
         views.generate_agreement, name='generate-agreement'),
    path('auth/register/admin/', views.register_admin, name='register-admin'),
    
    # Utilities
    path('utils/skills/', views.get_skills_tags, name='skills-tags'),
]
