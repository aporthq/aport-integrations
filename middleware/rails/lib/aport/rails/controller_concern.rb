# frozen_string_literal: true

module Aport
  module Rails
    module ControllerConcern
      extend ActiveSupport::Concern

      PASSPORT_HEADER = "X-Agent-Passport-Id"
      AGENT_ID_HEADER = "X-Agent-Id"

      included do
        helper_method :current_agent
        before_action :verify_aport_agent, if: :aport_verification_required?
      end

      class_methods do
        # Enable agent verification for this controller.
        def require_agent
          class_attribute :aport_agent_required, instance_writer: false, default: true
        end

        # Require a specific policy.
        def require_policy(policy_id)
          require_agent
          class_attribute :aport_policy_id, instance_writer: false, default: policy_id
        end
      end

      def current_agent
        @current_agent ||= begin
          passport_id = request.headers[PASSPORT_HEADER] || request.headers[AGENT_ID_HEADER]
          return nil unless passport_id

          client = Aport::Rails::Client.new
          result = client.get_passport_view(passport_id)
          result[:success] ? result[:data] : nil
        end
      end

      private

      def aport_verification_required?
        defined?(aport_agent_required) && aport_agent_required
      end

      def verify_aport_agent
        return unless aport_verification_required?

        passport_id = request.headers[PASSPORT_HEADER] || request.headers[AGENT_ID_HEADER]
        unless passport_id
          render json: { error: "Agent ID missing" }, status: :forbidden
          return
        end

        client = Aport::Rails::Client.new
        result = client.verify_policy(
          pack_id:   aport_policy_id || Aport.configuration.default_policy_id,
          context:   { agent_id: passport_id, path: request.path, method: request.method, ip: request.remote_ip },
          passport:  extract_passport,
          policy_id: aport_policy_id
        )

        return if result[:success]

        status = result[:status] == 401 ? :unauthorized : :forbidden
        render json: { error: result[:error] }, status: status
      end

      def extract_passport
        return nil unless request.post? || request.put? || request.patch?

        begin
          body = params.to_unsafe_h
          body[:passport] || body[:policy]
        rescue
          nil
        end
      end
    end
  end
end
