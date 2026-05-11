require "test_helper"

class APortRailsConfigurationTest < Minitest::Test
  def setup
    APort::Rails.reset!
  end

  def test_defaults_read_environment_fallbacks
    configuration = APort::Rails.configuration

    assert_equal "https://api.aport.io", configuration.base_url
    assert_equal "HTTP_X_AGENT_ID", configuration.agent_id_header
    assert_equal "HTTP_X_APORT_AGENT_ID", configuration.alternate_agent_id_header
    assert_equal({}, configuration.default_context)
  end

  def test_configure_yields_configuration
    APort::Rails.configure do |config|
      config.api_key = "secret"
      config.default_context = { app: "test" }
    end

    assert_equal "secret", APort::Rails.configuration.api_key
    assert_equal({ app: "test", action: "refund" }, APort::Rails.configuration.merge_context(action: "refund"))
  end
end
