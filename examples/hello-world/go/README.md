# APort Go Hello World

A minimal, single-file Go script that demonstrates both basic agent passport viewing and policy verification with the APort API. This example helps Go developers get started with APort in seconds using only the Go standard library.

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

# Run with default settings
go run main.go

# Or build and run
go build -o aport-hello main.go
./aport-hello
```

### Expected Output

```
APort Go Hello World Example
==============================

Base URL: https://aport.io
Agent ID: ap_128094d3
Policy: payments.refund.v1

=== Example 1: Agent Passport (Hello World) ===
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

=== Example 2: Policy Verification (Advanced) ===
Policy Verification Result:
   Agent ID: ap_128094d3
   Policy: payments.refund.v1
   Decision ID: dec_abc123xyz
   Status: DENIED
   Expires In: 60 seconds
   Reasons:
     - Passport with the specified agent ID was not found

Policy verification failed.
```

## Configuration

The script can be configured using environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `APORT_BASE_URL` | APort API base URL | `https://aport.io` |
| `APORT_AGENT_ID` | Agent ID to verify | `ap_128094d3` (sample refund bot) |
| `APORT_POLICY` | Policy pack to verify against | `payments.refund.v1` |

### Custom Configuration Examples

```bash
# Test with a different agent
APORT_AGENT_ID=agt_tmpl_mg8jr8l1_geckvz APORT_POLICY=data.export.v1 go run main.go

# Test with PR merger agent
APORT_AGENT_ID=agt_tmpl_mg8jtzzk_rl0diw APORT_POLICY=repo.v1 go run main.go

# Use a different APort instance
APORT_BASE_URL=https://api.aport.io go run main.go
```

## Sample Agents & Policies

The script includes several sample agents for testing:

### Sample Agents
- **Refund Bot**: `ap_128094d3` - For payment refund operations
- **Data Exporter**: `agt_tmpl_mg8jr8l1_geckvz` - For data export operations  
- **PR Merger**: `agt_tmpl_mg8jtzzk_rl0diw` - For repository operations

### Sample Policies
- **`payments.refund.v1`** - Payment refund policy
- **`data.export.v1`** - Data export policy
- **`repo.v1`** - Repository operations policy
- **`admin.access.v1`** - Administrative access policy

## How It Works

This example demonstrates two different APort API endpoints:

### Example 1: Agent Passport (Hello World)
**Purpose**: View an agent's public passport/profile  
**Endpoint**: `GET /api/verify/{agent_id}`  
**Authentication**: None required (public endpoint)  
**Use Case**: "Does this agent exist? What can it do?"

```bash
# Simple GET request
curl https://aport.io/api/verify/ap_128094d3
```

**Response**: Agent profile with capabilities, limits, verification status

### Example 2: Policy Verification (Advanced)
**Purpose**: Check if an agent is authorized to perform a specific action  
**Endpoint**: `POST /api/verify/policy/{policy_id}`  
**Authentication**: None required for demo  
**Use Case**: "Can this agent process a $100 refund?"

```json
{
  "context": {
    "agent_id": "ap_128094d3",
    "policy_id": "payments.refund.v1",
    "context": {
      "amount": 50,
      "currency": "USD",
      "order_id": "order_12345",
      "customer_id": "cust_67890",
      "reason_code": "customer_request",
      "idempotency_key": "refund_12345"
    }
  }
}
```

**Response**: Decision (allow/deny) with reasons and expiration

## Important Notes

### Agent Availability
The sample agent IDs (`ap_128094d3`, `agt_tmpl_mg8jr8l1_geckvz`, `agt_tmpl_mg8jtzzk_rl0diw`) are provided as examples but may not be available in the APort registry. You may see errors like:

- `agent_not_indexed` - Agent not found in registry
- `passport_not_found` - Agent passport not available

This is expected behavior for demo purposes. In production, you would use real agent IDs from your APort account.

### Policy Context
The script automatically generates appropriate context fields based on the policy type:
- **payments.refund.v1**: Includes amount, currency, order_id, customer_id, etc.
- **data.export.v1**: Includes export_type, format, filters
- **repo.v1**: Includes action, repository, branch

## Code Structure

The script is organized into several key components:

- **Data Structures**: Go structs for both agent passport and policy verification responses
- **Dual Endpoints**: Implements both GET (agent passport) and POST (policy verification) 
- **HTTP Client**: Uses `net/http` standard library for API calls
- **JSON Handling**: Uses `encoding/json` for request/response serialization
- **Error Handling**: Comprehensive error checking with descriptive messages
- **Configuration**: Environment variable support with sensible defaults
- **Policy Context**: Smart context generation based on policy type

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

### Different Policies

Change the policy to test different verification scenarios:

```bash
# Payment refund policy
APORT_POLICY=payments.refund.v1 go run main.go

# Data export policy
APORT_POLICY=data.export.v1 go run main.go

# Repository operations policy
APORT_POLICY=repo.v1 go run main.go
```

### Custom Policy Context

The script automatically generates appropriate context based on the policy type. You can modify the `getPolicyContext()` function to add custom fields:

```go
case "payments.refund.v1":
    return map[string]interface{}{
        "amount":         100,  // Custom amount
        "currency":       "EUR", // Custom currency
        "order_id":       "order_12345",
        "customer_id":    "cust_67890",
        "reason_code":    "customer_request",
        "idempotency_key": "refund_12345",
    }
```

### Custom Headers

Add authentication or other headers:

```go
req.Header.Set("Authorization", "Bearer your-api-key")
req.Header.Set("X-Custom-Header", "custom-value")
```

## Error Handling

The script handles various error scenarios:

- **Network errors**: Connection failures, timeouts
- **HTTP errors**: 4xx/5xx status codes with response body
- **JSON parsing errors**: Malformed response data
- **Missing decision data**: Graceful handling of unexpected response structure

## Next Steps

After running this hello world example:

1. **Explore the [APort Documentation](https://aport.io/docs)** for comprehensive guides
2. **Check out [APort SDKs](https://github.com/aporthq/aport-sdks)** for production-ready Go SDK
3. **Browse [Integration Examples](https://github.com/aporthq/aport-integrations)** for real-world use cases
4. **Join the [APort Discord](https://discord.gg/aport)** for community support

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
