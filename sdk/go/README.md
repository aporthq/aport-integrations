# APort Go SDK

Go SDK and framework middleware for APort policy verification.

## Install

```bash
go get github.com/aporthq/aport-integrations/sdk/go
```

## Core Client

```go
client := aport.NewClient(os.Getenv("APORT_API_KEY"))

decision, err := client.RequirePolicy(context.Background(), "payments.refund.v1", aport.VerifyRequest{
	AgentID: "agent_123",
	Context: map[string]any{
		"amount": 49.99,
	},
})
if errors.Is(err, aport.ErrDenied) {
	// Block the action.
}
```

## net/http Middleware

```go
guard := aporthttp.Middleware(aporthttp.Config{
	Client:   client,
	PolicyID: "payments.refund.v1",
})

http.Handle("/refund", guard(refundHandler))
```

The middleware reads the agent id from `X-Agent-ID` by default and stores the successful verification response on the request context.

## Gin, Echo, and Fiber

Framework adapters live under:

- `middleware/gin`
- `middleware/echo`
- `middleware/fiber`

Each adapter:

- Reads the agent id from `X-Agent-ID` by default.
- Builds a request context with method and route path.
- Fails closed with HTTP 403 on verification errors or denied decisions.
- Stores the successful APort decision in framework-local context.

## Configuration

```go
client := aport.NewClient(
	os.Getenv("APORT_API_KEY"),
	aport.WithBaseURL("https://api.aport.io"),
	aport.WithHTTPClient(&http.Client{Timeout: 5 * time.Second}),
)
```

## Tests

```bash
go test ./...
```
