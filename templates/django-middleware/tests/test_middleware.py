from unittest.mock import patch

import pytest
from django.test import Client, override_settings

from aport_django.client import VerificationResult


@pytest.fixture
def client():
    return Client()


class DenyingClient:
    def __init__(self, *args, **kwargs):
        pass

    def verify(self, policy, agent_id, context=None):
        return VerificationResult(
            verified=False,
            policy=policy,
            message="Agent not authorized",
            details={"reason": "missing_capability"},
        )


class ErrorClient:
    def __init__(self, *args, **kwargs):
        pass

    def verify(self, policy, agent_id, context=None):
        raise RuntimeError("APort unavailable")


def test_public_endpoint_skips_verification(client):
    response = client.get("/public/")

    assert response.status_code == 200
    assert response.json() == {"message": "public"}


def test_successful_verification_from_header(client):
    response = client.post(
        "/refund/",
        HTTP_X_AGENT_ID="agt_test123",
        REMOTE_ADDR="127.0.0.1",
    )

    assert response.status_code == 200
    assert response.json() == {"success": True, "agent_id": "agt_test123"}


def test_successful_verification_from_query(client):
    response = client.post("/refund/?agent_id=agt_query123")

    assert response.status_code == 200
    assert response.json()["agent_id"] == "agt_query123"


def test_successful_verification_from_json_body(client):
    response = client.post(
        "/refund/",
        data={"agentId": "agt_body123"},
        content_type="application/json",
    )

    assert response.status_code == 200
    assert response.json()["agent_id"] == "agt_body123"


def test_missing_agent_id_returns_400(client):
    response = client.post("/refund/")

    assert response.status_code == 400
    assert response.json()["error"] == "Agent ID required"


@override_settings(APORT_CLIENT_CLASS=DenyingClient)
def test_failed_verification_returns_403(client):
    response = client.post("/refund/", HTTP_X_AGENT_ID="agt_unauthorized")

    assert response.status_code == 403
    assert response.json()["error"] == "Verification failed"
    assert response.json()["message"] == "Agent not authorized"


@override_settings(APORT_CLIENT_CLASS=ErrorClient)
def test_strict_verification_error_returns_500(client):
    response = client.post("/refund/", HTTP_X_AGENT_ID="agt_test123")

    assert response.status_code == 500
    assert response.json()["error"] == "Verification error"


@override_settings(APORT_CLIENT_CLASS=ErrorClient, APORT_STRICT=False)
def test_non_strict_verification_error_allows_request(client):
    response = client.post("/refund/", HTTP_X_AGENT_ID="agt_test123")

    assert response.status_code == 200
    assert response.json() == {"success": True, "agent_id": "agt_test123"}


def test_require_policy_decorator_verifies_view(client):
    response = client.post("/admin/", HTTP_X_AGENT_ID="agt_admin")

    assert response.status_code == 200
    assert response.json() == {"success": True, "policy": "admin.access"}


def test_context_passes_request_metadata(client):
    with patch("aport_django.client.MockAPortClient.verify") as verify:
        verify.return_value = VerificationResult(
            verified=True,
            passport={},
            policy="finance.payment.refund.v1",
        )

        response = client.post(
            "/refund/",
            HTTP_X_AGENT_ID="agt_context",
            HTTP_USER_AGENT="pytest",
        )

    assert response.status_code == 200
    _, kwargs = verify.call_args
    assert kwargs["context"]["method"] == "POST"
    assert kwargs["context"]["path"] == "/refund/"
    assert kwargs["context"]["user_agent"] == "pytest"
