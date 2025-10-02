"""Custom exceptions for APort middleware."""


class APortError(Exception):
    """Base exception for APort middleware errors."""
    pass


class VerificationError(APortError):
    """Exception raised when agent verification fails."""
    
    def __init__(self, message: str, details: dict = None):
        """Initialize verification error.
        
        Args:
            message: Error message
            details: Additional error details
        """
        super().__init__(message)
        self.details = details or {}
