# Basic Rails App Example

This directory shows the minimal application code needed to protect a Rails
controller action with APort verification.

## Files

- `Gemfile` adds `aport_rails`
- `config/routes.rb` exposes `POST /refunds`
- `app/controllers/application_controller.rb` includes the controller base
- `app/controllers/refunds_controller.rb` protects the action with APort

## Request

```bash
curl -X POST http://localhost:3000/refunds \
  -H "X-Agent-ID: agt_demo_123" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100}'
```
