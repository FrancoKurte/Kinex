from django.conf import settings
from django.contrib import admin
from django.urls import path
from PoseDetection.views import IndexView, ImageView, VideoView
from django.conf.urls.static import static

urlpatterns = [ 
    path('admin/', admin.site.urls),
    path('', IndexView.as_view(), name="index"),
    path('index.html/', IndexView.as_view(), name="index"),
    path('image.html/', ImageView.as_view(), name="image"),
    path('video.html/', VideoView.as_view(), name="video"),
] + static(settings.STATIC_URL,
           document_root=settings.STATICFILES_DIRS[0] 
    ) + static(settings.MEDIA_URL, document_root=settings.MEDIAFILES_DIRS[0])