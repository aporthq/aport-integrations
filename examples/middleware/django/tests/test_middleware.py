import json

from django.http import HttpResponse, JsonResponse
from django.test import RequestFactory, SimpleTestCase, override_settings

from aport_django.decorators import aport_required
from aport_django.middleware import APortVerificationMiddleware


class FakeVerifier:
    def __init__(self, *, verified=True, raises=None):
        self.verified = verified
        self.raises = raises
        self.calls = []

    def verify(self, *, agent_id, policy, context=None, request=None):
        self.calls.append(
            {
                "agent_id": agent_id,
                "policy": policy,
                "context": context,
                "path": request.path if request else None,
            }
        )
        if self.raises:
            raise self.raises
        return {
            "verified": self.verified,
            "passport": {"agent_id": agent_id, "scope": policy},
            "reason": None if self.verified else "policy_denied",
        }


def ok_view(request):
    return JsonResponse(
        {
            "ok": True,
            "aport_verified": getattr(request, "aport", {}).get("verified"),
        }
    )


def response_json(response):
    return json.loads(response.content.decode("utf-8"))


class APortVerificationMiddlewareTests(SimpleTestCase):
    def setUp(self):
        self.factory = RequestFactory()

    @override_settings(APORT_POLICIES=[])
    def test_allows_unprotected_paths_without_calling_aport(self):
        verifier = FakeVerifier()
        request = self.factory.get("/health/")

        response = APortVerificationMiddleware(ok_view, client=verifier)(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(verifier.calls, [])
        self.assertFalse(hasattr(request, "aport"))

    @override_settings(
        APORT_POLICIES=[
            {
                "path": "/payments/refund/",
                "methods": ["POST"],
                "policy": "finance.payment.refund.v1",
            }
        ]
    )
    def test_rejects_protected_request_when_agent_id_is_missing(self):
        verifier = FakeVerifier()
        request = self.factory.post("/payments/refund/", data={})

        response = APortVerificationMiddleware(ok_view, client=verifier)(request)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(verifier.calls, [])
        self.assertEqual(response_json(response)["code"], "aport_agent_required")

    @override_settings(
        APORT_POLICIES=[
            {
                "path": "/payments/refund/",
                "methods": ["POST"],
                "policy": "finance.payment.refund.v1",
                "context": {"risk": "high"},
            }
        ]
    )
    def test_attaches_verified_passport_to_request(self):
        verifier = FakeVerifier(verified=True)
        request = self.factory.post(
            "/payments/refund/",
            data={"amount": "25.00"},
            HTTP_X_AGENT_ID="agent_123",
        )

        response = APortVerificationMiddleware(ok_view, client=verifier)(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response_json(response)["aport_verified"], True)
        self.assertEqual(request.aport["verified"], True)
        self.assertEqual(request.aport["passport"]["agent_id"], "agent_123")
        self.assertEqual(
            verifier.calls,
            [
                {
                    "agent_id": "agent_123",
                    "policy": "finance.payment.refund.v1",
                    "context": {"risk": "high"},
                    "path": "/payments/refund/",
                }
            ],
        )

    @override_settings(
        APORT_POLICIES=[
            {
                "path": "/payments/",
                "methods": ["POST"],
                "policy": "finance.payment.write.v1",
            }
        ]
    )
    def test_rejects_failed_verification(self):
        verifier = FakeVerifier(verified=False)
        request = self.factory.post("/payments/refund/", HTTP_X_APORT_AGENT_ID="agent_123")

        response = APortVerificationMiddleware(ok_view, client=verifier)(request)

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response_json(response)["code"], "aport_verification_failed")

    @override_settings(
        APORT_POLICIES=[
            {
                "path": "/payments/refund/",
                "methods": ["POST"],
                "policy": "finance.payment.refund.v1",
            }
        ],
        APORT_STRICT=False,
    )
    def test_fail_open_mode_continues_when_verifier_raises(self):
        verifier = FakeVerifier(raises=RuntimeError("network down"))
        request = self.factory.post("/payments/refund/", HTTP_X_AGENT_ID="agent_123")

        response = APortVerificationMiddleware(ok_view, client=verifier)(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response_json(response)["aport_verified"], False)
        self.assertEqual(request.aport["error"], "network down")

    @override_settings(
        APORT_POLICIES=[],
        APORT_DECORATOR_CLIENT=FakeVerifier(verified=True),
    )
    def test_decorator_requires_policy_for_view(self):
        @aport_required("finance.payment.refund.v1", context={"risk": "high"})
        def protected_view(request):
            return HttpResponse("ok")

        request = self.factory.get("/decorated/", HTTP_X_AGENT_ID="agent_123")

        response = protected_view(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(request.aport["verified"], True)

    @override_settings(
        APORT_POLICIES=[],
        APORT_DECORATOR_CLIENT=FakeVerifier(verified=False),
    )
    def test_decorator_rejects_failed_verification(self):
        @aport_required("finance.payment.refund.v1")
        def protected_view(request):
            return HttpResponse("ok")

        request = self.factory.get("/decorated/", HTTP_X_AGENT_ID="agent_123")

        response = protected_view(request)

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response_json(response)["code"], "aport_verification_failed")
