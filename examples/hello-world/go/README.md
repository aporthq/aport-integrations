# APort Go Hello World

A minimal, single-file Go script that demonstrates a basic call to the APort `/verify` endpoint. This example helps Go developers get started with APort in seconds using only the Go standard library.

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

Verification Result:
   Agent ID: ap_128094d3
   Policy: payments.refund.v1
   Decision ID: dec_abc123xyz
   Status: ALLOWED
   Expires In: 3600 seconds
   Reasons:
     - Agent has valid refund capability
     - Amount within limits

Success! Agent verification passed.
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

1. **Request Structure**: The script creates a POST request to `/api/verify/policy/{policy}` with:
   ```json
   {
     "context": {
       "agent_id": "ap_128094d3",
       "policy_id": "payments.refund.v1",
       "context": {
         "amount": 50,
         "currency": "USD",
         "demo": true
       }
     }
   }
   ```

2. **Response Parsing**: Extracts the `allow` status and `reasons` from the JSON response:
   ```json
   {
     "data": {
       "decision": {
         "allow": true,
         "decision_id": "dec_abc123xyz",
         "expires_in": 3600,
         "reasons": [
           {"message": "Agent has valid refund capability"}
         ]
       }
     }
   }
   ```

3. **Result Display**: Shows verification status, decision details, and any reasons.

## Code Structure

The script is organized into several key components:

- **Data Structures**: Go structs that mirror the APort API request/response format
- **HTTP Client**: Uses `net/http` standard library for API calls
- **JSON Handling**: Uses `encoding/json` for request/response serialization
- **Error Handling**: Comprehensive error checking with descriptive messages
- **Configuration**: Environment variable support with sensible defaults

## Customization

### Adding Custom Context

Modify the `Context` field in the verification request:

```go
Context: map[string]interface{}{
    "amount":      100,
    "currency":    "EUR",
    "customer_id": "cust_123",
    "order_id":    "ord_456",
},
```

### Different Policies

Change the policy to test different verification scenarios:

```bash
APORT_POLICY=data.export.v1 go run main.go
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
