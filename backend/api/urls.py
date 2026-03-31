# api/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # ── Authentication ───────────────────────────────────────────────────────
    path('auth/register/student/',   views.register_student,  name='register-student'),
    path('auth/register/company/',   views.register_company,  name='register-company'),
    path('auth/register/admin/',     views.register_admin,    name='register-admin'),
    path('auth/login/',              views.login,             name='login'),

    # ── OTP ──────────────────────────────────────────────────────────────────
    path('auth/initiate-signup/',    views.initiate_signup,   name='initiate-signup'),
    path('auth/complete-signup/',    views.complete_signup,   name='complete-signup'),

    # ── Password Reset ───────────────────────────────────────────────────────
    path('auth/forgot-password/',    views.forgot_password,   name='forgot-password'),
    path('auth/reset-password/',     views.reset_password,    name='reset-password'),

    # ── Student Space ────────────────────────────────────────────────────────
    path('student/dashboard/',                           views.student_dashboard, name='student-dashboard'),
    path('student/offers/search/',                       views.search_offers,     name='search-offers'),
    path('student/offers/<str:offer_id>/apply/',         views.apply_to_offer,    name='apply-offer'),
    path('student/profile/', views.student_profile, name='student-profile'),
    path('student/generate-custom-cv/', views.generate_custom_cv, name='generate-custom-cv'),
    path('student/applications/', views.student_applications, name='student-applications'),
    # ── Company Space ────────────────────────────────────────────────────────
    path('company/dashboard/',                                     views.company_dashboard,    name='company-dashboard'),
    path('company/applications/<str:application_id>/respond/',     views.respond_to_candidate, name='respond-candidate'),

    # ── Internship Offers CRUD (company_manager + hiring_manager) ────────────
    # List all offers for the user's company / create a new one
    path('company/offers/',                          views.list_offers,   name='list-offers'),
    path('company/offers/create/',                   views.create_offer,  name='create-offer'),
    # View, edit, delete a specific offer by ID
    path('company/offers/<str:offer_id>/',           views.view_offer,    name='view-offer'),
    path('company/offers/<str:offer_id>/update/',    views.update_offer,  name='update-offer'),
    path('company/offers/<str:offer_id>/delete/',    views.delete_offer,  name='delete-offer'),

    # ── Company Manager — Hiring Manager management ──────────────────────────
    path('company/pending-hiring-managers/',                          views.get_pending_hiring_managers, name='pending-hiring-managers'),
    path('company/approve-hiring-manager/<str:user_id>/',             views.approve_hiring_manager,      name='approve-hiring-manager'),
    path('company/reject-hiring-manager/<str:user_id>/',              views.reject_hiring_manager,       name='reject-hiring-manager'),

    # ── Admin Space ──────────────────────────────────────────────────────────
    path('admin/dashboard/',                                           views.admin_dashboard,        name='admin-dashboard'),
    path('admin/applications/<str:application_id>/validate/',          views.validate_application,   name='validate-application'),
    path('admin/applications/<str:application_id>/agreement/',         views.generate_agreement,     name='generate-agreement'),

    # ── Admin — Company Manager management ──────────────────────────────────
    path('admin/pending-company-managers/',                            views.get_pending_company_managers, name='pending-company-managers'),
    path('admin/approve-company-manager/<str:user_id>/',               views.approve_company_manager,      name='approve-company-manager'),
    path('admin/reject-company-manager/<str:user_id>/',                views.reject_company_manager,       name='reject-company-manager'),

    # ── Admin — Co Department Head management ────────────────────────────────
    path('admin/pending-co-dept-heads/',                               views.get_pending_co_dept_heads, name='pending-co-dept-heads'),
    path('admin/approve-co-dept-head/<str:user_id>/',                  views.approve_co_dept_head,      name='approve-co-dept-head'),
    path('admin/reject-co-dept-head/<str:user_id>/',                   views.reject_co_dept_head,       name='reject-co-dept-head'),

    # ── Proof management ─────────────────────────────────────────────────────
    path('admin/request-proof/<str:pending_id>/',                      views.request_proof_from_admin, name='request-proof'),
    path('admin/mark-proof-received/<str:pending_id>/',                views.mark_proof_received,      name='mark-proof-received'),

    # ── Utilities ────────────────────────────────────────────────────────────
    path('utils/skills/',    views.get_skills_tags, name='skills-tags'),
    #cv _____
    path('student/generate-cv/', views.generate_cv, name='generate-cv'),
    path('company/applications/', views.company_applications, name='company-applications'),
    path('company/applications/<str:application_id>/respond/', views.respond_to_application, name='respond-application'),
    path('companies/list/', views.list_companies, name='list-companies'),
    ]

