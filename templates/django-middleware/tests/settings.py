SECRET_KEY = "test-secret"
ROOT_URLCONF = "tests.urls"
ALLOWED_HOSTS = ["testserver"]
INSTALLED_APPS = []
MIDDLEWARE = [
    "aport_django.middleware.APortMiddleware",
]
APORT_API_KEY = "test-key"
APORT_PROTECTED_PATHS = {
    "/refund/": "finance.payment.refund.v1",
}
