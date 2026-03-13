from django.urls import path
from . import views
from . import views_auth

urlpatterns = [
    # Routes pour les items
    path('items/', views.item_list, name='item-list'),
    path('items/recent/', views.recent_items, name='recent-items'),
    path('items/<str:pk>/', views.item_detail, name='item-detail'),
    
    # Routes pour l'authentification
    path('auth/register/student/', views_auth.register_student, name='register-student'),
    path('auth/register/company/', views_auth.register_company, name='register-company'),
    path('auth/login/', views_auth.login, name='login'),
    path('auth/me/', views_auth.me, name='me'),
]
