from aport_crewai import aport_verify


@aport_verify(
    "finance.payment.refund.v1",
    task_type="refund_approval",
    context=lambda order_id, amount: {"order_id": order_id, "amount": amount},
)
def approve_refund(order_id: str, amount: float) -> str:
    return f"Refund approved for {order_id}: ${amount:.2f}"


@aport_verify(
    "data.export.v1",
    task_type="data_export",
    context={"dataset": "customers", "contains_pii": True},
)
def export_customer_rows(limit: int) -> str:
    return f"Exporting {limit} customer rows"


@aport_verify("code.repository.merge.v1", task_type="repo_merge")
async def merge_pull_request(repo: str, pull_request: int) -> str:
    return f"Merging {repo}#{pull_request}"


if __name__ == "__main__":
    print(approve_refund("order_123", 25.0))
