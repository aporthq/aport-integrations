require_relative "test_helper"
require "action_controller/railtie"

class APortRailsTestApplication < Rails::Application
  config.root = File.expand_path("dummy", __dir__)
  config.hosts.clear
  config.secret_key_base = "test-secret-key-base"
  config.eager_load = false
  config.logger = Logger.new(nil)
  routes.append do
    post "/refunds", to: "refunds#create"
    post "/audit", to: "audit#create"
  end
end

APortRailsTestApplication.initialize! unless APortRailsTestApplication.initialized?

class RefundsController < ActionController::Base
  include APortRails::ControllerHelpers

  require_aport_policy "finance.payment.refund.v1", context: { resource: "refund" }

  def create
    render json: {
      ok: true,
      agent_id: aport_verification.agent_id,
      verified: aport_verification.verified?
    }
  end
end

class AuditController < ActionController::Base
  include APortRails::ControllerHelpers

  require_aport_policy "audit.write.v1", strict: false

  def create
    render json: {
      ok: true,
      verified: aport_verification.verified?,
      message: aport_verification.message
    }
  end
end

class APortRailsControllerHelpersTest < ActionDispatch::IntegrationTest
  def app
    APortRailsTestApplication
  end

  def test_rejects_missing_agent_id
    post "/refunds"

    assert_response :bad_request
    assert_equal "Agent ID required", JSON.parse(response.body)["error"]
  end

  def test_allows_verified_agent
    stub_request(:post, "https://aport.test/api/verify/policy/finance.payment.refund.v1")
      .to_return(
        status: 200,
        body: {
          verified: true,
          passport: { agent_id: "agt_header" }
        }.to_json
      )

    post "/refunds", headers: { "X-Agent-ID" => "agt_header" }

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal true, body["ok"]
    assert_equal "agt_header", body["agent_id"]
    assert_equal true, body["verified"]
  end

  def test_rejects_failed_verification
    stub_request(:post, "https://aport.test/api/verify/policy/finance.payment.refund.v1")
      .to_return(
        status: 200,
        body: {
          verified: false,
          message: "Agent not authorized"
        }.to_json
      )

    post "/refunds", headers: { "X-APort-Agent-ID" => "agt_blocked" }

    assert_response :forbidden
    assert_equal "Verification failed", JSON.parse(response.body)["error"]
  end

  def test_non_strict_mode_continues_on_aport_errors
    stub_request(:post, "https://aport.test/api/verify/policy/audit.write.v1")
      .to_return(status: 500, body: { message: "upstream down" }.to_json)

    post "/audit", headers: { "X-Agent-ID" => "agt_header" }

    assert_response :success
    body = JSON.parse(response.body)
    assert_equal true, body["ok"]
    assert_equal false, body["verified"]
    assert_match "upstream down", body["message"]
  end
end
