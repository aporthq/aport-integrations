"""Flask + APort integration example.

Demonstrates agent authentication and policy verification
using the aporthq-sdk-python package.

Usage:
    export APORT_API_KEY=your-api-key
    python app.py
"""

from __future__ import annotations

import asyncio
import os
from functools import wraps
from typing import Any, Dict, Optional

from flask import Flask, jsonify, request

from aporthq_sdk_python import (
    APortClient,
    APortClientOptions,
    AportError,
    PolicyVerificationResponse,
)

app = Flask(__name__)

# ---------------------------------------------------------------------------
# APort client setup
# ---------------------------------------------------------------------------

_client: Optional[APortClient] = None


def get_aport_client() -> APortClient:
    """Lazy-init APort client from environment variables."""
    global _client
    if _client is None:
        opts = APortClientOptions(
            base_url=os.getenv("APORT_BASE_URL", "https://api.aport.io"),
            api_key=os.getenv("APORT_API_KEY", ""),
            timeout_ms=int(os.getenv("APORT_TIMEOUT_MS", "5000")),
        )
        _client = APortClient(opts)
    return _client


# ---------------------------------------------------------------------------
# Helper decorators
# ---------------------------------------------------------------------------


def _extract_agent_id() -> Optional[str]:
    """Extract agent ID from body.passport.agent_id, then headers."""
    body = request.get_json(silent=True)
    if body:
        passport = body.get("passport") or {}
        aid = passport.get("agent_id") if isinstance(passport, dict) else None
        if aid:
            return aid
    return request.headers.get("X-Agent-Passport-Id") or request.headers.get(
        "X-Agent-Id"
    )


def require_agent(f):
    """Decorator: require a valid APort agent identity."""

    @wraps(f)
    def wrapper(*args, **kwargs):
        agent_id = _extract_agent_id()
        if not agent_id:
            return jsonify({"error": "Agent ID is required"}), 401

        try:
            client = get_aport_client()
            result = asyncio.run(client.verify_agent(agent_id))
        except AportError as exc:
            return jsonify({"error": str(exc), "code": exc.error_code}), 403
        except Exception as exc:
            return jsonify({"error": f"Verification failed: {exc}"}), 500

        request.agent_id = agent_id  # type: ignore[attr-defined]
        request.verification = result  # type: ignore[attr-defined]
        return f(*args, **kwargs)

    return wrapper


def require_policy(policy_id: str):
    """Decorator: require a specific APort policy to pass."""

    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            agent_id = _extract_agent_id()
            if not agent_id:
                return jsonify({"error": "Agent ID is required"}), 401

            try:
                client = get_aport_client()
                body = request.get_json(silent=True) or {}
                # Policy ID can come from the decorator or request body
                pid = body.get("passport", {}).get("policy_id") if isinstance(
                    body.get("passport"), dict
                ) else policy_id
                result: PolicyVerificationResponse = asyncio.run(
                    client.verify_policy(agent_id, pid, context=body)
                )
                if not result.allowed:
                    return jsonify(
                        {
                            "error": "Policy violation",
                            "policy_id": pid,
                            "details": getattr(result, "details", None),
                        }
                    ), 403
            except AportError as exc:
                return jsonify({"error": str(exc), "code": exc.error_code}), 403
            except Exception as exc:
                return jsonify({"error": f"Policy check failed: {exc}"}), 500

            request.agent_id = agent_id  # type: ignore[attr-defined]
            request.policy_result = result  # type: ignore[attr-defined]
            return f(*args, **kwargs)

        return wrapper

    return decorator


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.route("/health")
def health():
    """Health check — no auth required."""
    return jsonify({"status": "ok", "service": "flask-aport-example"})


@app.route("/api/agent/info")
@require_agent
def agent_info():
    """Returns info about the authenticated agent."""
    return jsonify(
        {
            "agent_id": request.agent_id,
            "message": "Agent verified successfully",
        }
    )


@app.route("/api/data/sensitive")
@require_policy("data-access-policy")
def sensitive_data():
    """Requires 'data-access-policy' to be satisfied."""
    return jsonify(
        {
            "agent_id": request.agent_id,
            "data": {"secret": "This is protected data"},
        }
    )


@app.route("/api/action/write", methods=["POST"])
@require_policy("write-permission-policy")
def write_action():
    """Requires 'write-permission-policy'. Accepts JSON body."""
    payload = request.get_json(silent=True) or {}
    return jsonify(
        {"agent_id": request.agent_id, "action": "write", "received": payload}
    )


@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Not found"}), 404


@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Internal server error"}), 500


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    debug = os.getenv("FLASK_DEBUG", "0") == "1"
    port = int(os.getenv("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=debug)
