import pytest

from aport_crewai import APortDecision, APortVerificationError, aport_verify
from aport_crewai.decorator import build_task_context


class FakeClient:
    def __init__(self, decision):
        self.decision = decision
        self.calls = []

    def verify(self, policy_pack, context):
        self.calls.append((policy_pack, context))
        return self.decision


def test_allows_sync_task_after_verification():
    client = FakeClient(APortDecision(allow=True, decision_id="dec_allow"))

    @aport_verify("finance.payment.refund.v1", task_type="refund", client=client)
    def refund(amount):
        return f"refunded {amount}"

    assert refund(25) == "refunded 25"
    assert client.calls[0][0] == "finance.payment.refund.v1"
    assert client.calls[0][1]["task_type"] == "refund"
    assert client.calls[0][1]["args"] == [25]


def test_denies_sync_task_before_execution():
    client = FakeClient(APortDecision(allow=False, reasons=("limit exceeded",), decision_id="dec_deny"))
    executed = False

    @aport_verify("finance.payment.refund.v1", client=client)
    def refund():
        nonlocal executed
        executed = True

    with pytest.raises(APortVerificationError, match="limit exceeded"):
        refund()

    assert executed is False


@pytest.mark.asyncio
async def test_allows_async_task_after_verification():
    client = FakeClient(APortDecision(allow=True))

    @aport_verify("code.repository.merge.v1", task_type="repo_merge", client=client)
    async def merge(repo, number):
        return f"{repo}#{number}"

    assert await merge("aporthq/aport-integrations", 117) == "aporthq/aport-integrations#117"
    assert client.calls[0][1]["task_type"] == "repo_merge"


def test_includes_static_and_dynamic_context():
    client = FakeClient(APortDecision(allow=True))

    @aport_verify(
        "data.export.v1",
        client=client,
        context=lambda limit: {"dataset": "customers", "limit": limit},
    )
    def export(limit):
        return limit

    export(100)
    assert client.calls[0][1]["dataset"] == "customers"
    assert client.calls[0][1]["limit"] == 100


def test_build_task_context_serializes_non_json_values():
    def task(value):
        return value

    context = build_task_context("generic", task, ({object()},), {}, {"extra": object()})
    assert context["task_type"] == "generic"
    assert isinstance(context["args"][0][0], str)
    assert isinstance(context["extra"], str)
