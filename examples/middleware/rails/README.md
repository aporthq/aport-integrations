# APort Rails Middleware

Rails integration for protecting controller actions with APort policy verification.

This example is structured as a Ruby gem so it can be copied into a Rails app,
tested locally, or published as a private/internal gem.

## Features

- `require_aport_policy` controller macro for before-action verification
- A small APort HTTP client using Ruby standard library APIs
- Agent ID extraction from headers, query params, or request params
- Install generator for `config/initializers/aport.rb`
- Strict and non-strict failure modes
- Minitest coverage for the client, controller helpers, and generator
- Minimal Rails example app wiring

## Installation

Add the gem to a Rails application:

```ruby
gem "aport_rails", path: "examples/middleware/rails"
```

Install and generate the initializer:

```bash
bundle install
bin/rails generate aport:install
```

Configure credentials through environment variables:

```bash
APORT_API_KEY=your_api_key
APORT_BASE_URL=https://aport.io
```

## Usage

```ruby
class RefundsController < ApplicationController
  require_aport_policy "finance.payment.refund.v1",
    context: { resource: "refund" }

  def create
    render json: {
      ok: true,
      agent_id: aport_verification.agent_id,
      passport: aport_verification.passport
    }
  end
end
```

The middleware checks the following agent ID sources in order:

1. `X-Agent-ID`
2. `X-APort-Agent-ID`
3. `agent_id`
4. `agentId`

## Configuration

```ruby
APortRails.configure do |config|
  config.api_key = ENV["APORT_API_KEY"]
  config.base_url = ENV.fetch("APORT_BASE_URL", "https://aport.io")
  config.open_timeout = 2
  config.read_timeout = 5
  config.strict = true
end
```

In strict mode, APort client errors return `500`. In non-strict mode, the request
continues and `aport_verification.verified?` is false.

## Testing

From this directory:

```bash
bundle install
bundle exec rake test
```

The tests stub APort HTTP calls, so they do not require a live APort account.

## Example App

See `examples/basic_app` for a minimal Rails controller and route setup.
