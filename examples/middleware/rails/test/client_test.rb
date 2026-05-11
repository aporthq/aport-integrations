require_relative "test_helper"

class APortRailsClientTest < Minitest::Test
  def test_verify_posts_policy_payload_and_returns_result
    stub = stub_request(:post, "https://aport.test/api/verify/policy/finance.payment.refund.v1")
      .with(
        headers: {
          "Authorization" => "Bearer test-api-key",
          "Content-Type" => "application/json"
        },
        body: {
          context: {
            agent_id: "agt_123",
            policy_id: "finance.payment.refund.v1",
            context: { amount: 100 }
          }
        }.to_json
      )
      .to_return(
        status: 200,
        body: {
          verified: true,
          passport: { agent_id: "agt_123", capabilities: ["refund"] },
          message: "ok"
        }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

    result = APortRails::Client.new.verify(
      policy: "finance.payment.refund.v1",
      agent_id: "agt_123",
      context: { amount: 100 }
    )

    assert_requested stub
    assert result.verified?
    assert_equal "agt_123", result.agent_id
    assert_equal ["refund"], result.passport["capabilities"]
  end

  def test_verify_accepts_top_level_decision_allow
    stub_request(:post, "https://aport.test/api/verify/policy/refund")
      .to_return(
        status: 200,
        body: {
          decision: {
            allow: true,
            reasons: [{ code: "ok", message: "allowed" }]
          }
        }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

    result = APortRails::Client.new.verify(policy: "refund", agent_id: "agt_123")

    assert result.verified?
  end

  def test_verify_accepts_nested_data_decision_allow
    stub_request(:post, "https://aport.test/api/verify/policy/refund")
      .to_return(
        status: 200,
        body: {
          verified: "false",
          data: {
            decision: {
              allow: true
            }
          }
        }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

    result = APortRails::Client.new.verify(policy: "refund", agent_id: "agt_123")

    assert result.verified?
  end

  def test_verify_raises_api_error_for_non_success_response
    stub_request(:post, "https://aport.test/api/verify/policy/refund")
      .to_return(status: 403, body: { message: "blocked" }.to_json)

    error = assert_raises(APortRails::APIError) do
      APortRails::Client.new.verify(policy: "refund", agent_id: "agt_123")
    end

    assert_match "blocked", error.message
  end

  def test_verify_requires_policy_and_agent_id
    client = APortRails::Client.new

    assert_raises(APortRails::ConfigurationError) do
      client.verify(policy: "", agent_id: "agt_123")
    end

    assert_raises(APortRails::ConfigurationError) do
      client.verify(policy: "refund", agent_id: "")
    end
  end
end
