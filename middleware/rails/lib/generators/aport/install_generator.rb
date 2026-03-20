# frozen_string_literal: true

require "rails/generators"

module Aport
  module Generators
    class InstallGenerator < Rails::Generators::Base
      desc "Install APort Rails integration — creates initializer and .env.example"

      def create_initializer
        create_file "config/initializers/aport.rb", <<~RUBY
          # frozen_string_literal: true

          Aport.configure do |config|
            # Required: your APort API key
            config.api_key = ENV.fetch("APORT_API_KEY", nil)

            # Optional: override the default API base URL
            config.base_url = ENV.fetch("APORT_BASE_URL", "https://api.aport.io")

            # Optional: HTTP timeout in seconds
            config.timeout = 10

            # Optional: paths to skip verification (e.g. health checks)
            config.skip_paths = ["/health", "/metrics", "/ping"]

            # Optional: when true, unverified requests are rejected (default: true)
            config.fail_closed = true

            # Optional: default policy pack ID for middleware-level verification
            config.default_policy_id = ENV.fetch("APORT_POLICY_ID", nil)
          end
        RUBY
      end

      def create_env_example
        create_file ".env.example", <<~ENV
          # APort Configuration
          APORT_API_KEY=your_api_key_here
          APORT_BASE_URL=https://api.aport.io
          APORT_POLICY_ID=your_default_policy_id
        ENV
      end

      def show_message
        say "\n✅ APort installed! Next steps:"
        say "   1. Copy .env.example to .env and fill in your API key"
        say "   2. Add 'aport-rails' to your Gemfile"
        say "   3. Use `require_agent` or `require_policy(:id)` in controllers"
      end
    end
  end
end
