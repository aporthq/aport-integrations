"""Tests for APort Django middleware — fully mocked, no real API calls."""

from __future__ import annotations

import json
import pytest
from unittest.mock import MagicMock, patch
from types import SimpleNamespace

from django.http import HttpRequest, JsonResponse
from django.test import RequestFactory

# ---------------------------------------------------------------------------
# Ensure the package is importable
# ---------------------------------------------------------------------------
from aporthq_middleware_django.middleware import (
    AgentPassportMiddleware,
    AgentPassportMiddlewareOptions,
    extract_agent_id,
    _error_json,
)
from aporthq_middleware_django.decorators import require_policy, require_agent
from aporthq_middleware_django.exceptions import (
    AgentIdMissingError,
    PolicyViolationError,
    FieldValidationError,
)
from aporthq_middleware_django.options import PolicyOptions


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def rf():
    return RequestFactory()


@pytest.fixture
def dummy_get_response():
    return lambda r: r


def _mock_decision(allow: bool = True, decision_id: str = "dec_123", reasons=None):
    """Return a mock that behaves like PolicyVerificationResponse."""
    obj = SimpleNamespace(
        allow=allow,
        decision_id=decision_id,
        reasons=reasons or [],
    )
    return obj


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestExtractAgentId:
    """Tests for the extract_agent_id helper."""

    def test_from_header_x_agent_passport_id(self, rf):
        req = rf.get("/", HTTP_X_AGENT_PASSPORT_ID="ap_abc123")
        assert extract_agent_id(req) == "ap_abc123"

    def test_from_header_x_agent_id_fallback(self, rf):
        req = rf.get("/", HTTP_X_AGENT_ID="ap_xyz789")
        assert extract_agent_id(req) == "ap_xyz789"

    def test_priority_passport_id_over_agent_id(self, rf):
        req = rf.get("/", HTTP_X_AGENT_PASSPORT_ID="ap_first", HTTP_X_AGENT_ID="ap_second")
        assert extract_agent_id(req) == "ap_first"

    def test_from_body_passport(self, rf):
        req = rf.post("/", data=json.dumps({"passport": {"agent_id": "ap_body"}}), content_type="application/json")
        body = json.loads(req.body)
        assert extract_agent_id(req, body_json=body) == "ap_body"

    def test_body_over_header(self, rf):
        req = rf.post(
            "/",
            data=json.dumps({"passport": {"agent_id": "ap_body"}}),
            content_type="application/json",
            HTTP_X_AGENT_ID="ap_header",
        )
        body = json.loads(req.body)
        assert extract_agent_id(req, body_json=body) == "ap_body"

    def test_missing_returns_none(self, rf):
        req = rf.get("/")
        assert extract_agent_id(req) is None


class TestAgentPassportMiddleware:
    """Tests for the main middleware class."""

    @patch("aporthq_middleware_django.middleware._create_client")
    def test_skip_health_path(self, mock_create, rf, dummy_get_response):
        mock_client = MagicMock()
        mock_client.verify.return_value = _mock_decision(allow=True)
        mock_create.return_value = mock_client

        mw = AgentPassportMiddleware(dummy_get_response)
        req = rf.get("/health")
        resp = mw.process_request(req)
        assert resp is None

    @patch("aporthq_middleware_django.middleware._create_client")
    def test_missing_agent_id_fail_closed(self, mock_create, rf, dummy_get_response):
        mock_create.return_value = MagicMock()
        mw = AgentPassportMiddleware(dummy_get_response)
        req = rf.get("/api/data")
        resp = mw.process_request(req)
        assert resp is not None
        assert resp.status_code == 401
        data = json.loads(resp.content)
        assert data["error"] == "missing_agent_id"

    @patch("aporthq_middleware_django.middleware._create_client")
    def test_missing_agent_id_fail_open(self, mock_create, rf, dummy_get_response):
        mock_create.return_value = MagicMock()
        opts = AgentPassportMiddlewareOptions(fail_closed=False)
        with patch("aporthq_middleware_django.middleware._get_options", return_value=opts):
            mw = AgentPassportMiddleware(dummy_get_response)
            req = rf.get("/api/data")
            resp = mw.process_request(req)
            assert resp is None
            assert req.agent is None

    @patch("aporthq_middleware_django.middleware._create_client")
    def test_successful_verification(self, mock_create, rf, dummy_get_response):
        mock_client = MagicMock()
        mock_client.verify.return_value = _mock_decision(allow=True)
        mock_create.return_value = mock_client

        opts = AgentPassportMiddlewareOptions(policy_id="finance.payment.refund.v1")
        with patch("aporthq_middleware_django.middleware._get_options", return_value=opts):
            mw = AgentPassportMiddleware(dummy_get_response)
            req = rf.get("/api/refund", HTTP_X_AGENT_PASSPORT_ID="ap_abc")
            resp = mw.process_request(req)
            assert resp is None
            assert req.agent["agent_id"] == "ap_abc"

    @patch("aporthq_middleware_django.middleware._create_client")
    def test_policy_violation_returns_403(self, mock_create, rf, dummy_get_response):
        mock_client = MagicMock()
        mock_client.verify.return_value = _mock_decision(allow=False, reasons=["insufficient_assurance"])
        mock_create.return_value = mock_client

        opts = AgentPassportMiddlewareOptions(policy_id="finance.payment.refund.v1")
        with patch("aporthq_middleware_django.middleware._get_options", return_value=opts):
            mw = AgentPassportMiddleware(dummy_get_response)
            req = rf.get("/api/refund", HTTP_X_AGENT_PASSPORT_ID="ap_abc")
            resp = mw.process_request(req)
            assert resp is not None
            assert resp.status_code == 403
            data = json.loads(resp.content)
            assert data["error"] == "policy_violation"


class TestRequirePolicyDecorator:
    """Tests for the @require_policy decorator."""

    @patch("aporthq_middleware_django.decorators._create_client")
    def test_policy_allowed(self, mock_create, rf):
        mock_client = MagicMock()
        mock_client.verify.return_value = _mock_decision(allow=True)
        mock_create.return_value = mock_client

        @require_policy("finance.payment.refund.v1", agent_id="ap_abc")
        def view(request):
            return JsonResponse({"ok": True})

        req = rf.get("/api/refund")
        resp = view(req)
        assert resp.status_code == 200
        assert json.loads(resp.content)["ok"] is True

    @patch("aporthq_middleware_django.decorators._create_client")
    def test_policy_denied(self, mock_create, rf):
        mock_client = MagicMock()
        mock_client.verify.return_value = _mock_decision(allow=False)
        mock_create.return_value = mock_client

        @require_policy("finance.payment.refund.v1", agent_id="ap_abc")
        def view(request):
            return JsonResponse({"ok": True})

        req = rf.get("/api/refund")
        resp = view(req)
        assert resp.status_code == 403

    def test_missing_agent_id(self, rf):
        @require_policy("finance.payment.refund.v1")
        def view(request):
            return JsonResponse({"ok": True})

        req = rf.get("/api/refund")
        resp = view(req)
        assert resp.status_code == 401


class TestRequireAgentDecorator:
    """Tests for the @require_agent decorator."""

    def test_with_existing_agent(self, rf):
        @require_agent
        def view(request):
            return JsonResponse({"agent": request.agent["agent_id"]})

        req = rf.get("/api/data")
        req.agent = {"agent_id": "ap_existing"}
        resp = view(req)
        assert resp.status_code == 200

    def test_missing_agent_id_fail_closed(self, rf):
        @require_agent
        def view(request):
            return JsonResponse({"ok": True})

        req = rf.get("/api/data")
        resp = view(req)
        assert resp.status_code == 401

    def test_missing_agent_id_fail_open(self, rf):
        from aporthq_middleware_django.options import AgentPassportMiddlewareOptions
        with patch("aporthq_middleware_django.decorators._get_global_options",
                    return_value=AgentPassportMiddlewareOptions(fail_closed=False)):
            @require_agent
            def view(request):
                return JsonResponse({"ok": True})

            req = rf.get("/api/data")
            resp = view(req)
            assert resp.status_code == 200

    def test_header_agent_id(self, rf):
        @require_agent
        def view(request):
            return JsonResponse({"agent": request.agent["agent_id"]})

        req = rf.get("/api/data", HTTP_X_AGENT_PASSPORT_ID="ap_header")
        resp = view(req)
        assert resp.status_code == 200
        assert json.loads(resp.content)["agent"] == "ap_header"


class TestExceptions:
    """Tests for custom exceptions."""

    def test_agent_id_missing_defaults(self):
        exc = AgentIdMissingError()
        assert exc.error_code == "missing_agent_id"

    def test_policy_violation_with_ids(self):
        exc = PolicyViolationError(agent_id="ap_1", policy_id="pol_1")
        assert exc.agent_id == "ap_1"
        assert exc.policy_id == "pol_1"

    def test_field_validation(self):
        exc = FieldValidationError("order_id missing")
        assert exc.message == "order_id missing"
        assert exc.error_code == "field_validation_failed"
