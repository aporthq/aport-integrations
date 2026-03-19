"""
Tests for APort FastAPI Advanced Integration
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient

from aport_fastapi import (
    APortConfig,
    APortClient,
    VerificationResult,
    VerificationCache,
    RateLimiter,
    aport_middleware,
    verify_action,
    create_app
)


class TestVerificationCache:
    """Test verification cache"""
    
    def test_set_and_get(self):
        cache = VerificationCache(ttl=60)
        cache.set("key1", {"allow": True, "reasons": []})
        
        result = cache.get("key1")
        assert result is not None
        assert result["allow"] is True
    
    def test_cache_expired(self):
        cache = VerificationCache(ttl=1)
        cache.set("key1", {"allow": True, "reasons": []})
        
        import time
        time.sleep(1.1)
        
        result = cache.get("key1")
        assert result is None
    
    def test_clear(self):
        cache = VerificationCache()
        cache.set("key1", {"allow": True, "reasons": []})
        cache.clear()
        
        assert cache.get("key1") is None


class TestRateLimiter:
    """Test rate limiter"""
    
    def test_rate_limit_allowed(self):
        limiter = RateLimiter(max_requests=5, window=60)
        
        # First 5 requests should be allowed
        for _ in range(5):
            assert limiter.is_allowed("test-key") is True
    
    def test_rate_limit_blocked(self):
        limiter = RateLimiter(max_requests=2, window=60)
        
        limiter.is_allowed("test-key")
        limiter.is_allowed("test-key")
        
        # Third request should be blocked
        assert limiter.is_allowed("test-key") is False


class TestAPortClient:
    """Test APort client"""
    
    @pytest.mark.asyncio
    async def test_verify_disabled(self):
        config = APortConfig(enabled=False)
        client = APortClient(config)
        
        result = await client.verify("test_action", "user-1", "test")
        
        assert result.allow is True
        assert "Disabled" in result.reasons[0]
    
    @pytest.mark.asyncio
    async def test_verify_no_api_key(self):
        config = APortConfig(api_key="")
        client = APortClient(config)
        
        result = await client.verify("test_action", "user-1", "test")
        
        assert result.allow is True
        assert "No API key" in result.reasons[0]
    
    @pytest.mark.asyncio
    async def test_verify_cache(self):
        config = APortConfig(api_key="test-key")
        client = APortClient(config)
        
        # First call - not cached
        result1 = await client.verify("test_action", "user-1", "test")
        
        # Second call - should be cached
        result2 = await client.verify("test_action", "user-1", "test")
        
        # Results should be the same
        assert result1.allow == result2.allow


class TestAPortMiddleware:
    """Test FastAPI middleware"""
    
    def test_exempt_path(self):
        app = FastAPI()
        
        @app.get("/health")
        async def health():
            return {"status": "ok"}
        
        client = TestClient(app)
        response = client.get("/health")
        
        assert response.status_code == 200


class TestVerifyAction:
    """Test verify_action dependency"""
    
    @pytest.mark.asyncio
    async def test_verify_action_allowed(self):
        with patch("aport_fastapi.client") as mock_client:
            mock_client.verify = AsyncMock(
                return_value=VerificationResult(allow=True, reasons=[])
            )
            
            result = await verify_action("test_action", "user-1", "test-user")
            
            assert result.allow is True


class TestCreateApp:
    """Test app creation"""
    
    def test_create_app(self):
        app = create_app()
        
        assert app.title == "APort FastAPI Example"
        assert "/health" in [r.path for r in app.routes]
        assert "/protected" in [r.path for r in app.routes]
        assert "/api/verify" in [r.path for r in app.routes]
    
    def test_health_endpoint(self):
        app = create_app()
        client = TestClient(app)
        
        response = client.get("/health")
        
        assert response.status_code == 200
        assert response.json()["status"] == "ok"
    
    def test_root_endpoint(self):
        app = create_app()
        client = TestClient(app)
        
        response = client.get("/")
        
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
