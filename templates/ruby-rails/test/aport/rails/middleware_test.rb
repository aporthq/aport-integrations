require "test_helper"

class APortRailsMiddlewareTest < Minitest::Test
  def setup
    APort::Rails.reset!
  end

  def app_with_env_capture(captured_env)
    lambda do |env|
      captured_env.merge!(env)
      [200, { "Content-Type" => "text/plain" }, ["ok"]]
    end
  end

  def test_verifies_matching_request_and_attaches_env_values
    captured_env = {}
    client = FakeClient.new
    app = APort::Rails::Middleware.new(
      app_with_env_capture(captured_env),
      policy: "finance.payment.refund.v1",
      only: ["/refunds"],
      context: { endpoint: "refunds" },
      client: client
    )

    response = Rack::MockRequest.new(app).post("/refunds", "HTTP_X_AGENT_ID" => "agent-1")

    assert_equal 200, response.status
    assert_equal "agent-1", captured_env[APort::Rails::Middleware::ENV_AGENT_ID]
    assert_equal({ "agent_id" => "agent-1" }, captured_env[APort::Rails::Middleware::ENV_PASSPORT])
    assert_equal(
      [{ policy: "finance.payment.refund.v1", agent_id: "agent-1", context: { endpoint: "refunds" } }],
      client.calls
    )
  end

  def test_skips_non_matching_paths
    captured_env = {}
    client = FakeClient.new
    app = APort::Rails::Middleware.new(
      app_with_env_capture(captured_env),
      policy: "finance.payment.refund.v1",
      only: ["/refunds"],
      client: client
    )

    response = Rack::MockRequest.new(app).get("/health")

    assert_equal 200, response.status
    assert_empty client.calls
  end

  def test_returns_missing_agent_error_in_strict_mode
    app = APort::Rails::Middleware.new(
      lambda { |_env| [200, {}, ["ok"]] },
      policy: "admin.access",
      client: FakeClient.new
    )

    response = Rack::MockRequest.new(app).get("/admin")

    assert_equal 401, response.status
    assert_includes response.body, "missing_agent_id"
  end

  def test_non_strict_mode_continues_after_verification_error
    captured_env = {}
    client = FakeClient.new(error: APort::Rails::VerificationError.new("denied"))
    app = APort::Rails::Middleware.new(
      app_with_env_capture(captured_env),
      policy: "admin.access",
      strict: false,
      client: client
    )

    response = Rack::MockRequest.new(app).get("/admin", "HTTP_X_AGENT_ID" => "agent-1")

    assert_equal 200, response.status
    assert_instance_of APort::Rails::VerificationError, captured_env[APort::Rails::Middleware::ENV_ERROR]
  end
end
