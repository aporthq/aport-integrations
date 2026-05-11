$LOAD_PATH.unshift File.expand_path("../lib", __dir__)

require "minitest/autorun"
require "webmock/minitest"
require "rack/mock"
require "aport/rails"

class FakeClient
  attr_reader :calls

  def initialize(result: { "verified" => true, "passport" => { "agent_id" => "agent-1" } }, error: nil)
    @result = result
    @error = error
    @calls = []
  end

  def verify(policy:, agent_id:, context: {})
    @calls << { policy: policy, agent_id: agent_id, context: context }
    raise @error if @error

    @result
  end
end
