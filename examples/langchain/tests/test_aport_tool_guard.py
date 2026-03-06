import pytest

from aport_tool_guard import APortToolGuard, APortToolGuardError


def allow(_):
    return {"allowed": True}


def deny(_):
    return {"allowed": False, "reason": "blocked"}


def demo_tool(x: int, **kwargs):
    return x + 1


def test_guard_allows_tool_execution():
    g = APortToolGuard(
        allow,
        actor_id_getter=lambda *a, **k: k.get("actor_id", "agent:trusted"),
        resource_getter=lambda *a, **k: "langchain:tool:demo",
    )
    wrapped = g.wrap(demo_tool)
    assert wrapped(1, actor_id="agent:trusted") == 2


def test_guard_blocks_tool_execution():
    g = APortToolGuard(
        deny,
        actor_id_getter=lambda *a, **k: k.get("actor_id", "agent:blocked"),
        resource_getter=lambda *a, **k: "langchain:tool:demo",
    )
    wrapped = g.wrap(demo_tool)
    with pytest.raises(APortToolGuardError):
        wrapped(1, actor_id="agent:blocked")
