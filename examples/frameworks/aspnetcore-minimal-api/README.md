# APort ASP.NET Core Minimal API Example

This example shows how to protect an ASP.NET Core Minimal API endpoint with an APort policy check before business logic runs.

Integration highlight: the `/refunds` endpoint uses an endpoint filter to call APort `/verify` with the agent ID from `X-Agent-Id`. If APort denies the policy check, the endpoint returns `403` and the refund handler is not executed.

## What is included

- `src/Program.cs` - a self-contained Minimal API app.
- `IAportVerificationClient` - a small typed `HttpClient` wrapper for APort `/verify`.
- `RequireAportVerification(...)` - an endpoint filter extension that protects selected routes.
- Mock mode for local development, enabled by default.

## Prerequisites

- .NET 10 SDK
- An APort API key for live verification

## Run locally

```bash
cd examples/frameworks/aspnetcore-minimal-api/src
dotnet run
```

The app listens on the URL printed by `dotnet run`, usually `http://localhost:5xxx`.

## Try the public health endpoint

```bash
curl http://localhost:5000/health
```

If your local port is different, replace `5000` with the port from `dotnet run`.

## Try the protected refund endpoint in mock mode

Mock mode is enabled by default so the example works without credentials.

Allowed mock request:

```bash
curl -X POST http://localhost:5000/refunds \
  -H "Content-Type: application/json" \
  -H "X-Agent-Id: agt_demo" \
  -d '{"orderId":"ord_123","amount":42.50,"currency":"USD"}'
```

Denied mock request:

```bash
curl -X POST http://localhost:5000/refunds \
  -H "Content-Type: application/json" \
  -H "X-Agent-Id: agt_denied" \
  -d '{"orderId":"ord_123","amount":42.50,"currency":"USD"}'
```

## Use the live APort API

Set these values in your shell or secret store:

```bash
export APort__BaseUrl="https://api.aport.io"
export APort__ApiKey="your_api_key_here"
export APort__DefaultPolicy="finance.payment.refund.v1"
export APort__UseMock="false"
```

On PowerShell:

```powershell
$env:APort__BaseUrl="https://api.aport.io"
$env:APort__ApiKey="your_api_key_here"
$env:APort__DefaultPolicy="finance.payment.refund.v1"
$env:APort__UseMock="false"
```

The live request body sent to APort is:

```json
{
  "policy": "finance.payment.refund.v1",
  "agentId": "agt_demo",
  "context": {
    "path": "/refunds",
    "method": "POST"
  }
}
```

## Configuration

| Key | Default | Description |
| --- | --- | --- |
| `APort__BaseUrl` | `https://api.aport.io` | APort API base URL. |
| `APort__ApiKey` | empty | API key used as a Bearer token for live verification. |
| `APort__DefaultPolicy` | `finance.payment.refund.v1` | Policy checked by the protected endpoint. |
| `APort__UseMock` | `true` | Keeps the sample runnable without credentials. Set to `false` for live API calls. |

## How to reuse this pattern

1. Register a typed `HttpClient` for APort verification.
2. Add `RequireAportVerification("your.policy.id")` to any Minimal API endpoint that needs policy enforcement.
3. Pass an agent identifier through a trusted header, token claim, or service-to-service identity mechanism.
4. Keep secrets in environment variables, user secrets, or a production secret manager; do not commit API keys.

## Notes

- The example intentionally avoids third-party packages so it can be copied into existing ASP.NET Core apps.
- The endpoint filter returns Problem Details responses for missing agent IDs, denied policies, and API failures.
- In a production app, bind the agent identity from your authentication layer instead of trusting a raw client-supplied header.
