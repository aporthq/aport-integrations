require "test_helper"

class APortRailsControllerConcernTest < Minitest::Test
  FakeHeaders = Struct.new(:values) do
    def [](key)
      values[key]
    end
  end

  FakeRequest = Struct.new(:headers)

  class FakeController
    include APort::Rails::ControllerConcern

    attr_reader :rendered

    def initialize(client:, headers: {}, params: {})
      @client = client
      @request = FakeRequest.new(FakeHeaders.new(headers))
      @params = params
    end

    def request
      @request
    end

    def params
      @params
    end

    def aport_client
      @client
    end

    def render(json:, status:)
      @rendered = { json: json, status: status }
    end
  end

  def setup
    APort::Rails.reset!
  end

  def test_verify_aport_policy_stores_verification_helpers
    client = FakeClient.new
    controller = FakeController.new(client: client, headers: { "X-Agent-ID" => "agent-1" })

    assert_equal true, controller.verify_aport_policy!("finance.payment.refund.v1", context: { amount: 25 })
    assert_equal "agent-1", controller.aport_agent_id
    assert_equal({ "agent_id" => "agent-1" }, controller.aport_passport)
    assert_equal "finance.payment.refund.v1", client.calls.first[:policy]
  end

  def test_verify_aport_policy_renders_error_when_agent_id_missing
    controller = FakeController.new(client: FakeClient.new)

    assert_equal false, controller.verify_aport_policy!("admin.access")
    assert_equal :unauthorized, controller.rendered[:status]
    assert_equal "missing_agent_id", controller.rendered[:json][:error]
  end

  def test_verify_aport_policy_can_be_non_strict
    controller = FakeController.new(client: FakeClient.new)

    assert_equal false, controller.verify_aport_policy!("admin.access", strict: false)
    assert_nil controller.rendered
  end
end
