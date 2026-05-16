"""Basic usage examples for APort CrewAI verification decorator."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from aport_verify import (
    aport_verify,
    APortVerificationError,
    APortHTTPClient,
    VerificationResult,
)


class MockClient:
    def __init__(self, allow: bool = True):
        self.allow = allow

    def verify(self, policy: str, agent_id: str, context=None):
        return VerificationResult(
            verified=self.allow,
            allow=self.allow,
            reasons=["mock verified"] if self.allow else ["mock denied"],
        )


# Use mock client for demo
mock_client = MockClient(allow=True)


@aport_verify("code.repository.merge.v1", client=mock_client)
def merge_code(repo: str, branch: str) -> str:
    return f"Merged {branch} into {repo}"


@aport_verify("finance.payment.refund.v1", agent_id="agent_finance_001", client=mock_client)
def process_refund(amount: float, agent_id: str = None) -> str:
    return f"Refunded ${amount:.2f}"


@aport_verify(
    "data.export.v1",
    client=mock_client,
    context_builder=lambda format, **kw: {"format": format},
)
def export_data(format: str) -> str:
    return f"Exported data as {format}"


@aport_verify("monitoring.alert.send", strict=False, client=mock_client)
def send_alert(message: str) -> str:
    return f"Alert sent: {message}"


def main():
    print("=" * 60)
    print("CrewAI + APort Task Verification — Examples")
    print("=" * 60)
    print()

    print("1. Basic merge task:")
    result = merge_code("main", "feature/login")
    print(f"   ✅ {result}")
    print()

    print("2. Refund task with static agent ID:")
    result = process_refund(49.99)
    print(f"   ✅ {result}")
    print()

    print("3. Export task with context injection:")
    result = export_data("csv")
    print(f"   ✅ {result}")
    print()

    print("4. Non-strict alert task (denial doesn't block):")
    result = send_alert("high cpu usage")
    print(f"   ✅ {result}")
    print()

    print("5. Denied task (strict mode):")
    deny_client = MockClient(allow=False)
    deny_decorator = aport_verify("secure.action.v1", client=deny_client, strict=True)

    @deny_decorator
    def secure_action(agent_id=None):
        return "This should not run"

    try:
        secure_action(agent_id="test_agent")
        print("   ❌ Should have raised!")
    except APortVerificationError as e:
        print(f"   ✅ Blocked as expected: {e}")
    print()

    print("All examples completed.")


if __name__ == "__main__":
    main()