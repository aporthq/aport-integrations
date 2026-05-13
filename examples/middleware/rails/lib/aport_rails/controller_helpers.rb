require "active_support/concern"

require "aport_rails/client"
require "aport_rails/errors"

module APortRails
  module ControllerHelpers
    extend ActiveSupport::Concern

    included do
      helper_method :aport_verification if respond_to?(:helper_method)
    end

    class_methods do
      def require_aport_policy(policy, options = {})
        callback_options = options.reject do |key, _|
          %i[agent_id context strict client].include?(key)
        end

        before_action(callback_options) do
          verify_aport_policy!(
            policy,
            agent_id: options[:agent_id],
            context: options.fetch(:context, {}),
            strict: options.fetch(:strict, APortRails.configuration.strict),
            client: options[:client]
          )
        end
      end
    end

    def verify_aport_policy!(policy, agent_id: nil, context: {}, strict: APortRails.configuration.strict, client: nil)
      agent_id ||= extract_aport_agent_id

      unless present?(agent_id)
        render_aport_error(:bad_request, "Agent ID required", "Agent ID must be provided in headers or params")
        return false
      end

      result = (client || APortRails::Client.new).verify(
        policy: policy,
        agent_id: agent_id,
        context: default_aport_context.merge(context || {})
      )

      self.aport_verification = result

      return true if result.verified?

      render_aport_error(:forbidden, "Verification failed", result.message || "Agent verification failed", result.details)
      false
    rescue APortRails::Error => error
      return handle_non_strict_aport_error(policy, agent_id, error) unless strict

      render_aport_error(:internal_server_error, "Verification error", error.message)
      false
    end

    def aport_verification
      @aport_verification ||= request.env["aport.verification"]
    end

    private

    def aport_verification=(result)
      request.env["aport.verification"] = result
      @aport_verification = result
    end

    def extract_aport_agent_id
      request.headers["X-Agent-ID"] ||
        request.headers["X-APort-Agent-ID"] ||
        params[:agent_id] ||
        params[:agentId]
    end

    def default_aport_context
      {
        method: request.request_method,
        path: request.path,
        user_agent: request.user_agent,
        ip: request.remote_ip
      }.compact
    end

    def handle_non_strict_aport_error(policy, agent_id, error)
      self.aport_verification = VerificationResult.new(
        verified: false,
        agent_id: agent_id,
        passport: {},
        policy: policy,
        message: error.message,
        details: { error_class: error.class.name },
        raw: {}
      )
      true
    end

    def render_aport_error(status, error, message, details = {})
      render json: {
        error: error,
        message: message,
        details: details
      }, status: status
    end

    def present?(value)
      !value.nil? && !value.to_s.strip.empty?
    end
  end
end
