from django.http import JsonResponse

from aport_django import require_policy


def public(request):
    return JsonResponse({"message": "public"})


def middleware_refund(request):
    return JsonResponse(
        {
            "message": "verified by middleware",
            "agent_id": request.aport["agent_id"],
        }
    )


@require_policy("finance.payment.refund.v1")
def decorator_refund(request):
    return JsonResponse(
        {
            "message": "verified by decorator",
            "agent_id": request.aport["agent_id"],
        }
    )
