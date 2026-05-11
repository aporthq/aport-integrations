"""Basic CrewAI task usage with the APort verification decorator."""

from aport_crewai import aport_verify


class DemoAPortClient:
    """Example client used to keep this demo runnable without credentials."""

    def verify(self, policy, agent_id, context=None):
        print(f"Verifying {agent_id} against {policy} with context {context}")
        return {"allowed": True}


@aport_verify(
    "finance.payment.refund.v1",
    agent_id="agt_inst_refund_bot_123",
    client=DemoAPortClient(),
    context=lambda order_id, amount: {
        "order_id": order_id,
        "amount": amount,
        "currency": "USD",
    },
)
def create_refund(order_id: str, amount: float) -> dict:
    """CrewAI task body that only runs after APort verification succeeds."""
    return {
        "refund_id": f"refund_{order_id}",
        "amount": amount,
        "status": "created",
    }


if __name__ == "__main__":
    print(create_refund("ord_123", 42.5))
