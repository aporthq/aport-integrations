"""Django settings for tests."""
SECRET_KEY = "test-secret-key"
DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}
INSTALLED_APPS = []
MIDDLEWARE = []
ROOT_URLCONF = ""
USE_TZ = True
