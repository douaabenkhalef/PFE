from django.urls import path
from . import views

urlpatterns = [
    
    path('auth/register/student/',   views.register_student,  name='register-student'),
    path('auth/register/company/',   views.register_company,  name='register-company'),
    path('auth/register/admin/',     views.register_admin,    name='register-admin'),
    path('auth/login/',              views.login,             name='login'),

    
    path('auth/initiate-signup/',    views.initiate_signup,   name='initiate-signup'),
    path('auth/complete-signup/',    views.complete_signup,   name='complete-signup'),

   
    path('auth/forgot-password/',    views.forgot_password,   name='forgot-password'),
    path('auth/reset-password/',     views.reset_password,    name='reset-password'),

    
    path('student/dashboard/',                           views.student_dashboard, name='student-dashboard'),
    path('student/offers/search/',                       views.search_offers,     name='search-offers'),
    path('student/offers/<str:offer_id>/apply/',         views.apply_to_offer,    name='apply-offer'),
    path('student/profile/',                             views.student_profile, name='student-profile'),
    path('student/generate-custom-cv/',                  views.generate_custom_cv, name='generate-custom-cv'),
    path('student/applications/',                        views.student_applications, name='student-applications'),
    path('student/applications/<str:application_id>/cv/', views.download_application_cv_student, name='student-download-cv'),

    
    path('company/dashboard/',                                     views.company_dashboard, name='company-dashboard'),
    path('company/offers/',                                        views.list_offers, name='list-offers'),
    path('company/offers/create/',                                 views.create_offer, name='create-offer'),
    path('company/offers/<str:offer_id>/',                         views.view_offer, name='view-offer'),
    path('company/offers/<str:offer_id>/update/',                  views.update_offer, name='update-offer'),
    path('company/offers/<str:offer_id>/delete/',                  views.delete_offer, name='delete-offer'),
    path('company/pending-hiring-managers/',                       views.get_pending_hiring_managers, name='pending-hiring-managers'),
    path('company/approve-hiring-manager/<str:user_id>/',          views.approve_hiring_manager, name='approve-hiring-manager'),
    path('company/reject-hiring-manager/<str:user_id>/',           views.reject_hiring_manager, name='reject-hiring-manager'),
    path('company/applications/',                                  views.company_applications, name='company-applications'),
    path('company/applications/<str:application_id>/respond/',     views.respond_to_application, name='respond-application'),
    path('company/applications/<str:application_id>/cv/',          views.download_application_cv, name='download-cv'),

   
    path('admin/dashboard/',                                           views.admin_dashboard, name='admin-dashboard'),
    path('admin/applications/<str:application_id>/validate/',          views.validate_application, name='validate-application'),
    path('admin/applications/<str:application_id>/agreement/',         views.generate_agreement, name='generate-agreement'),
    path('admin/pending-company-managers/',                            views.get_pending_company_managers, name='pending-company-managers'),
    path('admin/approve-company-manager/<str:user_id>/',               views.approve_company_manager, name='approve-company-manager'),
    path('admin/reject-company-manager/<str:user_id>/',                views.reject_company_manager, name='reject-company-manager'),
    path('admin/pending-co-dept-heads/',                               views.get_pending_co_dept_heads, name='pending-co-dept-heads'),
    path('admin/approve-co-dept-head/<str:user_id>/',                  views.approve_co_dept_head, name='approve-co-dept-head'),
    path('admin/reject-co-dept-head/<str:user_id>/',                   views.reject_co_dept_head, name='reject-co-dept-head'),
    path('admin/request-proof/<str:pending_id>/',                      views.request_proof_from_admin, name='request-proof'),
    path('admin/mark-proof-received/<str:pending_id>/',                views.mark_proof_received, name='mark-proof-received'),

  
    path('co-dept/pending-validations/',                               views.co_dept_pending_validations, name='co-dept-pending'),
    path('co-dept/application/<str:application_id>/',                  views.co_dept_get_application_details, name='co-dept-application-detail'),
    path('co-dept/validate-application/<str:application_id>/',         views.co_dept_validate_application, name='co-dept-validate'),
    path('co-dept/reject-application/<str:application_id>/',           views.co_dept_reject_application, name='co-dept-reject'),
    path('co-dept/download-convention/<str:application_id>/',          views.co_dept_download_convention, name='co-dept-download-convention'),
    path('co-dept/application/<str:application_id>/cv/',               views.co_dept_download_cv, name='co-dept-download-cv'),

    
    path('student/notifications/',                                     views.get_notifications, name='get-notifications'),
    path('student/notifications/<str:notification_id>/read/',          views.mark_notification_read, name='mark-notification-read'),
    path('student/notifications/read-all/',                            views.mark_all_notifications_read, name='mark-all-read'),


   path('company/notifications/', views.get_notifications, name='company-notifications'),
   path('company/notifications/<str:notification_id>/read/', views.mark_notification_read, name='company-mark-read'),
   path('company/notifications/read-all/', views.mark_all_notifications_read, name='company-mark-all-read'),
    
    path('utils/skills/',    views.get_skills_tags, name='skills-tags'),
    path('student/generate-cv/', views.generate_cv, name='generate-cv'),
    path('companies/list/', views.list_companies, name='list-companies'),
    path('public/offers/', views.public_offers, name='public-offers'),
   
path('dept-head/pending-validations/', views.dept_head_pending_validations, name='dept-head-pending'),
path('dept-head/application/<str:application_id>/cv/', views.dept_head_download_cv, name='dept-head-download-cv'),
path('dept-head/validate-application/<str:application_id>/', views.dept_head_validate_application, name='dept-head-validate'),
path('dept-head/reject-application/<str:application_id>/', views.dept_head_reject_application, name='dept-head-reject'),
path('dept-head/download-convention/<str:application_id>/', views.dept_head_download_convention, name='dept-head-download-convention'),

path('generate-convention/<str:application_id>/', views.generate_convention_from_template, name='generate-convention'),
path('activity-logs/company/', views.get_company_activity_logs, name='company-activity-logs'),
    path('activity-logs/dept-head/', views.get_dept_head_activity_logs, name='dept-head-activity-logs'),
     path('auth/check-user/', views.check_user_exists, name='check-user'),
     # Permission Management - Hiring Managers
    path('company/hiring-managers/', views.get_hiring_managers_list, name='hiring-managers-list'),
    path('company/hiring-managers/<str:user_id>/permissions/', views.update_hiring_manager_permissions, name='update-hm-permissions'),
    path('company/hiring-managers/<str:user_id>/delete/', views.delete_hiring_manager, name='delete-hiring-manager'),
    
    # Permission Management - Co Dept Heads
    path('admin/co-dept-heads/', views.get_co_dept_heads_list, name='co-dept-heads-list'),
    path('admin/co-dept-heads/<str:user_id>/permissions/', views.update_co_dept_head_permissions, name='update-cdh-permissions'),
    path('admin/co-dept-heads/<str:user_id>/delete/', views.delete_co_dept_head, name='delete-co-dept-head'),
    path('company/approved-hiring-managers/', views.get_approved_hiring_managers, name='approved-hiring-managers'),
    path('admin/approved-co-dept-heads/', views.get_approved_co_dept_heads, name='approved-co-dept-heads'),

]