"""Custom exceptions for APort Django middleware."""


class APortMiddlewareError(Exception):
    """Base exception for APort middleware."""

    def __init__(self, message: str, error_code: str = "middleware_error"):
        self.error_code = error_code
        self.message = message
        super().__init__(message)


class AgentIdMissingError(APortMiddlewareError):
    """Raised when agent ID cannot be determined."""

    def __init__(self, message: str = "Agent ID is required."):
        super().__init__(message, error_code="missing_agent_id")


class PolicyViolationError(APortMiddlewareError):
    """Raised when a policy check fails."""

    def __init__(
        self,
        message: str = "Policy violation",
        agent_id: str | None = None,
        policy_id: str | None = None,
    ):
        self.agent_id = agent_id
        self.policy_id = policy_id
        super().__init__(message, error_code="policy_violation")


class FieldValidationError(APortMiddlewareError):
    """Raised when field validation fails."""

    def __init__(self, message: str = "Field validation failed"):
        super().__init__(message, error_code="field_validation_failed")
