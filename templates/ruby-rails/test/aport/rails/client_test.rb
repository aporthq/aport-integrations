require "test_helper"

class APortRailsClientTest < Minitest::Test
  def setup
    APort::Rails.reset!
    APort::Rails.configure do |config|
      config.api_key = "test-key"
      config.base_url = "https://api.example.test"
      config.default_context = { source: "test" }
    end
  end

  def test_verify_posts_policy_payload_and_returns_result
    stub = stub_request(:post, "https://api.example.test/api/verify/policy/finance.payment.refund.v1")
      .with(
        headers: { "Authorization" => "Bearer test-key" },
        body: hash_including(
          "agent_id" => "agent-1",
          "policy_id" => "finance.payment.refund.v1",
          "context" => { "source" => "test", "amount" => 42 }
        )
      )
      .to_return(status: 200, body: {
        verified: true,
        passport: { agent_id: "agent-1", capabilities: ["refund"] }
      }.to_json, headers: { "Content-Type" => "application/json" })

    result = APort::Rails.client.verify(
      policy: "finance.payment.refund.v1",
      agent_id: "agent-1",
      context: { amount: 42 }
    )

    assert_requested stub
    assert_equal true, result["verified"]
    assert_equal "agent-1", result["agent_id"]
    assert_equal ["refund"], result.dig("passport", "capabilities")
  end

  def test_verify_raises_on_failed_response
    stub_request(:post, "https://api.example.test/api/verify/policy/admin.access")
      .to_return(status: 403, body: { message: "denied" }.to_json, headers: { "Content-Type" => "application/json" })

    error = assert_raises(APort::Rails::VerificationError) do
      APort::Rails.client.verify(policy: "admin.access", agent_id: "agent-1")
    end

    assert_equal "denied", error.message
  end

  def test_verify_raises_on_unverified_success_payload
    stub_request(:post, "https://api.example.test/api/verify/policy/admin.access")
      .to_return(status: 200, body: { verified: false, message: "policy mismatch" }.to_json, headers: { "Content-Type" => "application/json" })

    error = assert_raises(APort::Rails::VerificationError) do
      APort::Rails.client.verify(policy: "admin.access", agent_id: "agent-1")
    end

    assert_equal "policy mismatch", error.message
  end
end
