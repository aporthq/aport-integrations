$LOAD_PATH.unshift File.expand_path("../lib", __dir__)

ENV["RAILS_ENV"] = "test"

require "minitest/autorun"
require "webmock/minitest"
require "aport_rails"

APortRails.reset_configuration!
APortRails.configure do |config|
  config.api_key = "test-api-key"
  config.base_url = "https://aport.test"
end
