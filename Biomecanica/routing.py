from django.urls import path
from PoseDetection import consumers

websockets_urlpatterns = [ 
    path('video.html/', consumers.VideoConsumer.as_asgi()),
]
 