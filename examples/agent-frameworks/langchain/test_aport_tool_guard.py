import pytest
import asyncio

from langchain.tools import Tool

from aport_tool_guard import APortToolGuard


class DummyAPortClient:
    def __init__(self, verified=True):
        self._verified = verified
        self.verify_called_with = []

    async def verify(self, policy_pack, agent_id):
        self.verify_called_with.append((policy_pack, agent_id))
        return {"verified": self._verified}


def dummy_tool_func(x):
    return f"Processed {x}"


async def dummy_tool_func_async(x):
    await asyncio.sleep(0.01)
    return f"Async processed {x}"


def test_tool_guard_sync_success():
    tool = Tool(name="dummy", description="Dummy tool", func=dummy_tool_func)
    guard = APortToolGuard(tool, "test.policy.v1", "agent123", aport_client=DummyAPortClient(True))
    result = guard("input")
    assert result == "Processed input"
    assert guard.aport_client.verify_called_with == [("test.policy.v1", "agent123")]


def test_tool_guard_sync_fail():
    tool = Tool(name="dummy", description="Dummy tool", func=dummy_tool_func)
    guard = APortToolGuard(tool, "test.policy.v1", "agent123", aport_client=DummyAPortClient(False))
    with pytest.raises(Exception, match="Agent verification failed"):
        guard("input")


@pytest.mark.asyncio
async def test_tool_guard_async_success():
    tool = Tool(name="dummy_async", description="Dummy async tool", func=dummy_tool_func_async)
    guard = APortToolGuard(tool, "test.policy.v1", "agent123", aport_client=DummyAPortClient(True))
    result = await guard._call_tool_async("input")
    assert result == "Async processed input"
    verified = await guard._verify_agent()
    assert verified is True


@pytest.mark.asyncio
async def test_tool_guard_async_fail():
    tool = Tool(name="dummy_async", description="Dummy async tool", func=dummy_tool_func_async)
    guard = APortToolGuard(tool, "test.policy.v1", "agent123", aport_client=DummyAPortClient(False))
    verified = await guard._verify_agent()
    assert verified is False
