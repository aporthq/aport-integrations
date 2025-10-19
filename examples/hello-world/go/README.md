# APort Go Hello World

A minimal, single-file Go script that demonstrates fetching an agent's public passport from the APort `/verify` endpoint. This example helps Go developers get started with APort in seconds using only the Go standard library.

## Quick Start

### Prerequisites

- Go 1.16 or later
- Internet connection (to reach APort API)

### Project Structure

```
examples/hello-world/go/
├── main.go          # Main Go script
├── go.mod           # Go module definition
├── env.example      # Environment configuration template
└── README.md        # This documentation
```

### Running the Script

```bash
# Clone the repository (if you haven't already)
git clone https://github.com/aporthq/aport-integrations.git
cd aport-integrations/examples/hello-world/go

# Run with default settings (no API key required!)
go run main.go

# Or build and run
go build -o aport-hello main.go
./aport-hello
```

### Expected Output

```
APort Go Hello World Example
==============================

Fetching agent passport for: ap_128094d3
From: https://aport.io

Agent Passport:
===============
Agent ID:    ap_128094d3
Name:        HappyRefundBot Pro
Role:        Snr. Refund Specialist
Status:      active

Description:
  AI-powered refund processing agent with advanced fraud detection

Capabilities:
  - payments.refund (max_amount: 10000, currency: USD)
  - inventory.adjust
  - messaging.send (max_recipients: 10)

Limits:
  Max actions/min: 60
  Max export rows: 1000
  Allow PII:       false

Success! Agent passport retrieved.
```

## Configuration

The script can be configured using environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `APORT_BASE_URL` | APort API base URL | `https://aport.io` |
| `APORT_AGENT_ID` | Agent ID to view | `ap_128094d3` (sample refund bot) |

### Custom Configuration Examples

```bash
# Test with a different agent
APORT_AGENT_ID=agt_tmpl_mg8jr8l1_geckvz go run main.go

# Use a different APort instance
APORT_BASE_URL=https://api.aport.io go run main.go
```

## Sample Agents

The script includes several sample agents for testing:

### Sample Agents
- **Refund Bot**: `ap_128094d3` - For payment refund operations
- **Data Exporter**: `agt_tmpl_mg8jr8l1_geckvz` - For data export operations  
- **PR Merger**: `agt_tmpl_mg8jtzzk_rl0diw` - For repository operations

## How It Works

This example demonstrates the simplest possible APort integration:

1. **Simple GET Request**: Makes a GET request to `/api/verify/{agent_id}`
2. **No Authentication**: No API key required (public endpoint)
3. **No Request Body**: GET request with no body needed
4. **Agent Passport Response**: Returns the agent's public passport/profile

```bash
# Simple GET request
curl https://aport.io/api/verify/ap_128094d3
```

**Response**: Agent profile with capabilities, limits, verification status

## What This Does

This example demonstrates the simplest possible APort integration:

- Makes a GET request to `/api/verify/{agent_id}`
- No authentication required (public endpoint)
- No request body needed
- Returns the agent's public passport/profile

This is different from policy verification which requires:
- API key authentication
- POST request with context
- Policy evaluation logic

## Code Structure

The script is organized into several key components:

- **Data Structures**: Go structs that mirror the APort agent passport response format
- **HTTP Client**: Uses `net/http` standard library for API calls
- **JSON Handling**: Uses `encoding/json` for response parsing
- **Error Handling**: Comprehensive error checking with descriptive messages
- **Configuration**: Environment variable support with sensible defaults

## Customization

### Different Agent IDs

Try different sample agents:

```bash
# Refund specialist
APORT_AGENT_ID=ap_128094d3 go run main.go

# Data export agent  
APORT_AGENT_ID=agt_tmpl_mg8jr8l1_geckvz go run main.go

# PR merger agent
APORT_AGENT_ID=agt_tmpl_mg8jtzzk_rl0diw go run main.go
```

### Custom Headers

Add authentication or other headers by modifying the `getAgentPassport` function:

```go
req, err := http.NewRequest("GET", url, nil)
if err != nil {
    return nil, fmt.Errorf("failed to create request: %w", err)
}

// Add custom headers
req.Header.Set("Authorization", "Bearer your-api-key")
req.Header.Set("X-Custom-Header", "custom-value")
```

## Error Handling

The script handles various error scenarios:

- **Network errors**: Connection failures, timeouts
- **HTTP errors**: 4xx/5xx status codes with response body
- **JSON parsing errors**: Malformed response data
- **Agent not found**: Graceful handling when agent doesn't exist

## Important Notes

### Agent Availability
The sample agent IDs (`ap_128094d3`, `agt_tmpl_mg8jr8l1_geckvz`, `agt_tmpl_mg8jtzzk_rl0diw`) are provided as examples but may not be available in the APort registry. You may see errors like:

- `agent_not_indexed` - Agent not found in registry
- `invalid_agent_id` - Agent ID format is incorrect

This is expected behavior for demo purposes. In production, you would use real agent IDs from your APort account.

### Agent ID Format
Agent IDs must follow the pattern: `ap_[a-zA-Z0-9]+`

Examples:
- ✅ `ap_128094d3` - Valid format
- ❌ `agt_tmpl_mg8jr8l1_geckvz` - Invalid format (should start with `ap_`)

## Next Steps

After running this hello world example:

1. **Explore the [APort Documentation](https://aport.io/docs)** for comprehensive guides
2. **Check out [APort SDKs](https://github.com/aporthq/aport-sdks)** for production-ready Go SDK
3. **Browse [Integration Examples](https://github.com/aporthq/aport-integrations)** for real-world use cases
4. **Learn about Policy Verification**: For authorizing actions, see policy verification examples

## Contributing

Found a bug or want to improve this example? 

1. Fork the [aport-integrations repository](https://github.com/aporthq/aport-integrations)
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This example is licensed under the MIT License - see the [LICENSE](../../../LICENSE) file for details.

---

**Secure your AI agents. Trust but verify.**

Made with love by the APort community