"""
APortToolGuard — LangChain Tool wrapper with APort agent verification.

Wraps any LangChain BaseTool so that every invocation is gated by an
APort /verify call. If the agent's passport does not satisfy the
required policy, the tool execution is denied with a clear error.

Usage:
    from aport_tool_guard import APortToolGuard

    @tool
    def refund(amount: float) -> str:
        return f"Refunded ${amount}"

    guarded_refund = APortToolGuard(
        tool=refund,
        policy="finance.payment.refund.v1",
        agent_id="agt_abc123"
    )

    result = guarded_refund.run(amount=100.0)  # calls APort verify first
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, Optional, TypeVar, Union

from langchain_core.tools import BaseTool
from langchain_core.callbacks import CallbackManagerForToolRun, AsyncCallbackManagerForToolRun
from langchain_core.runnables import RunnableConfig


# ---------------------------------------------------------------------------
# Mock APort Client (replace with real SDK when available)
# ---------------------------------------------------------------------------

class MockAPortClient:
    """Mock APort Client for development and testing.

    In production, replace with: from aporthq_sdk import APortClient
    """

    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        self.api_key = api_key or os.getenv("APORT_API_KEY")
        self.base_url = base_url or os.getenv("APORT_BASE_URL", "https://api.aport.io")

    def verify(self, policy: str, agent_id: str, context: Optional[Dict[str, Any]] = None) -> "VerificationResult":
        """Verify an agent against a policy pack.

        Returns a VerificationResult.  In the mock, all verifications
        succeed for non-empty agent_ids; the real client calls
        POST /verify on the APort API.
        """
        if not agent_id:
            return VerificationResult(
                verified=False,
                passport={},
                policy=policy,
                message="Agent ID is required",
                details={"error_code": "MISSING_AGENT_ID"},
            )
        return VerificationResult(
            verified=True,
            passport={
                "agentId": agent_id,
                "capabilities": ["execute"],
                "limits": {"requests": 1000, "period": "1h"},
            },
            policy=policy,
            message="Verification successful",
        )


@dataclass
class VerificationResult:
    """Result of an APort verification call."""
    verified: bool
    passport: Dict[str, Any]
    policy: str
    message: str
    details: Optional[Dict[str, Any]] = None


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------

class ToolGuardError(Exception):
    """Base exception for tool guard errors."""
    pass


class ToolVerificationError(ToolGuardError):
    """Raised when tool execution is blocked by APort verification."""
    def __init__(self, tool_name: str, policy: str, message: str):
        self.tool_name = tool_name
        self.policy = policy
        self.message = message
        super().__init__(f"[{tool_name}] blocked by policy '{policy}': {message}")


# ---------------------------------------------------------------------------
# Tool Guard
# ---------------------------------------------------------------------------

T = TypeVar("T", bound=BaseTool)


class APortToolGuard(BaseTool):
    """Wrapper that adds APort verification to any LangChain tool.

    Every call to run() / arun() / _run() / _arun() is intercepted and
    the agent is verified against the specified policy *before* the
    wrapped tool's logic executes.
    """

    wrapped_tool: BaseTool
    """The LangChain tool being guarded."""

    policy: str
    """APort policy pack identifier (e.g. 'finance.payment.refund.v1')."""

    agent_id: Optional[str] = None
    """ID of the agent whose passport is being checked.

    If None, the agent_id must be provided per-call via the RunnableConfig
    metadata ('aport_agent_id') or via the APORT_AGENT_ID env variable.
    """

    fail_open: bool = False
    """If True, allow the tool to execute when the APort API is unreachable.
    If False (default), raise ToolVerificationError on API errors."""

    # --- Internal helpers ---------------------------------------------------

    _client: Optional[MockAPortClient] = None

    def __init__(self, **data: Any):
        # Fill in required BaseTool fields from the wrapped tool if not provided
        wrapped = data.get("wrapped_tool")
        if wrapped is not None:
            if "name" not in data:
                data["name"] = wrapped.name
            if "description" not in data:
                data["description"] = wrapped.description
            if "args_schema" not in data and hasattr(wrapped, "args_schema"):
                data["args_schema"] = wrapped.args_schema
            if "return_direct" not in data and hasattr(wrapped, "return_direct"):
                data["return_direct"] = wrapped.return_direct
        super().__init__(**data)

    def _get_client(self) -> MockAPortClient:
        if self._client is None:
            self._client = MockAPortClient()
        return self._client

    def _resolve_agent_id(self, run_manager: Optional[CallbackManagerForToolRun] = None,
                           config: Optional[RunnableConfig] = None) -> str:
        """Resolve agent_id with priority: config > instance > env > fallback."""
        # 1. From RunnableConfig.metadata (highest priority — per-call override)
        if config and isinstance(config, dict):
            metadata = config.get("metadata", {})
            if isinstance(metadata, dict):
                aid = metadata.get("aport_agent_id")
                if aid:
                    return aid

        # 2. From instance attribute
        if self.agent_id:
            return self.agent_id

        # 3. From env var
        env_id = os.getenv("APORT_AGENT_ID")
        if env_id:
            return env_id

        return ""  # empty → mock client will reject

    # --- Execution (blocking) ----------------------------------------------

    def _run(self, *args: Any, run_manager: Optional[CallbackManagerForToolRun] = None,
             config: Optional[RunnableConfig] = None,
             **kwargs: Any) -> Any:
        """Execute the guarded tool synchronously after verification."""
        agent_id = self._resolve_agent_id(run_manager=run_manager, config=config)
        self._verify(agent_id)

        # Delegate to the wrapped tool's _run (input is already parsed by the
        # outer run() which called our _run with positional args)
        if hasattr(self.wrapped_tool, "_run"):
            return self.wrapped_tool._run(
                *args, run_manager=run_manager, config=config, **kwargs
            )
        # Fallback for tool types that don't have _run
        return self.wrapped_tool.invoke(dict(zip(
            self.wrapped_tool.args_schema.model_fields.keys(), args
        )) if self.wrapped_tool.args_schema and args else args[0] if args else None)

    async def _arun(self, *args: Any,
                    run_manager: Optional[AsyncCallbackManagerForToolRun] = None,
                    config: Optional[RunnableConfig] = None,
                    **kwargs: Any) -> Any:
        """Execute the guarded tool asynchronously after verification."""
        agent_id = self._resolve_agent_id(config=config)
        self._verify(agent_id)

        if hasattr(self.wrapped_tool, "_arun"):
            return await self.wrapped_tool._arun(*args, run_manager=run_manager, **kwargs)
        # Fallback for synchronous-only tools
        return self.wrapped_tool._run(*args, run_manager=run_manager, **kwargs)

    def _verify(self, agent_id: str) -> None:
        """Call APort /verify and raise on failure."""
        try:
            client = self._get_client()
            result = client.verify(
                policy=self.policy,
                agent_id=agent_id,
                context={"tool_name": self.wrapped_tool.name},
            )
            if not result.verified:
                raise ToolVerificationError(
                    tool_name=self.wrapped_tool.name,
                    policy=self.policy,
                    message=result.message,
                )
        except ToolVerificationError:
            raise
        except Exception as exc:
            if not self.fail_open:
                raise ToolVerificationError(
                    tool_name=self.wrapped_tool.name,
                    policy=self.policy,
                    message=f"APort API unreachable: {exc}",
                ) from exc


# ---------------------------------------------------------------------------
# Convenience function (matches pattern of require_policy in the middleware)
# ---------------------------------------------------------------------------

def guard_tool(
    tool: BaseTool,
    policy: str,
    agent_id: Optional[str] = None,
    fail_open: bool = False,
) -> APortToolGuard:
    """Wrap a LangChain tool with APort verification.

    Args:
        tool: LangChain BaseTool instance (Tool, StructuredTool, @tool, etc.)
        policy: APort policy pack identifier
        agent_id: Agent ID (optional; can come from env/config)
        fail_open: Allow execution if APort API is unreachable?

    Returns:
        APortToolGuard wrapping the original tool.
    """
    return APortToolGuard(
        wrapped_tool=tool,
        policy=policy,
        agent_id=agent_id,
        fail_open=fail_open,
    )
