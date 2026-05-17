import os
from functools import wraps
from typing import Any, Callable

import requests
from flask import Flask, current_app, jsonify, request


VerifyResult = dict[str, Any]
Verifier = Callable[[str, str, dict[str, Any]], VerifyResult]


class APortClient:
    def __init__(self, api_key: str, base_url: str = "https://aport.io", timeout: int = 5):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def verify(self, policy_id: str, agent_id: str, context: dict[str, Any]) -> VerifyResult:
        response = requests.post(
            f"{self.base_url}/api/verify/policy/{policy_id}",
            headers={
                "Accept": "application/json",
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            json={
                "agent_id": agent_id,
                "context": context,
                "policy_id": policy_id,
            },
            timeout=self.timeout,
        )
        response.raise_for_status()
        payload = response.json()

        return {
            "allow": bool(payload.get("allow", payload.get("allowed", False))),
            "reasons": payload.get("reasons") or [],
            "raw": payload,
        }


def require_aport(policy_id: str):
    def decorator(view):
        @wraps(view)
        def wrapped(*args, **kwargs):
            agent_id = request.headers.get("X-APort-Agent-ID", "").strip()

            if not agent_id:
                return (
                    jsonify(
                        {
                            "error": "missing_agent_id",
                            "message": "Send X-APort-Agent-ID with the request.",
                        }
                    ),
                    401,
                )

            context = {
                "method": request.method,
                "path": request.path,
                "remote_addr": request.remote_addr,
            }
            verifier: Verifier = current_app.config["APORT_VERIFIER"]

            try:
                result = verifier(policy_id, agent_id, context)
            except requests.RequestException as error:
                return (
                    jsonify(
                        {
                            "error": "aport_verification_failed",
                            "message": str(error),
                        }
                    ),
                    502,
                )

            if not result["allow"]:
                return (
                    jsonify(
                        {
                            "error": "policy_denied",
                            "reasons": result["reasons"],
                        }
                    ),
                    403,
                )

            return view(*args, **kwargs)

        return wrapped

    return decorator


def create_app(verifier: Verifier | None = None) -> Flask:
    app = Flask(__name__)
    policy_id = os.getenv("APORT_POLICY_ID", "code.repository.merge.v1")

    if verifier is None:
        api_key = os.getenv("APORT_API_KEY")
        if not api_key:
            raise RuntimeError("Set APORT_API_KEY or pass a verifier for tests.")

        client = APortClient(
            api_key=api_key,
            base_url=os.getenv("APORT_API_BASE_URL", "https://aport.io"),
        )
        verifier = client.verify

    app.config["APORT_VERIFIER"] = verifier

    @app.get("/")
    def index():
        return jsonify({"message": "APort Flask example", "protected": "/protected"})

    @app.get("/protected")
    @require_aport(policy_id)
    def protected():
        return jsonify({"message": "APort policy accepted this request."})

    return app


if __name__ == "__main__":
    create_app().run(debug=True)
