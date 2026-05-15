---
title: "Protect Your AI Agent in 5 Minutes: A Beginner's Guide to APort"
published: false
description: "Learn how to add safety guardrails to your AI agents with APort - an open-source authorization infrastructure. No experience needed!"
tags: [ai, security, opensource, tutorial]
---

# Protect Your AI Agent in 5 Minutes

AI agents are powerful, but they can also be dangerous. Without proper guardrails, an AI agent might delete files, make unauthorized API calls, or access sensitive data. Enter **APort** - an open-source authorization infrastructure that keeps your agents in check.

## What is APort?

APort is like a security guard for your AI agents. Before your agent executes any action, APort checks if that action is allowed. If it is, the agent proceeds. If not, the action is blocked.

The core concepts are simple:

- **Passport**: Your agent's identity card - defines what it is and what limits it has
- **Policy**: Rules that specify what actions are allowed
- **Verify**: The checkpoint where APort checks an action against policy

## Quick Start

Let me show you how to add APort to a Python agent in under 5 minutes.

### Step 1: Install APort

```bash
pip install aport-agent-guardrails
```

Or for Node.js:

```bash
npm install @aporthq/aport-agent-guardrails
```

### Step 2: Add APort middleware

For a FastAPI application, it's just a few lines:

```python
from fastapi import FastAPI
from aport_middleware import APortMiddleware

app = FastAPI()
app.add_middleware(APortMiddleware)
```

### Step 3: Define your first policy

Create a simple policy that prevents your agent from running dangerous commands:

```python
policy = {
    "name": "safe-commands",
    "rules": [
        {"action": "exec.run", "allow": True, "if": "command not in ['rm -rf', 'drop table', 'shutdown']"},
        {"action": "file.write", "allow": True, "if": "path.startswith('/tmp/')"},
        {"action": "network.request", "allow": False, "unless": "domain in WHITELIST"}
    ]
}
```

### Step 4: Verify actions

```python
result = await aport.verify(
    passport_id="passport_abc123",
    action="exec.run",
    resource={"command": "ls -la"}
)

if result["allow"]:
    # Safe to execute!
    print(f"Action allowed: {result}")
else:
    print(f"Blocked: {result['reasons']}")
```

## Why This Matters

As AI agents become more autonomous, the risk of unintended actions grows. APort gives you:

1. **Accountability**: Every action is logged and verified
2. **Safety**: Dangerous actions are blocked automatically
3. **Auditability**: Full trail of what your agent tried to do
4. **Flexibility**: Policies can be updated without changing code

## Next Steps

- Try the [Go example](https://github.com/aporthq/aport-integrations/tree/main/examples/hello-world/go)
- Check out [APort docs](https://docs.aport.io)
- Join the community on [GitHub](https://github.com/aporthq/aport-integrations)

---

*APort is open-source (Apache 2.0) and ready for production use. Start protecting your agents today!*
