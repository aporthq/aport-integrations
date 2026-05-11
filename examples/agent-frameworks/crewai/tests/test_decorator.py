import os
import unittest

from aport_crewai import APortVerificationError, aport_verify


class FakeClient:
    def __init__(self, result=None, error=None):
        self.result = result if result is not None else {"allowed": True}
        self.error = error
        self.calls = []

    def verify(self, policy, agent_id, context=None):
        self.calls.append((policy, agent_id, context))
        if self.error:
            raise self.error
        return self.result


class AsyncFakeClient(FakeClient):
    async def verify(self, policy, agent_id, context=None):
        self.calls.append((policy, agent_id, context))
        if self.error:
            raise self.error
        return self.result


class APortVerifyTests(unittest.TestCase):
    def test_sync_task_runs_after_successful_verification(self):
        client = FakeClient({"allowed": True})
        calls = []

        @aport_verify(
            "finance.payment.refund.v1",
            agent_id="agt_inst_refund_bot_123",
            client=client,
            context={"amount": 50},
        )
        def refund_task():
            calls.append("task")
            return "ok"

        self.assertEqual(refund_task(), "ok")
        self.assertEqual(calls, ["task"])
        self.assertEqual(client.calls[0][0], "finance.payment.refund.v1")
        self.assertEqual(client.calls[0][1], "agt_inst_refund_bot_123")
        self.assertEqual(client.calls[0][2]["framework"], "crewai")
        self.assertEqual(client.calls[0][2]["amount"], 50)

    def test_denied_verification_stops_task(self):
        client = FakeClient({"allowed": False, "reason": "refund limit exceeded"})
        calls = []

        @aport_verify(
            "finance.payment.refund.v1",
            agent_id="agt_inst_refund_bot_123",
            client=client,
        )
        def refund_task():
            calls.append("task")

        with self.assertRaises(APortVerificationError) as error:
            refund_task()

        self.assertIn("refund limit exceeded", str(error.exception))
        self.assertEqual(calls, [])

    def test_agent_id_can_be_derived_from_task_arguments(self):
        client = FakeClient()

        @aport_verify(
            "data.export.v1",
            agent_id=lambda agent_id, rows: agent_id,
            client=client,
            context=lambda agent_id, rows: {"rows": rows},
        )
        def export_task(agent_id, rows):
            return rows

        self.assertEqual(export_task("agt_inst_data_exporter_456", 1000), 1000)
        self.assertEqual(client.calls[0][1], "agt_inst_data_exporter_456")
        self.assertEqual(client.calls[0][2]["rows"], 1000)

    def test_agent_id_can_come_from_environment(self):
        client = FakeClient()
        old_agent_id = os.environ.get("APORT_AGENT_ID")
        os.environ["APORT_AGENT_ID"] = "agt_inst_env_123"

        try:
            @aport_verify("admin.access.v1", client=client)
            def admin_task():
                return "admin"

            self.assertEqual(admin_task(), "admin")
            self.assertEqual(client.calls[0][1], "agt_inst_env_123")
        finally:
            if old_agent_id is None:
                os.environ.pop("APORT_AGENT_ID", None)
            else:
                os.environ["APORT_AGENT_ID"] = old_agent_id

    def test_missing_agent_id_raises_clear_error(self):
        client = FakeClient()

        @aport_verify("finance.payment.refund.v1", client=client)
        def refund_task():
            return "ok"

        with self.assertRaises(APortVerificationError) as error:
            refund_task()

        self.assertIn("agent_id is required", str(error.exception))

    def test_strict_false_allows_client_errors(self):
        client = FakeClient(error=RuntimeError("network down"))

        @aport_verify(
            "finance.payment.refund.v1",
            agent_id="agt_inst_refund_bot_123",
            client=client,
            strict=False,
        )
        def refund_task():
            return "ok"

        self.assertEqual(refund_task(), "ok")


class APortVerifyAsyncTests(unittest.IsolatedAsyncioTestCase):
    async def test_async_task_runs_after_async_verification(self):
        client = AsyncFakeClient({"verified": True})

        @aport_verify("code.repository.merge.v1", agent_id="agt_inst_pr_merger_789", client=client)
        async def merge_task():
            return "merged"

        self.assertEqual(await merge_task(), "merged")
        self.assertEqual(client.calls[0][0], "code.repository.merge.v1")


if __name__ == "__main__":
    unittest.main()
