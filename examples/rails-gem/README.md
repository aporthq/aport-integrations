# APort Rails Gem

Ruby gem for APort verification in Rails applications.

## Installation

Add to Gemfile:

```ruby
gem 'aport', path: 'path/to/rails-gem'
```

Or from RubyGems:

```bash
gem install aport
```

## Configuration

### Environment Variables

```bash
export APORT_API_KEY=your-api-key
export APORT_PROJECT_ID=your-project-id
export APORT_ENABLED=true
export APORT_EXEMPT_PATHS=/health,/api/public
```

### Rails Initializer

Create `config/initializers/aport.rb`:

```ruby
APort.configure do |config|
  config.api_key = ENV['APORT_API_KEY']
  config.project_id = 'default'
  config.enabled = true
  config.exempt_paths = ['/health', '/api/public']
  config.timeout = 5
end
```

## Usage

The middleware is automatically added to your Rails application.

### Manual Usage

```ruby
require 'aport'

client = APort::Client.new do |config|
  config.api_key = 'your-api-key'
  config.project_id = 'default'
end

result = client.verify(
  action: 'custom_action',
  actor_id: current_user.id,
  actor_name: current_user.name,
  context: { key: 'value' }
)

unless result['allow']
  render json: { error: 'Access Denied' }, status: :forbidden
end
```

## Exempt Paths

Configure paths to skip verification:

```ruby
# config/initializers/aport.rb
APort.configure do |config|
  config.exempt_paths = ['/health', '/webhook', '/api/public']
end
```

## Error Handling

- If APort API is unreachable, requests are allowed by default
- 5 second timeout
- Errors are logged

## Development

```bash
# Build gem
gem build aport.gemspec

# Install locally
gem install ./aport-1.0.0.gem
```

## License

MIT
