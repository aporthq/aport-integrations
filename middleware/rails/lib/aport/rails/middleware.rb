# frozen_string_literal: true

require "json"

module Aport
  module Rails
    class Middleware
      PASSPORT_HEADER = "X-Agent-Passport-Id"
      AGENT_ID_HEADER = "X-Agent-Id"

      def initialize(app)
        @app = app
        @config = Aport.configuration
        @client = Client.new(@config)
      end

      def call(env)
        request = Rack::Request.new(env)

        if skip_path?(request.path)
          return @app.call(env)
        end

        unless @config.default_policy_id
          return @app.call(env)
        end

        agent_id = request.get_header(PASSPORT_HEADER) || request.get_header(AGENT_ID_HEADER)

        unless agent_id
          return fail_closed? ? forbidden_response("Agent ID missing") : @app.call(env)
        end

        result = verify_agent(request, agent_id)

        return @app.call(env) if result[:success]

        error_response(result)
      end

      private

      def verify_agent(request, agent_id)
        passport = extract_passport(request)
        context  = build_context(request, agent_id)

        @client.verify_policy(
          pack_id:   @config.default_policy_id,
          context:   context,
          passport:  passport,
          policy_id: nil
        )
      end

      def build_context(request, agent_id)
        {
          agent_id: agent_id,
          path:     request.path,
          method:   request.request_method,
          ip:       request.ip
        }
      end

      def extract_passport(request)
        return nil unless request.post? || request.put? || request.patch?

        begin
          body = JSON.parse(request.body.read, symbolize_names: true)
          request.body.rewind
          body[:passport] || body[:policy]
        rescue JSON::ParserError
          nil
        end
      end

      def skip_path?(path)
        @config.skip_paths.any? { |p| path.start_with?(p) }
      end

      def fail_closed?
        @config.fail_closed
      end

      def forbidden_response(message)
        [403, { "Content-Type" => "application/json" }, [JSON.generate({ error: message })]]
      end

      def error_response(result)
        status = result[:status] == 401 ? 401 : 403
        [status, { "Content-Type" => "application/json" }, [JSON.generate({ error: result[:error] })]]
      end
    end
  end
end
