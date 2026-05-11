"""Exceptions used by the APort Django integration."""


class APortError(Exception):
    """Base exception for APort verification failures."""


class VerificationError(APortError):
    """Raised when policy verification fails or cannot be completed."""
