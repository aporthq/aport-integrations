import pytest

from aport_verify import APortVerificationError, APortVerifier, aport_verify


def verifier_allow(payload):
    return {"allowed": True}


def verifier_deny(payload):
    return {"allowed": False, "reason": "blocked by policy"}


def test_sync_task_allowed():
    v = APortVerifier(verifier_allow)

    @aport_verify(
        v,
        actor_id_getter=lambda *a, **k: k["actor_id"],
        action="task.execute",
        resource="crewai:task:demo",
    )
    def task(*, actor_id: str):
        return "ok"

    assert task(actor_id="agent:trusted") == "ok"


def test_sync_task_denied():
    v = APortVerifier(verifier_deny)

    @aport_verify(
        v,
        actor_id_getter=lambda *a, **k: k["actor_id"],
        action="task.execute",
        resource="crewai:task:demo",
    )
    def task(*, actor_id: str):
        return "ok"

    with pytest.raises(APortVerificationError):
        task(actor_id="agent:blocked")


@pytest.mark.asyncio
async def test_async_task_allowed():
    v = APortVerifier(verifier_allow)

    @aport_verify(
        v,
        actor_id_getter=lambda *a, **k: k["actor_id"],
        action="task.execute",
        resource="crewai:task:demo_async",
    )
    async def task(*, actor_id: str):
        return "ok"

    assert await task(actor_id="agent:trusted") == "ok"
