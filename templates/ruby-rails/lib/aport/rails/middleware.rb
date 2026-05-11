require "json"
require "rack/request"
require "aport/rails/request_extractors"

module APort
  module Rails
    class Middleware
      ENV_VERIFICATION = "aport.verification"
      ENV_AGENT_ID = "aport.agent_id"
      ENV_PASSPORT = "aport.passport"
      ENV_ERROR = "aport.error"

      def initialize(app, policy:, only: nil, except: nil, context: {}, strict: true, client: nil)
        @app = app
        @policy = policy
        @only = Array(only).compact
        @except = Array(except).compact
        @context = context || {}
        @strict = strict
        @client = client || APort::Rails.client
      end

      def call(env)
        return @app.call(env) unless verify_path?(env["PATH_INFO"])

        agent_id = RequestExtractors.agent_id_from_rack(env, APort::Rails.configuration)
        return missing_agent_response(env) if missing_agent?(agent_id)

        verification = @client.verify(policy: @policy, agent_id: agent_id, context: @context)
        env[ENV_VERIFICATION] = verification
        env[ENV_AGENT_ID] = agent_id
        env[ENV_PASSPORT] = verification["passport"]
        @app.call(env)
      rescue VerificationError => error
        env[ENV_ERROR] = error
        return @app.call(env) unless @strict

        json_response(403, error: "aport_verification_failed", message: error.message)
      end

      private

      def verify_path?(path)
        return false if @except.any? { |pattern| path_matches?(path, pattern) }
        return true if @only.empty?

        @only.any? { |pattern| path_matches?(path, pattern) }
      end

      def path_matches?(path, pattern)
        case pattern
        when Regexp
          pattern.match?(path)
        else
          path.to_s.start_with?(pattern.to_s)
        end
      end

      def missing_agent?(agent_id)
        agent_id.nil? || agent_id.empty?
      end

      def missing_agent_response(env)
        return @app.call(env) unless @strict && APort::Rails.configuration.raise_on_missing_agent

        json_response(401, error: "missing_agent_id", message: "X-Agent-ID or X-APort-Agent-ID header is required")
      end

      def json_response(status, payload)
        body = JSON.generate(payload)
        [
          status,
          {
            "Content-Type" => "application/json",
            "Content-Length" => body.bytesize.to_s
          },
          [body]
        ]
      end
    end
  end
end
