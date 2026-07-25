from typing import Any, Callable, Optional
import asyncio

from aporthq_sdk import APortClient
from langchain.tools import Tool


class APortToolGuard:
    """
    Wraps a LangChain Tool to perform APort verification before execution.

    Attributes:
        tool (Tool): The LangChain Tool to wrap.
        policy_pack (str): The policy pack identifier to verify against.
        agent_id (str): The agent ID to verify.
        aport_client (APortClient): The APort client instance.
    """

    def __init__(
        self,
        tool: Tool,
        policy_pack: str,
        agent_id: str,
        aport_client: Optional[APortClient] = None,
    ):
        self.tool = tool
        self.policy_pack = policy_pack
        self.agent_id = agent_id
        self.aport_client = aport_client or APortClient()

    async def _verify_agent(self) -> bool:
        """
        Verify the agent against the policy pack using APort.

        Returns:
            bool: True if verification is successful, False otherwise.
        """
        result = await self.aport_client.verify(self.policy_pack, self.agent_id)
        return getattr(result, "verified", False) or result.get("verified", False)

    async def _call_tool_async(self, *args: Any, **kwargs: Any) -> Any:
        """
        Call the wrapped tool asynchronously.

        Returns:
            Any: The result of the tool call.
        """
        if asyncio.iscoroutinefunction(self.tool.func):
            return await self.tool.func(*args, **kwargs)
        else:
            # Run sync function in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(None, lambda: self.tool.func(*args, **kwargs))

    def __call__(self, *args: Any, **kwargs: Any) -> Any:
        """
        Call the tool guard, verifying the agent before executing the tool.

        Raises:
            Exception: If agent verification fails.

        Returns:
            Any: The result of the tool call.
        """
        # Run async verification and tool call in event loop
        async def run():
            verified = await self._verify_agent()
            if not verified:
                raise Exception("Agent verification failed")
            return await self._call_tool_async(*args, **kwargs)

        return asyncio.run(run())
