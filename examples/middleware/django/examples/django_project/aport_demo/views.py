import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt


def health(request):
    return JsonResponse({"ok": True})


@csrf_exempt
def refund_payment(request):
    payload = _json_body(request)
    return JsonResponse(
        {
            "ok": True,
            "amount": payload.get("amount"),
            "currency": payload.get("currency", "USD"),
            "aport": request.aport,
        }
    )


def _json_body(request):
    if not request.body:
        return {}
    try:
        return json.loads(request.body.decode(request.encoding or "utf-8"))
    except (TypeError, ValueError, UnicodeDecodeError):
        return {}
