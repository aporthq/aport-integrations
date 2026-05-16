"""Tests for APort CrewAI verification decorator."""

import os
import sys
import unittest
from unittest.mock import patch, MagicMock
from contextlib import contextmanager

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from aport_verify import (
    aport_verify,
    APortVerificationError,
    APortHTTPClient,
    VerificationResult,
)


class MockAPortClient:
    """Mock client for testing."""

    def __init__(self, result: VerificationResult):
        self._result = result

    def verify(self, policy, agent_id, context=None):
        return self._result


@contextmanager
def _env_helper(**vars):
    original = {}
    for k in vars:
        original[k] = os.environ.get(k)
    for k, v in vars.items():
        if v is None:
            os.environ.pop(k, None)
        else:
            os.environ[k] = v
    try:
        yield
    finally:
        for k, v in original.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v


class TestVerificationResult(unittest.TestCase):
    def test_result_defaults(self):
        r = VerificationResult(verified=True, allow=True)
        self.assertEqual(r.reasons, [])
        self.assertEqual(r.passport, {})


class TestSyncVerification(unittest.TestCase):
    def setUp(self):
        self.client = MockAPortClient(
            VerificationResult(verified=True, allow=True, reasons=["ok"])
        )

    def test_verify_passes_and_runs(self):
        @aport_verify("test.policy.v1", client=self.client)
        def task(x):
            return f"ran {x}"

        with _env_helper(APORT_AGENT_ID="sync_test_agent"):
            result = task("arg")
            self.assertEqual(result, "ran arg")

    def test_verify_denies_strict_raises(self):
        deny_client = MockAPortClient(
            VerificationResult(verified=False, allow=False, reasons=["denied"])
        )

        @aport_verify("test.policy.v1", client=deny_client, strict=True)
        def task():
            return "should not run"

        with _env_helper(APORT_AGENT_ID="deny_agent"):
            with self.assertRaises(APortVerificationError) as ctx:
                task()
            self.assertIn("denied", str(ctx.exception))

    def test_verify_denies_nonstrict_runs(self):
        deny_client = MockAPortClient(
            VerificationResult(verified=False, allow=False, reasons=["denied"])
        )

        @aport_verify("test.policy.v1", client=deny_client, strict=False)
        def task(x):
            return f"ran {x}"

        with _env_helper(APORT_AGENT_ID="nonstrict_agent"):
            result = task("arg")
            self.assertEqual(result, "ran arg")


class TestAgentIDResolution(unittest.TestCase):
    def test_static_agent_id(self):
        client = MockAPortClient(
            VerificationResult(verified=True, allow=True)
        )

        @aport_verify("test.policy.v1", agent_id="static_agent", client=client)
        def task():
            return "ok"

        task()

    def test_kwarg_agent_id(self):
        client = MockAPortClient(
            VerificationResult(verified=True, allow=True)
        )

        @aport_verify("test.policy.v1", client=client)
        def task(agent_id=None):
            return agent_id

        result = task(agent_id="kwarg_agent")
        self.assertEqual(result, "kwarg_agent")

    def test_env_var_agent_id(self):
        client = MockAPortClient(
            VerificationResult(verified=True, allow=True)
        )

        with _env_helper(APORT_AGENT_ID="env_agent"):
            @aport_verify("test.policy.v1", client=client)
            def task():
                return "ok"

            task()

    def test_no_agent_id_raises(self):
        client = MockAPortClient(
            VerificationResult(verified=True, allow=True)
        )

        with _env_helper():
            @aport_verify("test.policy.v1", client=client)
            def task():
                return "ok"

            with self.assertRaises(APortVerificationError) as ctx:
                task()
            self.assertIn("No agent_id found", str(ctx.exception))


class TestContextBuilder(unittest.TestCase):
    def test_context_builder_called(self):
        captured = {}
        client = MockAPortClient(
            VerificationResult(verified=True, allow=True)
        )

        def capture_context(*args, **kwargs):
            captured.update(kwargs)
            if args:
                captured["args"] = args
            return kwargs

        with _env_helper(APORT_AGENT_ID="ctx_test_agent"):
            @aport_verify("test.policy.v1", client=client, context_builder=capture_context)
            def task(amount, currency="USD"):
                return f"refund {amount}"

            task(50.0, currency="EUR")

            # context builder receives both args and kwargs
            self.assertEqual(len(captured.get("args", [])), 1)
            self.assertEqual(captured["args"][0], 50.0)
            self.assertEqual(captured.get("currency"), "EUR")


class TestAsyncVerification(unittest.TestCase):
    def test_async_verify_passes(self):
        client = MockAPortClient(
            VerificationResult(verified=True, allow=True)
        )

        with _env_helper(APORT_AGENT_ID="async_test_agent"):
            @aport_verify("test.policy.v1", client=client)
            async def task(x):
                return f"async {x}"

            import asyncio
            result = asyncio.run(task("value"))
            self.assertEqual(result, "async value")

    def test_async_verify_denies_strict_raises(self):
        deny_client = MockAPortClient(
            VerificationResult(verified=False, allow=False, reasons=["async denied"])
        )

        with _env_helper(APORT_AGENT_ID="deny_test_agent"):
            @aport_verify("test.policy.v1", client=deny_client, strict=True)
            async def task():
                return "should not run"

            import asyncio
            with self.assertRaises(APortVerificationError) as ctx:
                asyncio.run(task())
            self.assertIn("async denied", str(ctx.exception))


class TestAPortHTTPClient(unittest.TestCase):
    def test_no_api_key_pass_through(self):
        with _env_helper(APORT_API_KEY=None, APORT_BASE_URL=None):
            client = APortHTTPClient()
            result = client.verify("policy", "agent")
            self.assertTrue(result.allow)
            self.assertTrue(result.verified)


if __name__ == "__main__":
    unittest.main()