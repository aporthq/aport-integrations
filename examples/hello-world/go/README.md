# Hello World Go Example

A minimal Go script demonstrating a basic call to the APort `/verify` endpoint using only the standard library.

## Prerequisites

- Go 1.16 or later
- An APort API key

## Setup

1. Clone this repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/aport-integrations.git
   cd aport-integrations/examples/hello-world/go
   ```

2. Set your APort API key as an environment variable:
   ```bash
   export APORT_API_KEY=your_api_key_here
   ```

   Or on Windows (PowerShell):
   ```powershell
   $env:APORT_API_KEY="your_api_key_here"
   ```

## Run

```bash
go run main.go
```

Or build and run:
```bash
go build -o hello-world main.go
./hello-world
```

## Expected Output

```
=== APort Verification Result ===
Allow: true
Reasons:
  1. Agent verified
```

Or if verification fails:
```
=== APort Verification Result ===
Allow: false
Reasons:
  1. Agent not found
  2. Policy pack not satisfied
```

## API Details

This example makes a POST request to the APort verify endpoint:
- **URL**: `https://api.aport.io/v1/verify`
- **Method**: POST
- **Headers**:
  - `Content-Type: application/json`
  - `X-API-Key: your_api_key`
- **Body**:
  ```json
  {
    "agent_id": "demo_agent_123",
    "policy_pack": "hello.world.v1"
  }
  ```

## License

MIT
