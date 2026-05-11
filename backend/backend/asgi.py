
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
]

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            websocket_urlpatterns
        )
    ),
})
