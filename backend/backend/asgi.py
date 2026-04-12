# backend/backend/asgi.py
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from django.urls import path

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

from api.consumers import ChatConsumer, PrivateChatConsumer

application = ProtocolTypeRouter({
    'http': get_asgi_application(),
    'websocket': URLRouter([
        path('ws/chat/<str:university_name>/', ChatConsumer.as_asgi()),
        path('ws/private-chat/', PrivateChatConsumer.as_asgi()),  
    ]),
})