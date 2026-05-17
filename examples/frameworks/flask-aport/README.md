# APort Flask Verification Example

Minimal Flask app showing how to protect routes with an APort policy check.

## What It Shows

- Reads the agent passport from the `X-APort-Agent-ID` header
- Calls APort's policy verification endpoint before serving protected routes
- Returns clear `401`, `403`, and `502` JSON responses for missing, denied, or failed verification
- Includes tests that mock APort verification, so no API key is required for local validation

## Run Locally

```bash
cd examples/frameworks/flask-aport
python -m pip install -r requirements.txt
export APORT_API_KEY="your-api-key"
export APORT_POLICY_ID="code.repository.merge.v1"
python app.py
```

On Windows PowerShell:

```powershell
$env:APORT_API_KEY="your-api-key"
$env:APORT_POLICY_ID="code.repository.merge.v1"
python app.py
```

Try the protected route:

```bash
curl -H "X-APort-Agent-ID: agt_123" http://127.0.0.1:5000/protected
```

## Environment

| Variable | Default | Description |
| --- | --- | --- |
| `APORT_API_KEY` | required for real verification | API key sent as a Bearer token |
| `APORT_POLICY_ID` | `code.repository.merge.v1` | Policy pack used by the protected route |
| `APORT_API_BASE_URL` | `https://aport.io` | APort API base URL |

## Test

```bash
python -m pytest
```
