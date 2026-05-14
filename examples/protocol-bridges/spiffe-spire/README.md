# APort SPIFFE/SPIRE Bridge

Go example for federating SPIFFE workload identity with APort policy checks.

The bridge accepts a SPIFFE ID, derives trust-domain and workload selectors, adds that identity data to the APort verification context, and returns an allow/deny federation decision.

## Use Case

Enterprise platforms often use SPIRE to issue SPIFFE IDs to workloads. APort adds a policy layer for agent actions. This bridge lets a service combine both:

1. Read or receive a SPIFFE ID from a workload.
2. Map that workload to an APort agent id.
3. Verify the requested action against an APort policy pack.
4. Allow or deny the federation decision.

## Example

```bash
export APORT_API_KEY=your_api_key

go run ./cmd/bridge \
  -spiffe-id spiffe://example.org/ns/payments/sa/refund-bot \
  -agent-id ap_a2d10232c6534523812423eec8a1425c \
  -policy enterprise.identity.federation.v1
```

Example response:

```json
{
  "allowed": true,
  "spiffe": {
    "id": "spiffe://example.org/ns/payments/sa/refund-bot",
    "trust_domain": "example.org",
    "path": "ns/payments/sa/refund-bot",
    "segments": ["ns", "payments", "sa", "refund-bot"],
    "selectors": {
      "ns": "payments",
      "sa": "refund-bot"
    }
  }
}
```

## SPIRE Integration

In a SPIRE-enabled service, obtain the workload SPIFFE ID from the SPIRE Workload API or from the workload certificate SAN. Pass that ID into `Federator.Federate` along with the mapped APort agent id:

```go
federator := bridge.Federator{
    Verifier: bridge.NewHTTPVerifier("https://aport.io", os.Getenv("APORT_API_KEY")),
    Policy:   "enterprise.identity.federation.v1",
}

result, err := federator.Federate(ctx, bridge.FederationRequest{
    SPIFFEID: "spiffe://example.org/ns/payments/sa/refund-bot",
    AgentID:  "ap_a2d10232c6534523812423eec8a1425c",
    Context: map[string]any{
        "action": "process_refund",
    },
})
```

## Context Sent to APort

```json
{
  "spiffe": {
    "id": "spiffe://example.org/ns/payments/sa/refund-bot",
    "trust_domain": "example.org",
    "path": "ns/payments/sa/refund-bot",
    "selectors": {
      "ns": "payments",
      "sa": "refund-bot"
    }
  },
  "action": "process_refund"
}
```

## Testing

```bash
go test ./...
go test ./... -run TestHTTPVerifier
go vet ./...
```

## Files

```text
cmd/bridge/main.go              CLI example
internal/bridge/spiffe.go       SPIFFE ID parsing
internal/bridge/aport.go        APort verification client
internal/bridge/federation.go   Federation decision flow
```
