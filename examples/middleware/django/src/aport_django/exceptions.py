class APortError(Exception):
    """Base exception for the Django APort integration."""


class APortConfigurationError(APortError):
    """Raised when the APort middleware is missing required configuration."""


class APortVerificationError(APortError):
    """Raised when a policy verification call cannot complete."""
