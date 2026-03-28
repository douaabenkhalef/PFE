# api/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # Authentication
    path('auth/register/student/', views.register_student, name='register-student'),
    path('auth/register/company/', views.register_company, name='register-company'),
    path('auth/register/admin/', views.register_admin, name='register-admin'),
    path('auth/login/', views.login, name='login'),
    
    # OTP
    path('auth/initiate-signup/', views.initiate_signup, name='initiate-signup'),
    path('auth/complete-signup/', views.complete_signup, name='complete-signup'),

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
    
    # Company Manager - Gestion des Hiring Managers
    path('company/pending-hiring-managers/', views.get_pending_hiring_managers, name='pending-hiring-managers'),
    path('company/approve-hiring-manager/<str:user_id>/', views.approve_hiring_manager, name='approve-hiring-manager'),
    path('company/reject-hiring-manager/<str:user_id>/', views.reject_hiring_manager, name='reject-hiring-manager'),
    
    # Admin - Gestion des Company Managers
    path('admin/pending-company-managers/', views.get_pending_company_managers, name='pending-company-managers'),
    path('admin/approve-company-manager/<str:user_id>/', views.approve_company_manager, name='approve-company-manager'),
    path('admin/reject-company-manager/<str:user_id>/', views.reject_company_manager, name='reject-company-manager'),
    
    # Admin - Gestion des Co Department Heads
    path('admin/pending-co-dept-heads/', views.get_pending_co_dept_heads, name='pending-co-dept-heads'),
    path('admin/approve-co-dept-head/<str:user_id>/', views.approve_co_dept_head, name='approve-co-dept-head'),
    path('admin/reject-co-dept-head/<str:user_id>/', views.reject_co_dept_head, name='reject-co-dept-head'),

    # Admin Space
    path('admin/dashboard/', views.admin_dashboard, name='admin-dashboard'),
    path('admin/applications/<int:application_id>/validate/',
         views.validate_application, name='validate-application'),
    path('admin/applications/<int:application_id>/agreement/',
         views.generate_agreement, name='generate-agreement'),

    # Utilities
    path('utils/skills/', views.get_skills_tags, name='skills-tags'),
    
    # Password reset
    path('auth/forgot-password/', views.forgot_password, name='forgot-password'),
    path('auth/reset-password/', views.reset_password, name='reset-password'),
    # Gestion des preuves
    path('admin/request-proof/<str:pending_id>/', views.request_proof_from_admin, name='request-proof'),
    path('admin/mark-proof-received/<str:pending_id>/', views.mark_proof_received, name='mark-proof-received'),
]