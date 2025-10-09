"""LangGraph APort Integration Package.

A production-ready integration that adds APort agent verification 
to LangGraph state machine checkpoints, enabling secure and 
policy-driven state transitions in AI agent workflows.
"""

from .checkpoint_guard import APortCheckpointGuard
from .client import APortClient
from .exceptions import APortError, VerificationError

__version__ = "1.0.0"
__author__ = "APort Integration Team"
__email__ = "support@aport.io"
__license__ = "MIT"

__all__ = [
    "APortCheckpointGuard", 
    "APortClient", 
    "APortError", 
    "VerificationError"
]