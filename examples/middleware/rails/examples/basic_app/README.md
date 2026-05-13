# Basic Rails App Example

This directory shows the minimal application code needed to protect a Rails
controller action with APort verification.

## Files

- `Gemfile` adds `aport_rails`
- `config/application.rb` boots a minimal Rails app
- `config.ru` exposes the app to Rack-compatible servers
- `config/routes.rb` exposes `POST /refunds`
- `app/controllers/application_controller.rb` includes the controller base
- `app/controllers/refunds_controller.rb` protects the action with APort

## Run

```bash
bundle install
APORT_API_KEY=your_api_key bundle exec rails server
```

## Request

```bash
curl -X POST http://localhost:3000/refunds \
  -H "X-Agent-ID: agt_demo_123" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100}'
```
