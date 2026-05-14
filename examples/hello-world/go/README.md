# Hello, APort! for Go

This example shows the smallest Go program needed to call the APort `/verify` endpoint with only the standard library.

## What it does

- Sends a `POST` request to `/api/verify/policy/{policy}`.
- Uses `net/http`, `encoding/json`, and other Go standard-library packages only.
- Prints the `allow` value from the response.
- Prints every response reason, or `none` when the API returns no reasons.

## Run it

From this directory:

    go run main.go

You can override the defaults with environment variables:

    APORT_API_KEY="your-api-key" \
    APORT_AGENT_ID="agent-123" \
    APORT_POLICY_ID="code.repository.merge.v1" \
    APORT_BASE_URL="https://aport.io" \
    go run main.go

## Configuration

- `APORT_API_KEY`: Optional bearer token for authenticated APort deployments.
- `APORT_AGENT_ID`: Agent identifier sent in the verification context. Defaults to `hello-go-agent`.
- `APORT_POLICY_ID`: Policy identifier to verify against. Defaults to `code.repository.merge.v1`.
- `APORT_BASE_URL`: APort API base URL. Defaults to `https://aport.io`.

The program exits with a non-zero status when the request fails, the API returns a non-2xx response, or the response JSON cannot be decoded.
