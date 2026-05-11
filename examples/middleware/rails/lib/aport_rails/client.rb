require "cgi"
require "json"
require "net/http"
require "uri"

require "aport_rails/configuration"
require "aport_rails/errors"

module APortRails
  VerificationResult = Struct.new(
    :verified,
    :agent_id,
    :passport,
    :policy,
    :message,
    :details,
    :raw,
    keyword_init: true
  ) do
    def verified?
      !!verified
    end
  end

  class Client
    attr_reader :configuration

    def initialize(configuration = APortRails.configuration)
      @configuration = configuration
    end

    def verify(policy:, agent_id:, context: {})
      raise ConfigurationError, "policy is required" if blank?(policy)
      raise ConfigurationError, "agent_id is required" if blank?(agent_id)

      response = post_json(verify_uri(policy), verification_payload(policy, agent_id, context))
      parsed = parse_response(response)

      VerificationResult.new(
        verified: truthy?(parsed["verified"] || parsed["allowed"] || parsed["success"]),
        agent_id: parsed["agent_id"] || parsed.dig("passport", "agent_id") || agent_id,
        passport: parsed["passport"] || {},
        policy: parsed["policy"] || policy,
        message: parsed["message"],
        details: parsed["details"] || {},
        raw: parsed
      )
    end

    private

    def verify_uri(policy)
      base = configuration.base_url.to_s.sub(%r{/+\z}, "")
      URI("#{base}/api/verify/policy/#{CGI.escape(policy)}")
    end

    def verification_payload(policy, agent_id, context)
      {
        context: {
          agent_id: agent_id,
          policy_id: policy,
          context: context || {}
        }
      }
    end

    def post_json(uri, payload)
      request = Net::HTTP::Post.new(uri)
      request["Content-Type"] = "application/json"
      request["Authorization"] = "Bearer #{configuration.api_key}" unless blank?(configuration.api_key)
      request.body = JSON.generate(payload)

      Net::HTTP.start(
        uri.hostname,
        uri.port,
        use_ssl: uri.scheme == "https",
        open_timeout: configuration.open_timeout,
        read_timeout: configuration.read_timeout
      ) do |http|
        http.request(request)
      end
    rescue Timeout::Error, SocketError, SystemCallError => error
      raise NetworkError, "APort request failed: #{error.message}"
    end

    def parse_response(response)
      body = response.body.to_s.empty? ? "{}" : response.body
      parsed = JSON.parse(body)

      return parsed if response.is_a?(Net::HTTPSuccess)

      message = parsed["message"] || parsed["error"] || response.message
      raise APIError, "APort API error #{response.code}: #{message}"
    rescue JSON::ParserError
      raise APIError, "APort API returned invalid JSON"
    end

    def truthy?(value)
      value == true || value.to_s.downcase == "true"
    end

    def blank?(value)
      value.nil? || value.to_s.strip.empty?
    end
  end
end
