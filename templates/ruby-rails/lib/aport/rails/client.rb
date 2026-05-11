require "faraday"
require "json"

module APort
  module Rails
    class Error < StandardError; end
    class ConfigurationError < Error; end
    class VerificationError < Error; end

    class Client
      attr_reader :configuration

      def initialize(configuration = APort::Rails.configuration)
        @configuration = configuration
      end

      def verify(policy:, agent_id:, context: {})
        raise ConfigurationError, "policy is required" if blank?(policy)
        raise ConfigurationError, "agent_id is required" if blank?(agent_id)

        payload = {
          agent_id: agent_id,
          policy_id: policy,
          context: configuration.merge_context(context)
        }

        response = connection.post("/api/verify/policy/#{escape_path(policy)}", payload)
        parsed_body = parse_body(response.body)

        unless response.success?
          message = parsed_body["message"] || parsed_body["error"] || "APort verification failed"
          raise VerificationError, message
        end

        result = normalize_result(parsed_body, agent_id)
        unless result["verified"]
          raise VerificationError, result["message"] || result["error"] || "APort verification failed"
        end

        result
      rescue Faraday::Error => error
        raise VerificationError, error.message
      end

      private

      def connection
        @connection ||= Faraday.new(url: configuration.base_url) do |faraday|
          faraday.request :json
          faraday.response :json, content_type: /\bjson$/
          faraday.options.timeout = configuration.timeout
          faraday.options.open_timeout = configuration.open_timeout
          faraday.headers["Authorization"] = "Bearer #{configuration.api_key}" if present?(configuration.api_key)
          faraday.headers["Accept"] = "application/json"
        end
      end

      def normalize_result(body, agent_id)
        body = {} unless body.is_a?(Hash)
        body["verified"] = true unless body.key?("verified")
        body["agent_id"] ||= agent_id
        body
      end

      def parse_body(body)
        return body if body.is_a?(Hash)
        return {} if blank?(body)

        JSON.parse(body)
      rescue JSON::ParserError
        {}
      end

      def escape_path(value)
        value.to_s.gsub("/", "%2F")
      end

      def blank?(value)
        value.nil? || value.respond_to?(:empty?) && value.empty?
      end

      def present?(value)
        !blank?(value)
      end
    end
  end
end
