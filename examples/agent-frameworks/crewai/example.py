from aport_verify import APortVerifier, aport_verify


# Mock verify callable; replace with aporthq-sdk-python client.verify in production.
def mock_verify(payload):
    # allow only trusted actor for demo
    if payload.get("actor_id") == "agent:trusted":
        return {"allowed": True, "reason": "ok"}
    return {"allowed": False, "reason": "actor not allowed"}


verifier = APortVerifier(mock_verify)


@aport_verify(
    verifier,
    actor_id_getter=lambda *a, **k: k.get("actor_id", "unknown"),
    action="task.execute",
    resource="crewai:task:send_report",
    context_getter=lambda *a, **k: {"task_type": "report"},
)
def protected_task(*, actor_id: str, report: str) -> str:
    return f"sent:{report}"


if __name__ == "__main__":
    print(protected_task(actor_id="agent:trusted", report="daily-pnl"))
