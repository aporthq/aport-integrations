# Hello, APort! (Go Example)

A minimal Go script demonstrating how to call the APort `/verify` endpoint.

## Prerequisites

- [Go](https://go.dev/dl/) 1.21 or later
- An APort API key

## Setup

1. **Get an APort API key** by signing up at [aport.io](https://aport.io)

2. **Set your API key as an environment variable:**

```bash
export APORT_API_KEY=your_api_key_here
```

3. **(Optional) Set a custom API URL:**

```bash
export APORT_API_URL=https://api.aport.io/v1/verify
```

## Running

```bash
go run main.go
```

## Expected Output

On success, you will see output similar to:

```
=== APort Verification Result ===
Allowed: true
```

If the action is denied, reasons will be listed:

```
=== APort Verification Result ===
Allowed: false
Reasons denied:
  - Action "code.deploy" is not authorized for this agent
```

## How It Works

1. The script reads your API key from the `APORT_API_KEY` environment variable
2. Constructs a verification request with a sample passport ID, agent ID, action, and resource
3. Sends a POST request to the APort `/verify` endpoint
4. Parses the JSON response and displays whether the action is allowed
