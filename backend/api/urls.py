from django.urls import path
from . import views

urlpatterns = [
    # ==================== AUTH ====================
    path('auth/register/student/',   views.register_student,  name='register-student'),
    path('auth/register/company/',   views.register_company,  name='register-company'),
    path('auth/register/admin/',     views.register_admin,    name='register-admin'),
    path('auth/login/',              views.login,             name='login'),

    path('auth/initiate-signup/',    views.initiate_signup,   name='initiate-signup'),
    path('auth/complete-signup/',    views.complete_signup,   name='complete-signup'),

    path('auth/forgot-password/',    views.forgot_password,   name='forgot-password'),
    path('auth/reset-password/',     views.reset_password,    name='reset-password'),
    path('auth/change-password/',    views.change_password,   name='change-password'),
    path('auth/enable-2fa/', views.enable_2fa, name='enable-2fa'),
    path('auth/disable-2fa/', views.disable_2fa, name='disable-2fa'),
    path('auth/add-recovery-email/', views.add_recovery_email, name='add-recovery-email'),
    path('auth/remove-recovery-email/', views.remove_recovery_email, name='remove-recovery-email'),
    path('auth/security-status/', views.security_status, name='security-status'),
    path('auth/verify-recovery-email/', views.verify_recovery_email, name='verify-recovery-email'),
    path('auth/forgot-password-recovery/', views.forgot_password_with_recovery, name='forgot-password-recovery'),
    path('auth/initiate-password-change/', views.initiate_password_change, name='initiate-password-change'),
    path('auth/verify-and-change-password/', views.verify_and_change_password, name='verify-and-change-password'),
    path('auth/send-2fa-code/', views.send_2fa_code, name='send-2fa-code'),
    path('auth/verify-2fa-code/', views.verify_2fa_code, name='verify-2fa-code'),
    path('auth/enable-email-2fa/', views.enable_email_2fa, name='enable-email-2fa'),
    path('auth/disable-email-2fa/', views.disable_email_2fa, name='disable-email-2fa'),
    path('auth/send-login-otp/', views.send_login_otp, name='send-login-otp'),
    path('auth/verify-login-otp/', views.verify_login_otp, name='verify-login-otp'),
    path('auth/2fa-status/', views.get_2fa_status, name='2fa-status'),

    # ==================== STUDENT ====================
    path('student/dashboard/',                           views.student_dashboard, name='student-dashboard'),
    path('student/offers/search/',                       views.search_offers,     name='search-offers'),
    path('student/offers/<str:offer_id>/apply/',         views.apply_to_offer,    name='apply-offer'),
    path('student/profile/',                             views.student_profile, name='student-profile'),
    path('student/generate-custom-cv/',                  views.generate_custom_cv, name='generate-custom-cv'),
    path('student/applications/',                        views.student_applications, name='student-applications'),
    path('student/applications/<str:application_id>/cv/', views.download_application_cv_student, name='student-download-cv'),

    # Student Profile (Friend's)
    path('student/profile/me/', views.get_my_profile, name='my-profile'),
    path('student/profile/update/', views.update_my_profile, name='update-profile'),
    path('student/profile/upload-picture/', views.upload_profile_picture, name='upload-profile-picture'),
    path('student/profile/by-username/<str:username>/', views.get_profile_by_username, name='profile-by-username'),
    path('student/accepted-internships/', views.get_accepted_internships, name='accepted-internships'),
    # أضف هذه الـ paths في urlpatterns
path('student/offers/<str:offer_id>/applicants-count/', views.get_offer_applicants_count, name='get_offer_applicants_count'),
path('student/offers/applicants-counts/', views.get_all_offers_applicants_counts, name='get_all_offers_applicants_counts'),

    # CV Management (Friend's)
    path('student/cv/', views.get_my_cv, name='get-my-cv'),
    path('student/cv/upload/', views.upload_cv, name='upload-cv'),
    path('student/cv/delete/', views.delete_cv, name='delete-cv'),
    path('student/cv/download/', views.download_current_cv, name='download-current-cv'),
    path('student/cv/download/<str:cv_id>/', views.download_cv_history, name='download-cv-history'),

    # ==================== COMPANY (your public profile + friend's personal/profile) ====================
    # Public Company Profile (YOURS)
    path('company/dashboard/',                                     views.company_dashboard, name='company-dashboard'),
    path('company/offers/',                                        views.list_offers, name='list-offers'),
	path('company/offers/top/',                                    views.top_company_offers, name='top-company-offers'),	
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
	path('company/offers/<str:offer_id>/image/', views.serve_offer_image, name='offer-image'),

    # Your public Company Profile (editing cover, description, etc.)
    path('company/profile/', views.get_company_profile, name='get-company-profile'),
    path('company/profile/update/', views.update_company_profile, name='update-company-profile'),   # PUT delegates to POST

    # Friend's MyProfile for company (personal info, logo, 2FA) – renamed endpoints
    
    path('my-profile/user/update/', views.update_my_user_info, name='update-my-user-info'),
    path('my-profile/user/upload-avatar/', views.upload_user_avatar, name='upload-user-avatar'),
    path('my-profile/user/avatar/<str:file_id>/', views.serve_user_avatar, name='serve-user-avatar'),

    # For fetching the company manager (friend's, used in private chat)
    path('company/company-manager/', views.get_company_manager_info, name='get-company-manager'),

    # ==================== ADMIN ====================
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
    path('admin/university-profile/',                                 views.university_profile,  name='university-profile'),

    # Co-Dept Head
    path('co-dept/pending-validations/',                               views.co_dept_pending_validations, name='co-dept-pending'),
    path('co-dept/application/<str:application_id>/',                  views.co_dept_get_application_details, name='co-dept-application-detail'),
    path('co-dept/validate-application/<str:application_id>/',         views.co_dept_validate_application, name='co-dept-validate'),
    path('co-dept/reject-application/<str:application_id>/',           views.co_dept_reject_application, name='co-dept-reject'),
    path('co-dept/download-convention/<str:application_id>/',          views.co_dept_download_convention, name='co-dept-download-convention'),
    path('co-dept/application/<str:application_id>/cv/',               views.co_dept_download_cv, name='co-dept-download-cv'),

    # Dept Head
    path('dept-head/pending-validations/', views.dept_head_pending_validations, name='dept-head-pending'),
    path('dept-head/application/<str:application_id>/cv/', views.dept_head_download_cv, name='dept-head-download-cv'),
    path('dept-head/validate-application/<str:application_id>/', views.dept_head_validate_application, name='dept-head-validate'),
    path('dept-head/reject-application/<str:application_id>/', views.dept_head_reject_application, name='dept-head-reject'),
    path('dept-head/download-convention/<str:application_id>/', views.dept_head_download_convention, name='dept-head-download-convention'),
    path('dept-head/validated-validations/', views.dept_head_validated_validations, name='dept-head-validated'),

    # ==================== NOTIFICATIONS (shared) ====================
    path('student/notifications/',                                     views.get_notifications, name='get-notifications'),
    path('student/notifications/<str:notification_id>/read/',          views.mark_notification_read, name='mark-notification-read'),
    path('student/notifications/read-all/',                            views.mark_all_notifications_read, name='mark-all-read'),

    path('company/notifications/', views.get_notifications, name='company-notifications'),
    path('company/notifications/<str:notification_id>/read/', views.mark_notification_read, name='company-mark-read'),
    path('company/notifications/read-all/', views.mark_all_notifications_read, name='company-mark-all-read'),

    # ==================== UTILS / PUBLIC ====================
    path('utils/skills/',    views.get_skills_tags, name='skills-tags'),
    path('student/generate-cv/', views.generate_cv, name='generate-cv'),
    path('companies/list/', views.list_companies, name='list-companies'),
    path('public/offers/', views.public_offers, name='public-offers'),

    # ==================== CHAT ====================
    path('chat/groups/student/', views.get_student_chat_groups, name='student-chat-groups'),
    path('chat/groups/company/', views.get_company_chat_groups, name='company-chat-groups'),
    path('chat/groups/university/<str:university>/', views.get_university_chat_groups, name='university-chat-groups'),
    path('chat/groups/create/', views.create_chat_group, name='create-chat-group'),
    path('chat/users/students/', views.get_chat_users_students, name='chat-users-students'),
    path('chat/users/company/', views.get_chat_users_company, name='chat-users-company'),
    path('chat/users/university/<str:university>/', views.get_chat_users_university, name='chat-users-university'),
    path('chat/contacts/student/', views.get_student_contacts, name='student-contacts'),

    # ==================== ACTIVITY LOGS ====================
    path('activity-logs/company/', views.get_company_activity_logs, name='company-activity-logs'),
    path('activity-logs/dept-head/', views.get_dept_head_activity_logs, name='dept-head-activity-logs'),

    # ==================== PERMISSION MANAGEMENT ====================
    # Hiring Managers
    path('company/hiring-managers/', views.get_hiring_managers_list, name='hiring-managers-list'),
    path('company/hiring-managers/<str:user_id>/permissions/', views.update_hiring_manager_permissions, name='update-hm-permissions'),
    path('company/hiring-managers/<str:user_id>/delete/', views.delete_hiring_manager, name='delete-hiring-manager'),
    # Approved list
    path('company/approved-hiring-managers/', views.get_approved_hiring_managers, name='approved-hiring-managers'),

    # Co Dept Heads
    path('admin/co-dept-heads/', views.get_co_dept_heads_list, name='co-dept-heads-list'),
    path('admin/co-dept-heads/<str:user_id>/permissions/', views.update_co_dept_head_permissions, name='update-cdh-permissions'),
    path('admin/co-dept-heads/<str:user_id>/delete/', views.delete_co_dept_head, name='delete-co-dept-head'),
    path('admin/approved-co-dept-heads/', views.get_approved_co_dept_heads, name='approved-co-dept-heads'),

    # ==================== STUDENT MANAGEMENT (ADMIN) ====================
    path('admin/university-students/', views.get_university_students, name='university-students'),
    path('admin/university-students/<str:student_id>/', views.get_student_details, name='student-details'),
    path('admin/university-stats/', views.get_university_stats, name='university-stats'),
    path('admin/placement-stats/', views.get_placement_statistics, name='placement-stats'),

    # ==================== SIGNATURES / STAMP ====================
    path('signature/university/<str:application_id>/', views.add_university_signature, name='add-university-signature'),
    path('signature/company/<str:application_id>/', views.add_company_signature, name='add-company-signature'),
    path('signature/student/<str:application_id>/', views.add_student_signature, name='add-student-signature'),
    path('signature/status/<str:application_id>/', views.get_signature_status, name='signature-status'),
    path('stamp/university/<str:application_id>/', views.add_university_stamp, name='add-university-stamp'),
    path('stamp/status/<str:application_id>/', views.get_stamp_status, name='stamp-status'),

    # ==================== CONVENTION GENERATION ====================
    path('generate-convention/<str:application_id>/', views.generate_convention_from_template, name='generate-convention'),

    # ==================== MISC ====================
    path('auth/check-user/', views.check_user_exists, name='check-user'),
    path('admin/university-users-status/', views.get_university_users_status, name='university-users-status'),
    path('auth/me/', views.get_current_user, name='get-current-user'),
]