
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from api import views

urlpatterns = [
    path('api/', include('api.urls')),
    path('media/profile_picture/<str:file_id>/', views.serve_profile_picture, name='serve-profile-picture'),
   
    path('media/company_logo/<str:file_id>/', views.serve_my_company_logo, name='serve-company-logo'),
    
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
