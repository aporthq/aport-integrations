"""APort client adapter used by the Django integration template."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, Optional


@dataclass
class VerificationResult:
    """Normalized response returned by the APort client adapter."""

    verified: bool
    passport: Dict[str, Any] = field(default_factory=dict)
    policy: str = ""
    message: str = ""
    details: Dict[str, Any] = field(default_factory=dict)


class MockAPortClient:
    """Mock APort client for local development and tests.

    Replace this class with the official SDK client once
    ``aporthq-sdk-python`` is available in your project.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = "https://api.aport.io",
        **kwargs: Any,
    ) -> None:
        self.api_key = api_key
        self.base_url = base_url
        self.options = kwargs

    def verify(
        self,
        policy: str,
        agent_id: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> VerificationResult:
        """Return a successful mock verification result."""
        return VerificationResult(
            verified=True,
            passport={
                "agentId": agent_id,
                "capabilities": ["read", "write"],
                "limits": {"requests": 1000, "period": "1h"},
            },
            policy=policy,
            message="Mock verification successful",
            details={"context": context or {}},
        )
