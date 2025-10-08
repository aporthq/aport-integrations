"""Tests for APort FastAPI middleware."""

import pytest
from unittest.mock import AsyncMock, patch
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient
from aport_middleware import APortMiddleware, require_policy


@pytest.fixture
def app():
    """Create test FastAPI app."""
    app = FastAPI()
    
    # Initialize middleware
    middleware = APortMiddleware(api_key="test-key")
    
    @app.get("/public")
    async def public():
        return {"message": "public"}
    
    @app.post("/refund")
    async def refund(
        request: Request,
        aport_data: dict = middleware.require_policy("finance.payment.refund.v1")
    ):
        return {"success": True, "agent_id": aport_data["agent_id"]}
    
    return app


@pytest.fixture
def client(app):
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def mock_verify():
    """Mock APort client verify method."""
    with patch('aport_middleware.middleware.APortClient') as mock_client:
        mock_instance = AsyncMock()
        mock_client.return_value = mock_instance
        yield mock_instance.verify


class TestAPortMiddleware:
    """Test APort middleware functionality."""
    
    def test_public_endpoint(self, client):
        """Test that public endpoints work without verification."""
        response = client.get("/public")
        assert response.status_code == 200
        assert response.json()["message"] == "public"
    
    @pytest.mark.asyncio
    async def test_successful_verification(self, client, mock_verify):
        """Test successful agent verification."""
        mock_verify.return_value = {
            "verified": True,
            "passport": {
                "capabilities": ["refund"],
                "limits": {"refund_amount_max_per_tx": 1000}
            }
        }
        
        response = client.post(
            "/refund",
            headers={"X-Agent-ID": "agt_test123"},
            json={"amount": 100}
        )
        
        assert response.status_code == 200
        assert response.json()["success"] is True
        assert response.json()["agent_id"] == "agt_test123"
        mock_verify.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_failed_verification(self, client, mock_verify):
        """Test failed agent verification."""
        mock_verify.return_value = {
            "verified": False,
            "message": "Agent not authorized"
        }
        
        response = client.post(
            "/refund",
            headers={"X-Agent-ID": "agt_unauthorized"},
            json={"amount": 100}
        )
        
        assert response.status_code == 403
        assert response.json()["error"] == "Verification failed"
        assert response.json()["message"] == "Agent not authorized"
    
    def test_missing_agent_id(self, client):
        """Test request without agent ID."""
        response = client.post("/refund", json={"amount": 100})
        
        assert response.status_code == 400
        assert response.json()["error"] == "Agent ID required"
    
    @pytest.mark.asyncio
    async def test_verification_error(self, client, mock_verify):
        """Test verification API error."""
        mock_verify.side_effect = Exception("API Error")
        
        response = client.post(
            "/refund",
            headers={"X-Agent-ID": "agt_test123"},
            json={"amount": 100}
        )
        
        assert response.status_code == 500
        assert response.json()["error"] == "Verification error"
    
    def test_agent_id_extraction_headers(self, client, mock_verify):
        """Test agent ID extraction from headers."""
        mock_verify.return_value = {"verified": True, "passport": {}}
        
        response = client.post(
            "/refund",
            headers={"X-Agent-ID": "agt_header123"},
            json={"amount": 100}
        )
        
        assert response.status_code == 200
        mock_verify.assert_called_once()
    
    def test_agent_id_extraction_query(self, client, mock_verify):
        """Test agent ID extraction from query parameters."""
        mock_verify.return_value = {"verified": True, "passport": {}}
        
        response = client.post(
            "/refund?agent_id=agt_query123",
            json={"amount": 100}
        )
        
        assert response.status_code == 200
        mock_verify.assert_called_once()
    
    def test_agent_id_extraction_body(self, client, mock_verify):
        """Test agent ID extraction from request body."""
        mock_verify.return_value = {"verified": True, "passport": {}}
        
        response = client.post(
            "/refund",
            json={"amount": 100, "agent_id": "agt_body123"}
        )
        
        assert response.status_code == 200
        mock_verify.assert_called_once()


class TestConvenienceFunction:
    """Test the convenience function."""
    
    def test_require_policy_function(self):
        """Test that require_policy function works."""
        dependency = require_policy("test.policy")
        assert callable(dependency)
