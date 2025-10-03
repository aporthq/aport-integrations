#!/usr/bin/env python3
"""
LangGraph APort Integration Showcase

This script demonstrates the complete LangGraph + APort integration
with working verification of checkpoint verification, state transitions,
and error handling capabilities.
"""

import asyncio
import logging
import sys
import os
from datetime import datetime

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from checkpoint_guard import APortCheckpointGuard
from exceptions import VerificationError, CheckpointError


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def run_showcase():
    """Run the complete showcase demonstration."""
    print("LangGraph APort Integration Showcase")
    print("=" * 50)
    
    # Initialize the guard
    guard = APortCheckpointGuard(
        api_key="showcase_api_key",
        default_policy="showcase.workflow.v1",
        strict_mode=True,
        use_mock=True
    )
    
    print("\nAPort Guard initialized successfully")
    print(f"   Default policy: {guard.default_policy}")
    print(f"   Strict mode: {guard.strict_mode}")
    
    # Showcase 1: Basic verification
    await showcase_basic_verification(guard)
    
    # Showcase 2: State machine workflow
    await showcase_state_machine_workflow(guard)
    
    # Showcase 3: Error handling
    await showcase_error_handling(guard)
    
    # Showcase 4: Multi-policy workflow
    await showcase_multi_policy_workflow(guard)
    
    print("\nShowcase completed successfully!")
    print("\nNext steps:")
    print("1. Replace mock client with real APort SDK")
    print("2. Configure your actual policies in APort dashboard")
    print("3. Integrate with your LangGraph workflows")
    print("4. Deploy with proper monitoring and logging")


async def showcase_basic_verification(guard):
    """Demonstrate basic verification functionality."""
    print("\nShowcase 1: Basic Verification")
    print("-" * 30)
    
    # Create a simple protected function
    @guard.require_verification(policy="showcase.basic.v1")
    async def protected_operation(state, config=None):
        return {
            "operation": "basic_operation",
            "result": f"Processed data for {state.get('agent_id')}",
            "timestamp": datetime.now().isoformat()
        }
    
    # Test with authorized agent
    print("Testing with authorized agent...")
    state = {"agent_id": "agt_authorized_user", "data": "sample_data"}
    
    try:
        result = await protected_operation(state)
        print(f"   Success: {result['result']}")
        print(f"   Verification info: {state.get('_aport_verification', {}).get('verified', False)}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test with denied agent
    print("\nTesting with denied agent...")
    state = {"agent_id": "agt_user_denied", "data": "sensitive_data"}
    
    try:
        result = await protected_operation(state)
        print(f"   Unexpected success: {result}")
    except CheckpointError as e:
        print(f"   Expected failure: {e}")
    except Exception as e:
        print(f"   Unexpected error: {e}")


async def showcase_state_machine_workflow(guard):
    """Demonstrate a complete state machine workflow."""
    print("\nShowcase 2: State Machine Workflow")
    print("-" * 35)
    
    # Create workflow nodes
    @guard.require_verification(policy="demo.validate.v1")
    async def validate_input(state, config=None):
        print("   -> Validating input...")
        return {
            "status": "validated",
            "validation_timestamp": datetime.now().isoformat(),
            "next_stage": "process"
        }
    
    @guard.require_verification(policy="demo.process.v1")
    async def process_data(state, config=None):
        print("   -> Processing data...")
        await asyncio.sleep(0.2)  # Simulate processing
        return {
            "status": "processed",
            "processing_result": f"Processed {state.get('data_type', 'unknown')}",
            "next_stage": "finalize"
        }
    
    @guard.require_verification(policy="demo.finalize.v1")
    async def finalize_workflow(state, config=None):
        print("   -> Finalizing workflow...")
        return {
            "status": "completed",
            "final_result": "Workflow completed successfully",
            "completion_timestamp": datetime.now().isoformat()
        }
    
    # Execute workflow
    print("-> Executing workflow for authorized agent...")
    workflow_state = {
        "agent_id": "agt_workflow_user",
        "workflow_id": "wf_showcase_001",
        "data_type": "customer_data",
        "status": "pending"
    }
    
    try:
        # Stage 1: Validate
        result1 = await validate_input(workflow_state)
        workflow_state.update(result1)
        print(f"   Stage 1 complete: {workflow_state['status']}")
        
        # Stage 2: Process
        result2 = await process_data(workflow_state)
        workflow_state.update(result2)
        print(f"   Stage 2 complete: {workflow_state['status']}")
        
        # Stage 3: Finalize
        result3 = await finalize_workflow(workflow_state)
        workflow_state.update(result3)
        print(f"   Stage 3 complete: {workflow_state['status']}")
        
        print(f"Final result: {workflow_state['final_result']}")
        
    except Exception as e:
        print(f"   Workflow failed: {e}")


async def showcase_error_handling(guard):
    """Demonstrate error handling and recovery."""
    print("\nShowcase 3: Error Handling")
    print("-" * 27)
    
    # Create guard with graceful degradation
    graceful_guard = APortCheckpointGuard(
        api_key="demo_api_key",
        default_policy="demo.graceful.v1",
        strict_mode=False,  # Allow graceful degradation
        use_mock=True
    )
    
    @graceful_guard.require_verification(policy="demo.resilient.v1")
    async def resilient_operation(state, config=None):
        verification_error = state.get("_aport_verification_error")
        
        if verification_error:
            print("   Warning: Using fallback mode due to verification failure")
            return {
                "operation": "fallback_operation",
                "result": "Limited functionality - verification failed",
                "fallback_used": True
            }
        else:
            print("   Success: Using full functionality")
            return {
                "operation": "full_operation",
                "result": "Full functionality - verification passed",
                "fallback_used": False
            }
    
    # Test graceful degradation
    print("Testing graceful degradation with denied agent...")
    state = {"agent_id": "agt_user_denied", "operation": "sensitive_task"}
    
    try:
        result = await resilient_operation(state)
        print(f"   Result: {result['result']}")
        print(f"   Fallback used: {result['fallback_used']}")
    except Exception as e:
        print(f"   Unexpected error: {e}")
    
    # Test normal operation
    print("\nTesting normal operation with authorized agent...")
    state = {"agent_id": "agt_authorized_user", "operation": "normal_task"}
    
    try:
        result = await resilient_operation(state)
        print(f"   Result: {result['result']}")
        print(f"   Fallback used: {result['fallback_used']}")
    except Exception as e:
        print(f"   Unexpected error: {e}")


async def showcase_multi_policy_workflow(guard):
    """Demonstrate workflow with multiple policies."""
    print("\nShowcase 4: Multi-Policy Workflow")
    print("-" * 35)
    
    # Different security levels
    @guard.require_verification(policy="demo.public.v1")
    async def public_operation(state, config=None):
        return {"security_level": "public", "result": "Public data accessed"}
    
    @guard.require_verification(policy="demo.internal.v1")
    async def internal_operation(state, config=None):
        return {"security_level": "internal", "result": "Internal data accessed"}
    
    @guard.require_verification(policy="demo.confidential.v1")
    async def confidential_operation(state, config=None):
        return {"security_level": "confidential", "result": "Confidential data accessed"}
    
    # Test different security levels
    test_scenarios = [
        {
            "name": "Public Access",
            "agent_id": "agt_public_user",
            "operation": public_operation,
            "expected_success": True
        },
        {
            "name": "Internal Access",
            "agent_id": "agt_internal_user",
            "operation": internal_operation,
            "expected_success": True
        },
        {
            "name": "Confidential Access (Authorized)",
            "agent_id": "agt_admin_user",
            "operation": confidential_operation,
            "expected_success": True
        },
        {
            "name": "Confidential Access (Denied)",
            "agent_id": "agt_user_denied",
            "operation": confidential_operation,
            "expected_success": False
        }
    ]
    
    for scenario in test_scenarios:
        print(f"\nTesting: {scenario['name']}")
        state = {"agent_id": scenario["agent_id"]}
        
        try:
            result = await scenario["operation"](state)
            if scenario["expected_success"]:
                print(f"   Success: {result['result']}")
            else:
                print(f"   Warning: Unexpected success: {result['result']}")
                
        except CheckpointError:
            if not scenario["expected_success"]:
                print("   Expected failure: Access denied")
            else:
                print("   Error: Unexpected failure")
        except Exception as e:
            print(f"   Error: {e}")


async def showcase_verification_context():
    """Demonstrate rich verification context."""
    print("\nShowcase 5: Rich Verification Context")
    print("-" * 38)
    
    guard = APortCheckpointGuard(
        api_key="demo_api_key",
        default_policy="demo.context.v1",
        use_mock=True
    )
    
    @guard.require_verification(policy="demo.context_rich.v1")
    async def context_aware_operation(state, config=None):
        # The guard automatically includes context about the operation
        verification_info = state.get("_aport_verification", {})
        
        return {
            "operation": "context_aware_processing",
            "agent_verified": verification_info.get("verified", False),
            "policy_used": verification_info.get("policy", "unknown"),
            "context_provided": bool(verification_info.get("details"))
        }
    
    # Test with rich context
    rich_state = {
        "agent_id": "agt_context_user",
        "operation_type": "data_analysis",
        "data_classification": "sensitive",
        "user_role": "analyst",
        "department": "research",
        "request_id": "req_12345"
    }
    
    try:
        result = await context_aware_operation(rich_state)
        print(f"   Operation completed with context")
        print(f"   Agent verified: {result['agent_verified']}")
        print(f"   Policy used: {result['policy_used']}")
        print(f"   Context provided: {result['context_provided']}")
        
    except Exception as e:
        print(f"   Error: {e}")


if __name__ == "__main__":
    try:
        asyncio.run(run_showcase())
    except KeyboardInterrupt:
        print("\nShowcase interrupted by user")
    except Exception as e:
        print(f"\nShowcase failed with error: {e}")
        sys.exit(1)