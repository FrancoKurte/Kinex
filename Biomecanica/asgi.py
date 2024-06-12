from django.core.asgi import get_asgi_application
django_asgi_application = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from .routing import websockets_urlpatterns
import django
import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Biomecanica.settings')
django.setup()

application = ProtocolTypeRouter({
    'http': django_asgi_application,
    'websocket': AuthMiddlewareStack(URLRouter(websockets_urlpatterns))
})
