"""Example: LangGraph state machine with APort checkpoint guardrails."""

import asyncio
from src.guardrails import APortCheckpointGuard, APortState, create_guarded_graph


async def example_guarded_graph():
    """Build and run a simple guarded state machine."""

    async def intake(state: APortState) -> dict:
        return {"messages": state.get("messages", []) + ["intake: received request"]}

    async def review(state: APortState) -> dict:
        return {"messages": state["messages"] + ["review: policy check passed"]}

    async def execute(state: APortState) -> dict:
        return {"messages": state["messages"] + ["execute: action completed"]}

    graph = create_guarded_graph(
        policy="agent.workflow.v1",
        nodes={"intake": intake, "review": review, "execute": execute},
        edges=[("intake", "review"), ("review", "execute")],
        entry_point="intake",
    )

    result = await graph.ainvoke({"agent_id": "agt_demo_001", "messages": []})
    print("Result:", result)
    return result


async def example_manual_guard():
    """Use APortCheckpointGuard directly for fine-grained control."""

    guard = APortCheckpointGuard(policy="agent.custom.v1")

    async def my_node(state: APortState) -> dict:
        return {"messages": ["node executed"]}

    # Wrap the node with verification
    guarded = guard.guard_node("my_node", my_node)
    result = await guarded({"agent_id": "agt_demo_002", "messages": []})
    print("Manual guard result:", result)

    # Guarded edge example
    edge = guard.create_guarded_edge("my_node", "next_node")
    target = await edge({"agent_id": "agt_demo_002", "messages": []})
    print("Edge target:", target)


if __name__ == "__main__":
    asyncio.run(example_guarded_graph())
    asyncio.run(example_manual_guard())
