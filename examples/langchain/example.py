from aport_tool_guard import APortToolGuard


def mock_verify(payload):
    if payload.get("actor_id") == "agent:trusted":
        return {"allowed": True}
    return {"allowed": False, "reason": "not trusted"}


def weather_tool(city: str):
    return f"weather:{city}"


guard = APortToolGuard(
    mock_verify,
    actor_id_getter=lambda *a, **k: k.get("actor_id", "unknown"),
    resource_getter=lambda *a, **k: "langchain:tool:weather",
)

safe_weather_tool = guard.wrap(weather_tool)

if __name__ == "__main__":
    print(safe_weather_tool(city="beijing", actor_id="agent:trusted"))
