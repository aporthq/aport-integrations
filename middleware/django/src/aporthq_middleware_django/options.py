"""Configuration options for APort Django middleware."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class AgentPassportMiddlewareOptions:
    """Configuration options for the Agent Passport Django middleware."""

    base_url: str = field(default_factory=lambda: os.getenv(
        "AGENT_PASSPORT_BASE_URL", "https://api.aport.io"
    ))
    api_key: Optional[str] = field(default_factory=lambda: os.getenv(
        "AGENT_PASSPORT_API_KEY"
    ))
    timeout_ms: int = 5000
    fail_closed: bool = True
    skip_paths: List[str] = field(default_factory=lambda: ["/health", "/metrics", "/status"])
    policy_id: Optional[str] = None
    passport_from_body: bool = True
    policy_from_body: bool = True


@dataclass
class PolicyOptions:
    """Options for per-route policy checks."""

    policy_id: str
    agent_id: Optional[str] = None
    context: Optional[dict] = field(default_factory=dict)
