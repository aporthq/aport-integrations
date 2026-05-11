from django.urls import path

from aport_demo.views import health, refund_payment

urlpatterns = [
    path("health/", health),
    path("payments/refund/", refund_payment),
]
