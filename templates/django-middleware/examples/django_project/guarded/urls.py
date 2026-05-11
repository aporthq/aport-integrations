from django.urls import path

from .views import decorator_refund, middleware_refund, public

urlpatterns = [
    path("public/", public),
    path("refund/", middleware_refund),
    path("decorator-refund/", decorator_refund),
]
