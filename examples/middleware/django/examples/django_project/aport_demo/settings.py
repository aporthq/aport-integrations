import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "aport-django-example")
DEBUG = os.environ.get("DJANGO_DEBUG", "1") == "1"
ROOT_URLCONF = "aport_demo.urls"
ALLOWED_HOSTS = ["127.0.0.1", "localhost"]
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
USE_TZ = True

INSTALLED_APPS = [
    "aport_django",
]

MIDDLEWARE = [
    "aport_django.middleware.APortVerificationMiddleware",
]

APORT_API_KEY = os.environ.get("APORT_API_KEY")
APORT_BASE_URL = os.environ.get("APORT_BASE_URL", "https://api.aport.io")
APORT_TIMEOUT_MS = int(os.environ.get("APORT_TIMEOUT_MS", "800"))
APORT_STRICT = os.environ.get("APORT_STRICT", "1") == "1"
APORT_POLICIES = [
    {
        "path": "/payments/refund/",
        "methods": ["POST"],
        "policy": "finance.payment.refund.v1",
        "context": {"source": "django-example", "risk": "high"},
    }
]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": os.path.join(BASE_DIR, "db.sqlite3"),
    }
}
