# Django settings for Biomecanica project. 

from pathlib import Path
import os

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-$@el64(y-w2f)1dea416l)6(^&1s$2-v9%^c808dz$qcd^c)1*'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True
CORS_ORIGIN_ALLOW_ALL = DEBUG
CORS_ALLOWED_ORIGINS = [
    'https://glad-wealthy-crawdad.ngrok-free.app',
]
CORS_ALLOW_HEADERS = [
    '*',
    'x-post-purpose',
    'X-CSRFToken',
    'ngrok-skip-browser-warning',
    'glad-wealthy-crawdad.ngrok-free.app',
]
CSRF_TRUSTED_ORIGINS = [
    'https://glad-wealthy-crawdad.ngrok-free.app',
    "https://*.ngrok.io", 'https://*.127.0.0.1'
    ]
ALLOWED_HOSTS = [
    "*",
    "127.0.0.1",
    "wss://http://127.0.0.1:8000/",
    "https://glad-wealthy-crawdad.ngrok-free.app",
    "wss://glad-wealthy-crawdad.ngrok-free.app",
    'glad-wealthy-crawdad.ngrok-free.app',
    ]
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
CORS_ALLOW_METHODS = [
    'POST',
]
# Application definition
INSTALLED_APPS = [
    'daphne',
    'channels',
    'corsheaders',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]
THIRD_PARTY_APPS = []

BIOMECANICA_APPS = [
    'PoseDetection', # App for Image processing with OpenCV integrated.
]
INSTALLED_APPS += THIRD_PARTY_APPS
INSTALLED_APPS += BIOMECANICA_APPS

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    },
}

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'django.middleware.security.SecurityMiddleware',
]

ROOT_URLCONF = 'Biomecanica.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / "client/",],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]


WSGI_APPLICATION = 'Biomecanica.wsgi.application'
ASGI_APPLICATION = 'Biomecanica.asgi.application'

# Database
# https://docs.djangoproject.com/en/5.0/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}


# Password validation
# https://docs.djangoproject.com/en/5.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.0/topics/i18n/

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.0/howto/static-files/


STATIC_URL = 'client/'
STATICFILES_DIRS = [BASE_DIR / STATIC_URL]
MEDIA_URL = 'media/'
MEDIAFILES_DIRS = [BASE_DIR / MEDIA_URL]

# Default primary key field type
# https://docs.djangoproject.com/en/5.0/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
