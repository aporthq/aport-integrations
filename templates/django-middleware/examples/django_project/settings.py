SECRET_KEY = "example-secret"
DEBUG = True
ROOT_URLCONF = "django_project.urls"
ALLOWED_HOSTS = ["*"]
INSTALLED_APPS = [
    "django_project.guarded",
]
MIDDLEWARE = [
    "aport_django.middleware.APortMiddleware",
]

APORT_API_KEY = "replace-me"
APORT_PROTECTED_PATHS = {
    "/refund/": "finance.payment.refund.v1",
}
