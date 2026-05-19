from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from api import views

urlpatterns = [
    path('api/', include('api.urls')),
    path('media/profile_picture/<str:file_id>/', views.serve_profile_picture, name='serve-profile-picture'),
   
    path('media/company_logo/<str:file_id>/', views.serve_my_company_logo, name='serve-company-logo'),

    # SPA fallback — أي URL ما يتطابق مع API يرجع index.html
    re_path(r'^(?!api/)(?!media/).*$', TemplateView.as_view(template_name='index.html')),
    
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)