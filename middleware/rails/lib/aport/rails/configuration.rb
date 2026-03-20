# frozen_string_literal: true

module Aport
  module Rails
    class Configuration
      attr_accessor :api_key, :base_url, :timeout, :skip_paths, :fail_closed, :default_policy_id

      def initialize
        @api_key           = ENV.fetch("APORT_API_KEY", nil)
        @base_url          = ENV.fetch("APORT_BASE_URL", "https://api.aport.io")
        @timeout           = 10
        @skip_paths        = ["/health", "/metrics", "/ping"]
        @fail_closed       = true
        @default_policy_id = nil
      end
    end
  end
end
