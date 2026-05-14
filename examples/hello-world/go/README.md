# Hello, APort! for Go

Minimal Go example for calling APort `/api/verify/policy/{policy}` with only the standard library.

## Run

```bash
cd examples/hello-world/go
go run main.go
```

The example uses public demo defaults from the repository CLI docs. Override them with environment variables:

```bash
export APORT_BASE_URL="https://aport.io"
export APORT_AGENT_ID="ap_a2d10232c6534523812423eec8a1425c"
export APORT_POLICY_ID="finance.payment.refund.v1"
export APORT_API_KEY="optional_api_key"

go run main.go
```

## Output

The program prints the decision and any reasons returned by APort:

```text
allow: true
reasons: none
```

If APort denies the request, the response looks like:

```text
allow: false
reasons:
- Requested action exceeds the policy limit
```
