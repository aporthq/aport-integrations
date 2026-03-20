"""Django REST Framework + APort integration example.

Demonstrates agent authentication and policy verification using
permission classes built on top of aporthq-sdk-python.

Usage:
    export APORT_API_KEY=your-api-key
    python manage.py runserver
"""

# settings.py — minimal Django settings for this example

import os

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "flask-aport-dev-key-change-me")

DEBUG = True

ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "rest_framework",
]

MIDDLEWARE = [
    "django.middleware.common.CommonMiddleware",
]

ROOT_URLCONF = "urls"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

# APort configuration
APORT_BASE_URL = os.getenv("APORT_BASE_URL", "https://api.aport.io")
APORT_API_KEY = os.getenv("APORT_API_KEY", "")
APORT_TIMEOUT_MS = int(os.getenv("APORT_TIMEOUT_MS", "5000"))

REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
    ],
    "EXCEPTION_HANDLER": "views.aport_exception_handler",
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
