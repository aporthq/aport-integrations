# APort Rails Gem Template

Rails-ready gem scaffold for verifying AI agents with APort before a controller action or Rack endpoint is allowed to run.

This template includes:

- A configurable Faraday client for the APort policy verification API.
- Rack middleware for protecting whole paths or mounted apps.
- A controller concern with `require_aport_policy`.
- An install generator that creates `config/initializers/aport.rb`.
- Mocked tests that do not require a live APort API key.
- A small example Rails controller that shows the intended integration.

## Quick Start

Copy the template into your integration workspace:

```bash
cp -r templates/ruby-rails examples/middleware/rails
cd examples/middleware/rails
bundle install
bundle exec rails generate aport:install
```

Set your API credentials:

```bash
export APORT_API_KEY=your_api_key_here
export APORT_BASE_URL=https://api.aport.io
```

Add the gem to a Rails app:

```ruby
# Gemfile
gem "aport-rails", path: "path/to/aport-rails"
```

Protect a controller:

```ruby
class RefundsController < ApplicationController
  require_aport_policy "finance.payment.refund.v1",
    context: { endpoint: "refunds#create" }

  def create
    render json: {
      ok: true,
      agent_id: aport_agent_id,
      passport: aport_passport
    }
  end
end
```

Clients must send an agent identifier with either `X-Agent-ID` or `X-APort-Agent-ID`.

## Configuration

The install generator writes this initializer:

```ruby
APort::Rails.configure do |config|
  config.api_key = ENV["APORT_API_KEY"]
  config.base_url = ENV.fetch("APORT_BASE_URL", "https://api.aport.io")
  config.default_context = {
    source: "rails",
    environment: Rails.env
  }
end
```

Available options:

| Option | Default | Description |
| --- | --- | --- |
| `api_key` | `ENV["APORT_API_KEY"]` | Bearer token sent to APort. |
| `base_url` | `https://api.aport.io` | APort API origin. |
| `timeout` | `5` | Faraday read timeout in seconds. |
| `open_timeout` | `2` | Faraday connection timeout in seconds. |
| `default_context` | `{}` | Context merged into every verification request. |
| `raise_on_missing_agent` | `true` | Whether strict middleware/controllers reject requests without an agent id. |

## Rack Middleware

Use the middleware when you want to guard a path before Rails routing reaches a controller:

```ruby
# config/application.rb
config.middleware.use APort::Rails::Middleware,
  policy: "admin.access",
  only: ["/admin"],
  context: { surface: "admin" }
```

When verification succeeds, the middleware writes:

- `env["aport.verification"]`
- `env["aport.passport"]`
- `env["aport.agent_id"]`

Set `strict: false` to let requests continue when verification fails while still exposing `env["aport.error"]`.

## Controller Helpers

Including the engine makes the concern available to controllers automatically. It provides:

- `require_aport_policy(policy, context: {}, strict: true)`
- `verify_aport_policy!(policy, context: {}, strict: true)`
- `aport_verification`
- `aport_passport`
- `aport_agent_id`

## Development

```bash
bundle install
bundle exec rake test
bundle exec rake build
```

The tests use WebMock and fake clients so CI can validate behavior without live credentials.

## Publishing

This template is ready for a normal RubyGems release flow once package ownership is confirmed:

```bash
bundle exec rake build
gem push pkg/aport-rails-0.1.0.gem
```

Do not publish from a fork without maintainer approval.
