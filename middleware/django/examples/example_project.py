"""Example Django project using APort middleware."""

# settings.py
SECRET_KEY = "your-secret-key"
DEBUG = True
ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.auth",
]

MIDDLEWARE = [
    "django.middleware.common.CommonMiddleware",
    "aporthq_middleware_django.AgentPassportMiddleware",
]

# APort configuration
APORT_OPTIONS = {
    "policy_id": "finance.payment.refund.v1",
    "fail_closed": True,
    "skip_paths": ["/health", "/metrics"],
    # "base_url": "https://api.aport.io",
    # "api_key": "...",
}

ROOT_URLCONF = "examples.urls"


# views.py
from django.http import HttpRequest, JsonResponse
from aporthq_middleware_django import require_policy, require_agent
import json


def health(request: HttpRequest) -> JsonResponse:
    return JsonResponse({"status": "ok"})


@require_policy("finance.payment.refund.v1")
def process_refund(request: HttpRequest) -> JsonResponse:
    body = json.loads(request.body) if request.body else {}
    return JsonResponse({
        "success": True,
        "agent_id": request.agent["agent_id"],
        "refund_id": f"ref_{body.get('order_id', 'unknown')}",
    })


@require_policy("data.export.create.v1")
def export_data(request: HttpRequest) -> JsonResponse:
    return JsonResponse({"success": True, "agent_id": request.agent["agent_id"]})


@require_agent
def dashboard(request: HttpRequest) -> JsonResponse:
    return JsonResponse({
        "message": f"Welcome agent {request.agent['agent_id']}",
    })


# urls.py
from django.urls import path

from .views import health, process_refund, export_data, dashboard

urlpatterns = [
    path("health", health),
    path("api/refunds", process_refund),
    path("api/data/export", export_data),
    path("api/dashboard", dashboard),
]
