"""Example: LangChain agent with APort-guarded tools.

This script demonstrates how to wrap LangChain tools with APortToolGuard
so that every tool execution is gated by an APort verification check.

Requirements:
    pip install langchain langchain-core

Run:
    python example.py
"""

import os
from typing import Optional

# If running from within the langchain directory, add path for imports
import sys
sys.path.insert(0, os.path.dirname(__file__))

from tool_guard import APortToolGuard, guard_tool, ToolVerificationError
from langchain_core.tools import tool


# ---------------------------------------------------------------------------
# 1. Define your tools (standard LangChain @tool decorator)
# ---------------------------------------------------------------------------

@tool
def get_customer_email(customer_id: str) -> str:
    """Return the email address for a given customer ID.

    Args:
        customer_id: The customer's unique identifier.
    """
    # In a real app this would query a database
    return f"customer_{customer_id}@example.com"


@tool
def issue_refund(transaction_id: str, amount: float) -> str:
    """Issue a refund for a transaction.

    Args:
        transaction_id: The transaction to refund.
        amount: The amount in USD to refund.
    """
    return f"Refund of ${amount:.2f} issued for transaction {transaction_id}"


@tool
def export_user_data(user_id: str, format: str = "json") -> str:
    """Export all data associated with a user.

    Args:
        user_id: The user whose data to export.
        format: Output format ('json' or 'csv').
    """
    return f"Exported data for user {user_id} in {format} format"


# ---------------------------------------------------------------------------
# 2. Guard sensitive tools with APort policies
# ---------------------------------------------------------------------------

# Set agent ID for demo (in production, this comes from auth context)
os.environ["APORT_AGENT_ID"] = "agt_demo_agent_001"

# Guard tools with different policies
guarded_refund = guard_tool(
    tool=issue_refund,
    policy="finance.payment.refund.v1",
)
guarded_export = guard_tool(
    tool=export_user_data,
    policy="privacy.data.export.v1",
)
# get_customer_email is intentionally left unguarded (public tool)


# ---------------------------------------------------------------------------
# 3. Build an agent that uses both guarded and unguarded tools
# ---------------------------------------------------------------------------

def run_agent_example():
    """Demonstrate tool execution with and without APort guards."""
    tools = {
        "get_customer_email": get_customer_email,
        "issue_refund": guarded_refund,
        "export_user_data": guarded_export,
    }

    print("=" * 60)
    print("LangChain + APort Tool Guard — Example")
    print("=" * 60)
    print()

    # --- Public tool (no guard) ---
    print("1. Unguarded tool — no APort check:")
    result = tools["get_customer_email"].invoke({"customer_id": "cust_42"})
    print(f"   ✅ Result: {result}")
    print()

    # --- Guarded tool (verification passes) ---
    print("2. Guarded tool — APort verification passes → tool executes:")
    try:
        result = tools["issue_refund"].invoke({
            "transaction_id": "txn_abc",
            "amount": 49.99,
        })
        print(f"   ✅ Result: {result}")
    except ToolVerificationError as exc:
        print(f"   ❌ Blocked: {exc}")
    print()

    # --- Guarded tool (same agent, different policy) ---
    print("3. Guarded tool — data export with privacy policy:")
    try:
        result = tools["export_user_data"].invoke({
            "user_id": "user_789",
            "format": "csv",
        })
        print(f"   ✅ Result: {result}")
    except ToolVerificationError as exc:
        print(f"   ❌ Blocked: {exc}")
    print()

    # --- Demonstrate config-based agent_id override ---
    print("4. Guarded tool with per-call agent_id via RunnableConfig:")
    guarded_dynamic = APortToolGuard(
        wrapped_tool=issue_refund,
        policy="finance.payment.refund.v1",
        # agent_id NOT set — resolved from config at call time
    )
    try:
        result = guarded_dynamic.invoke(
            {"transaction_id": "txn_dynamic", "amount": 25.00},
            config={"metadata": {"aport_agent_id": "agt_config_override"}},
        )
        print(f"   ✅ Result: {result}")
    except ToolVerificationError as exc:
        print(f"   ❌ Blocked: {exc}")
    print()

    print("=" * 60)
    print("All examples completed.")
    print("=" * 60)


if __name__ == "__main__":
    run_agent_example()
