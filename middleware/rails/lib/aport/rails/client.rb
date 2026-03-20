# frozen_string_literal: true

require "faraday"
require "json"

module Aport
  module Rails
    class Client
      attr_reader :configuration

      def initialize(config = nil)
        @configuration = config || Aport.configuration
      end

      # Verify an agent against a policy pack.
      #
      # @param pack_id [String] the policy pack ID
      # @param context [Hash] request context { path, method, headers }
      # @param passport [Hash, nil] optional passport data
      # @param policy_id [String, nil] optional specific policy ID
      # @return [Hash] parsed response body
      def verify_policy(pack_id:, context:, passport: nil, policy_id: nil)
        body = { context: context }
        body[:passport] = passport if passport
        body[:policy]   = policy_id if policy_id

        response = connection.post("/api/verify/policy/#{pack_id}") do |req|
          req.body = JSON.generate(body)
        end

        handle_response(response)
      end

      # Fetch a passport view by passport ID.
      #
      # @param passport_id [String]
      # @return [Hash]
      def get_passport_view(passport_id)
        response = connection.get("/api/passport/#{passport_id}")
        handle_response(response)
      end

      private

      def connection
        @connection ||= Faraday.new(url: configuration.base_url) do |f|
          f.adapter :net_http
          f.options.timeout     = configuration.timeout
          f.options.open_timeout = configuration.timeout / 2.0
          f.headers["Content-Type"]  = "application/json"
          f.headers["Authorization"] = "Bearer #{configuration.api_key}"
        end
      end

      def handle_response(response)
        body = begin
          JSON.parse(response.body, symbolize_names: true)
        rescue JSON::ParserError
          { raw: response.body }
        end

        case response.status
        when 200..299
          { success: true, data: body, status: response.status }
        when 401
          { success: false, error: "Unauthorized", status: 401 }
        when 403
          { success: false, error: "Forbidden", status: 403 }
        else
          { success: false, error: body[:error] || "Unknown error", status: response.status }
        end
      end
    end
  end
end
