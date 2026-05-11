from django.http import JsonResponse
from django.urls import path

from aport_django import require_policy


def public_view(request):
    return JsonResponse({"message": "public"})


def refund_view(request):
    return JsonResponse(
        {"success": True, "agent_id": request.aport["agent_id"]},
    )


@require_policy("admin.access")
def admin_view(request):
    return JsonResponse(
        {"success": True, "policy": request.aport["policy"]},
    )


urlpatterns = [
    path("public/", public_view),
    path("refund/", refund_view),
    path("admin/", admin_view),
]
