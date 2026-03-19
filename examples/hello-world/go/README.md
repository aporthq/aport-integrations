# Hello World - Go Example

A minimal Go script that demonstrates a basic call to the APort `/verify` endpoint.

## Prerequisites

- Go 1.19 or higher
- APort API key ([Get one here](https://aport.io/dashboard))

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/aporthq/aport-integrations.git
   cd aport-integrations/examples/hello-world/go
   ```

2. Set your APort API key as an environment variable:
   ```bash
   export APORT_API_KEY="your-api-key-here"
   ```
   
   On Windows (PowerShell):
   ```powershell
   $env:APORT_API_KEY="your-api-key-here"
   ```

   On Windows (CMD):
   ```cmd
   set APORT_API_KEY=your-api-key-here
   ```

## Run

```bash
go run main.go
```

## Expected Output

```
=== APort Verification Result ===
Allow: true
Reasons: None
```

Or if the request is denied:

```
=== APort Verification Result ===
Allow: false
Reasons:
  1. Reason for denial
```

## Code Explanation

This example uses only Go's standard library (`net/http`) to:

1. Create a JSON request body with actor, context, and project information
2. Send a POST request to the APort verify endpoint
3. Parse the JSON response
4. Print the `allow` status and any `reasons`

## Time & Space Complexity

- **Time Complexity**: O(n) where n is the size of the JSON response
- **Space Complexity**: O(n) for storing the response

## Learn More

- [APort Documentation](https://docs.aport.io)
- [APort Dashboard](https://aport.io/dashboard)
