import requests

from app import create_app


def test_protected_route_requires_agent_id():
    app = create_app(verifier=lambda policy, agent, context: {"allow": True, "reasons": []})

    response = app.test_client().get("/protected")

    assert response.status_code == 401
    assert response.get_json()["error"] == "missing_agent_id"


def test_protected_route_allows_verified_agent():
    calls = []

    def verifier(policy_id, agent_id, context):
        calls.append((policy_id, agent_id, context))
        return {"allow": True, "reasons": []}

    app = create_app(verifier=verifier)

    response = app.test_client().get(
        "/protected",
        headers={"X-APort-Agent-ID": "agt_123"},
    )

    assert response.status_code == 200
    assert response.get_json()["message"] == "APort policy accepted this request."
    assert calls[0][0] == "code.repository.merge.v1"
    assert calls[0][1] == "agt_123"
    assert calls[0][2]["path"] == "/protected"


def test_protected_route_blocks_denied_agent():
    app = create_app(
        verifier=lambda policy, agent, context: {
            "allow": False,
            "reasons": ["agent is not allowed"],
        }
    )

    response = app.test_client().get(
        "/protected",
        headers={"X-APort-Agent-ID": "agt_123"},
    )

    assert response.status_code == 403
    assert response.get_json()["reasons"] == ["agent is not allowed"]


def test_protected_route_reports_aport_api_failure():
    def verifier(policy_id, agent_id, context):
        raise requests.Timeout("APort request timed out")

    app = create_app(verifier=verifier)

    response = app.test_client().get(
        "/protected",
        headers={"X-APort-Agent-ID": "agt_123"},
    )

    assert response.status_code == 502
    assert response.get_json()["error"] == "aport_verification_failed"
