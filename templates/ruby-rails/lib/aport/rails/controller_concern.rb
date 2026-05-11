require "active_support/concern"
require "aport/rails/request_extractors"

module APort
  module Rails
    module ControllerConcern
      extend ActiveSupport::Concern

      included do
        helper_method :aport_verification if respond_to?(:helper_method)
        helper_method :aport_passport if respond_to?(:helper_method)
        helper_method :aport_agent_id if respond_to?(:helper_method)
      end

      class_methods do
        def require_aport_policy(policy, **options)
          before_action(options.except(:context, :strict)) do
            verify_aport_policy!(
              policy,
              context: options.fetch(:context, {}),
              strict: options.fetch(:strict, true)
            )
          end
        end
      end

      def verify_aport_policy!(policy, context: {}, strict: true)
        agent_id = RequestExtractors.agent_id_from_controller(request, params, APort::Rails.configuration)
        if agent_id.nil? || agent_id.empty?
          return render_aport_error(:unauthorized, "missing_agent_id", "X-Agent-ID or X-APort-Agent-ID header is required") if strict

          return false
        end

        @aport_agent_id = agent_id
        @aport_verification = aport_client.verify(policy: policy, agent_id: agent_id, context: context)
        @aport_passport = @aport_verification["passport"]
        true
      rescue VerificationError => error
        return render_aport_error(:forbidden, "aport_verification_failed", error.message) if strict

        @aport_error = error
        false
      end

      def aport_verification
        @aport_verification
      end

      def aport_passport
        @aport_passport
      end

      def aport_agent_id
        @aport_agent_id
      end

      def aport_client
        APort::Rails.client
      end

      private

      def render_aport_error(status, code, message)
        render json: { error: code, message: message }, status: status
        false
      end
    end
  end
end
