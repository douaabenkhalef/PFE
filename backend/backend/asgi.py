
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.urls import re_path
from api import consumers

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

websocket_urlpatterns = [
    
    re_path(r'ws/chat/(?P<university_name>[^/]+)/$', consumers.ChatConsumer.as_asgi()),
    
    
    re_path(r'ws/company-chat/(?P<company_name>[^/]+)/$', consumers.CompanyGroupChatConsumer.as_asgi()),
    
    
    re_path(r'ws/internship-chat/(?P<internship_id>[^/]+)/$', consumers.InternshipGroupChatConsumer.as_asgi()),
    
 
    re_path(r'ws/private-chat/$', consumers.PrivateChatConsumer.as_asgi()),


    # ========== NOUVELLES ROUTES POUR LES GROUPES ==========
    # Route pour groupe entreprise (Company Manager + Hiring Managers)
    re_path(r'ws/company-group/(?P<company_id>[\w-]+)/$', consumers.CompanyGroupChatConsumer.as_asgi()),
    
    # Route pour groupe université (Dept Head + Co Dept Heads)
    re_path(r'ws/university-group/(?P<university>[\w\s-]+)/$', consumers.UniversityGroupChatConsumer.as_asgi()),
]

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            websocket_urlpatterns
        )
    ),
})
