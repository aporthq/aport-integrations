# APort SPIFFE/SPIRE Bridge

This example federates SPIFFE workload identity into an APort policy decision. It reads the current workload X509-SVID from the SPIFFE Workload API, validates the trust domain, and sends the SPIFFE ID plus application context to APort.

## What it includes

- Go bridge library using `github.com/spiffe/go-spiffe/v2/workloadapi`
- HTTP APort policy verification client
- CLI example for one-shot policy checks from a SPIRE-enabled workload
- Unit tests for APort requests, trust-domain enforcement, and bridge context
- Example environment configuration

## Prerequisites

- Go 1.24+
- A running SPIRE agent exposing the SPIFFE Workload API
- An APort API key if your policy requires authenticated verification

## Configuration

```bash
cp .env.example .env
```

Set these values:

```bash
APORT_BASE_URL=https://aport.io
APORT_API_KEY=your_aport_api_key
APORT_POLICY_ID=enterprise.identity.federation.v1
SPIFFE_ENDPOINT_SOCKET=unix:///tmp/spire-agent/public/api.sock
SPIFFE_TRUST_DOMAIN=example.org
```

`SPIFFE_TRUST_DOMAIN` is optional, but recommended. When set, the bridge rejects workloads whose X509-SVID is outside the configured trust domain before making an APort request.

## Run a verification

Run the CLI inside a workload that can access the SPIRE agent socket:

```bash
go run ./cmd/aport-spiffe-bridge \
  -action refund.approve \
  -resource order-1001 \
  -context '{"amount":50,"currency":"USD"}'
```

By default, the bridge uses the workload SPIFFE ID as the APort `agent_id`:

```json
{
  "agent_id": "spiffe://example.org/ns/payments/sa/refund-bot"
}
```

If your APort passport uses a separate agent identifier, pass it explicitly:

```bash
go run ./cmd/aport-spiffe-bridge \
  -agent-id agt_inst_refund_bot_123 \
  -action refund.approve \
  -resource order-1001
```

The process exits with:

- `0` when APort authorizes the workload
- `2` when APort returns a valid denial
- `1` when the bridge cannot read SPIFFE identity, cannot reach APort, or has invalid configuration

## Library usage

```go
cfg, err := spiffebridge.LoadConfigFromEnv()
if err != nil {
    return err
}

bridge, err := spiffebridge.NewBridgeFromConfig(ctx, cfg)
if err != nil {
    return err
}
defer bridge.Close()

decision, err := bridge.VerifyCurrentWorkload(ctx, spiffebridge.WorkloadVerificationRequest{
    Action:   "refund.approve",
    Resource: "order-1001",
    Context: map[string]any{
        "amount":   50,
        "currency": "USD",
    },
})
if err != nil {
    return err
}
if !decision.Authorized {
    return fmt.Errorf("APort denied workload: %s", decision.Message)
}
```

## SPIRE setup example

For a local SPIRE test environment, create a workload registration entry that issues a SPIFFE ID to the process running the bridge:

```bash
spire-server entry create \
  -parentID spiffe://example.org/spire/agent/join_token/local-agent \
  -spiffeID spiffe://example.org/ns/payments/sa/refund-bot \
  -selector unix:user:$(id -un)
```

The workload must be able to reach the agent socket in `SPIFFE_ENDPOINT_SOCKET`.

## Testing

```bash
go test ./...
```

The tests do not require a running SPIRE agent. They use a fake X509-SVID source and an `httptest` APort API.

## Security notes

- Do not hardcode APort API keys.
- Keep `SPIFFE_TRUST_DOMAIN` set in production so identities from unexpected trust domains fail closed.
- Treat `-agent-id` overrides as privileged configuration. The default SPIFFE ID mapping is safer when passports are issued for workload identities.
