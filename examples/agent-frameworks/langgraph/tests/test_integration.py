"""Integration tests for LangGraph APort integration."""

import pytest
import asyncio
import os
import sys
from unittest.mock import Mock, patch

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from checkpoint_guard import APortCheckpointGuard
from client import APortClient
from exceptions import VerificationError, CheckpointError


class TestRealWorldScenarios:
    """Test real-world integration scenarios."""
    
    @pytest.mark.asyncio
    async def test_customer_service_workflow(self):
        """Test a customer service workflow with different permission levels."""
        guard = APortCheckpointGuard(
            api_key="test_key",
            default_policy="customer_service.v1",
            use_mock=True
        )
        
        # Customer service workflow nodes
        @guard.require_verification(policy="customer.view.v1")
        async def view_customer_info(state, config=None):
            return {"customer_info": f"Customer: {state.get('customer_id')}", "viewed": True}
        
        @guard.require_verification(policy="customer.update.v1")
        async def update_customer_info(state, config=None):
            return {"customer_updated": True, "update_timestamp": "2025-10-03T10:00:00Z"}
        
        @guard.require_verification(policy="refund.process.v1")
        async def process_refund(state, config=None):
            amount = state.get("refund_amount", 0)
            return {"refund_processed": True, "refund_amount": amount}
        
        # Test cases for different agent permissions
        test_scenarios = [
            {
                "name": "Customer Service Rep - View Only",
                "agent_id": "agt_cs_rep_basic",
                "operations": ["view_customer_info"],
                "state": {"agent_id": "agt_cs_rep_basic", "customer_id": "cust_123"}
            },
            {
                "name": "Customer Service Manager - Full Access",
                "agent_id": "agt_cs_manager",
                "operations": ["view_customer_info", "update_customer_info", "process_refund"],
                "state": {
                    "agent_id": "agt_cs_manager",
                    "customer_id": "cust_123",
                    "refund_amount": 99.99
                }
            },
            {
                "name": "Unauthorized Agent",
                "agent_id": "agt_user_denied",
                "operations": ["view_customer_info"],
                "state": {"agent_id": "agt_user_denied", "customer_id": "cust_123"},
                "should_fail": True
            }
        ]
        
        for scenario in test_scenarios:
            print(f"\nTesting: {scenario['name']}")
            
            state = scenario["state"].copy()
            should_fail = scenario.get("should_fail", False)
            
            for operation in scenario["operations"]:
                try:
                    if operation == "view_customer_info":
                        result = await view_customer_info(state)
                    elif operation == "update_customer_info":
                        result = await update_customer_info(state)
                    elif operation == "process_refund":
                        result = await process_refund(state)
                    
                    state.update(result)
                    
                    if should_fail:
                        pytest.fail(f"Expected {operation} to fail for {scenario['agent_id']}")
                    
                    print(f"  ✓ {operation} succeeded")
                    
                except (CheckpointError, VerificationError):
                    if not should_fail:
                        pytest.fail(f"Unexpected failure for {operation} with {scenario['agent_id']}")
                    print(f"  ✗ {operation} failed as expected")
    
    @pytest.mark.asyncio
    async def test_data_processing_pipeline(self):
        """Test a data processing pipeline with progressive verification."""
        guard = APortCheckpointGuard(
            api_key="test_key",
            default_policy="data_pipeline.v1",
            use_mock=True
        )
        
        @guard.require_verification(policy="data.ingest.v1")
        async def ingest_data(state, config=None):
            return {
                "data_ingested": True,
                "records_count": state.get("input_records", 100),
                "stage": "ingested"
            }
        
        @guard.require_verification(policy="data.transform.v1")
        async def transform_data(state, config=None):
            return {
                "data_transformed": True,
                "transformation_applied": "normalize_fields",
                "stage": "transformed"
            }
        
        @guard.require_verification(policy="data.export.v1")
        async def export_data(state, config=None):
            return {
                "data_exported": True,
                "export_format": "json",
                "stage": "exported"
            }
        
        # Test full pipeline execution
        pipeline_state = {
            "agent_id": "agt_data_processor",
            "pipeline_id": "pipeline_123",
            "input_records": 1000,
            "stage": "pending"
        }
        
        # Execute pipeline stages
        result1 = await ingest_data(pipeline_state)
        pipeline_state.update(result1)
        assert pipeline_state["data_ingested"] is True
        
        result2 = await transform_data(pipeline_state)
        pipeline_state.update(result2)
        assert pipeline_state["data_transformed"] is True
        
        result3 = await export_data(pipeline_state)
        pipeline_state.update(result3)
        assert pipeline_state["data_exported"] is True
        assert pipeline_state["stage"] == "exported"
    
    @pytest.mark.asyncio
    async def test_multi_tenant_isolation(self):
        """Test multi-tenant workflow with proper isolation."""
        guard = APortCheckpointGuard(
            api_key="test_key",
            default_policy="multitenant.v1",
            use_mock=True
        )
        
        def tenant_aware_extractor(state):
            """Extract agent ID with tenant context."""
            tenant_id = state.get("tenant_id", "default")
            agent_id = state.get("agent_id", "unknown")
            return f"{agent_id}_tenant_{tenant_id}"
        
        @guard.require_verification(
            policy="tenant.data.access.v1",
            agent_id_extractor=tenant_aware_extractor
        )
        async def access_tenant_data(state, config=None):
            tenant_id = state.get("tenant_id")
            return {
                "data_accessed": True,
                "tenant_id": tenant_id,
                "access_scope": f"tenant_{tenant_id}_data"
            }
        
        # Test different tenants
        tenant_scenarios = [
            {
                "tenant_id": "tenant_a",
                "agent_id": "agt_user_123",
                "data_id": "data_a_001"
            },
            {
                "tenant_id": "tenant_b",
                "agent_id": "agt_user_456",
                "data_id": "data_b_002"
            }
        ]
        
        for scenario in tenant_scenarios:
            state = {
                "agent_id": scenario["agent_id"],
                "tenant_id": scenario["tenant_id"],
                "data_id": scenario["data_id"]
            }
            
            result = await access_tenant_data(state)
            
            assert result["data_accessed"] is True
            assert result["tenant_id"] == scenario["tenant_id"]
            assert scenario["tenant_id"] in result["access_scope"]
    
    @pytest.mark.asyncio
    async def test_emergency_override_scenario(self):
        """Test emergency override capabilities."""
        # Create two guards: one strict, one with emergency override
        strict_guard = APortCheckpointGuard(
            api_key="test_key",
            default_policy="emergency.strict.v1",
            strict_mode=True,
            use_mock=True
        )
        
        override_guard = APortCheckpointGuard(
            api_key="test_key",
            default_policy="emergency.override.v1",
            strict_mode=False,
            use_mock=True
        )
        
        @strict_guard.require_verification(policy="emergency.strict.v1")
        async def strict_emergency_action(state, config=None):
            return {"action": "strict_emergency_handled", "strict_mode": True}
        
        @override_guard.require_verification(policy="emergency.override.v1")
        async def override_emergency_action(state, config=None):
            if state.get("_aport_verification_error"):
                # Emergency override logic
                return {
                    "action": "emergency_override_activated",
                    "override_reason": "system_emergency",
                    "strict_mode": False
                }
            return {"action": "normal_emergency_handled", "strict_mode": False}
        
        # Test with denied agent
        emergency_state = {
            "agent_id": "agt_user_denied",
            "emergency_type": "system_outage",
            "severity": "critical"
        }
        
        # Strict mode should fail
        with pytest.raises(CheckpointError):
            await strict_emergency_action(emergency_state.copy())
        
        # Override mode should succeed with fallback
        result = await override_emergency_action(emergency_state.copy())
        assert "emergency_override_activated" in result["action"]
    
    @pytest.mark.asyncio
    async def test_audit_and_compliance_workflow(self):
        """Test audit and compliance verification workflow."""
        guard = APortCheckpointGuard(
            api_key="test_key",
            default_policy="audit.compliance.v1",
            use_mock=True
        )
        
        audit_trail = []
        
        def audit_extractor(state):
            """Extract context for audit purposes."""
            return {
                "operation": state.get("operation"),
                "user_id": state.get("user_id"),
                "resource_id": state.get("resource_id"),
                "timestamp": state.get("timestamp"),
                "compliance_level": state.get("compliance_level", "standard")
            }
        
        @guard.require_verification(policy="audit.log.v1")
        async def log_audit_event(state, config=None):
            event = {
                "operation": state.get("operation"),
                "agent_id": state.get("agent_id"),
                "timestamp": state.get("timestamp"),
                "verified": bool(state.get("_aport_verification"))
            }
            audit_trail.append(event)
            return {"audit_logged": True, "audit_id": f"audit_{len(audit_trail)}"}
        
        @guard.require_verification(policy="compliance.check.v1")
        async def compliance_check(state, config=None):
            compliance_level = state.get("compliance_level", "standard")
            return {
                "compliance_verified": True,
                "compliance_level": compliance_level,
                "compliance_status": "passed"
            }
        
        # Test compliance workflow
        compliance_state = {
            "agent_id": "agt_compliance_officer",
            "operation": "data_export",
            "user_id": "user_789",
            "resource_id": "sensitive_data_001",
            "timestamp": "2025-10-03T10:00:00Z",
            "compliance_level": "high"
        }
        
        # Execute compliance workflow
        audit_result = await log_audit_event(compliance_state)
        compliance_state.update(audit_result)
        
        compliance_result = await compliance_check(compliance_state)
        compliance_state.update(compliance_result)
        
        # Verify audit trail
        assert len(audit_trail) == 1
        assert audit_trail[0]["operation"] == "data_export"
        assert audit_trail[0]["verified"] is True
        
        # Verify compliance
        assert compliance_state["compliance_verified"] is True
        assert compliance_state["compliance_level"] == "high"


class TestPerformanceAndScaling:
    """Test performance and scaling scenarios."""
    
    @pytest.mark.asyncio
    async def test_concurrent_verifications(self):
        """Test concurrent verification requests."""
        guard = APortCheckpointGuard(
            api_key="test_key",
            default_policy="concurrent.test.v1",
            use_mock=True
        )
        
        @guard.require_verification()
        async def concurrent_operation(state, config=None):
            # Simulate some work
            await asyncio.sleep(0.1)
            return {"operation_id": state.get("operation_id"), "completed": True}
        
        # Create multiple concurrent operations
        operations = []
        for i in range(10):
            state = {"agent_id": f"agt_user_{i}", "operation_id": f"op_{i}"}
            operations.append(concurrent_operation(state))
        
        # Execute all operations concurrently
        results = await asyncio.gather(*operations, return_exceptions=True)
        
        # Verify all operations completed successfully
        successful_results = [r for r in results if isinstance(r, dict) and r.get("completed")]
        assert len(successful_results) == 10
    
    @pytest.mark.asyncio
    async def test_verification_caching_simulation(self):
        """Simulate verification result caching for performance."""
        # This would be implemented in a real caching layer
        verification_cache = {}
        
        guard = APortCheckpointGuard(
            api_key="test_key",
            default_policy="caching.test.v1",
            use_mock=True
        )
        
        @guard.require_verification()
        async def cached_operation(state, config=None):
            agent_id = state.get("agent_id")
            
            # Simulate cache check (in real implementation, this would be in the guard)
            cache_key = f"{agent_id}:caching.test.v1"
            if cache_key in verification_cache:
                print(f"Cache hit for {agent_id}")
            else:
                print(f"Cache miss for {agent_id}")
                verification_cache[cache_key] = True
            
            return {"cached_result": True, "agent_id": agent_id}
        
        # Test same agent multiple times (simulating cache hits)
        agent_state = {"agent_id": "agt_cached_user"}
        
        for i in range(3):
            result = await cached_operation(agent_state.copy())
            assert result["cached_result"] is True


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v"])