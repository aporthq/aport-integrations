# SPIFFE/SPIRE Integration Bridge

Bridge for federating identity between APort and SPIFFE/SPIRE for enterprise adoption.

## What It Does

- Verifies SPIFFE workload identities with APort
- Enables enterprise identity federation
- Supports workload-to-workload verification

## Installation

```bash
go build -o spiffe-bridge
```

## Configuration

```env
APORT_API_KEY=your-aport-key
APORT_PROJECT_ID=default
SPIRE_SOCKET_PATH=/tmp/spire-agent/public/api.sock
PORT=8080
```

## Usage

### Start Server

```bash
./spiffe-bridge
```

### Verify Workload

```bash
POST /verify
{
  "spiffe_id": "spiffe://example.org/workload/api",
  "action": "access_resource",
  "context": {
    "resource": "/api/data",
    "method": "GET"
  }
}
```

## How It Works

1. Workload sends request with SPIFFE ID
2. Bridge gets workload identity from SPIRE
3. Bridge verifies with APort
4. Returns allow/deny

## Use Cases

- Microservice-to-microservice auth
- Zero-trust networking
- Workload authorization
- Compliance auditing

## API Reference

### POST /verify

Verify a workload identity.

### GET /health

Health check endpoint.

## License

MIT
