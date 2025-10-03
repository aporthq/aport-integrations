"""Custom exceptions for LangGraph APort integration."""


class APortError(Exception):
    """Base exception for APort integration errors."""
    pass


class VerificationError(APortError):
    """Exception raised when agent verification fails."""
    
    def __init__(self, message: str, details: dict = None, agent_id: str = None):
        """Initialize verification error.
        
        Args:
            message: Error message
            details: Additional error details
            agent_id: Agent ID that failed verification
        """
        super().__init__(message)
        self.details = details or {}
        self.agent_id = agent_id


class CheckpointError(APortError):
    """Exception raised when checkpoint verification fails."""
    
    def __init__(self, message: str, checkpoint_id: str = None, state: dict = None):
        """Initialize checkpoint error.
        
        Args:
            message: Error message
            checkpoint_id: Checkpoint ID that failed
            state: State that failed verification
        """
        super().__init__(message)
        self.checkpoint_id = checkpoint_id
        self.state = state


class ConfigurationError(APortError):
    """Exception raised when configuration is invalid."""
    pass