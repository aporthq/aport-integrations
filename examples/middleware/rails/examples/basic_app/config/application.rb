require_relative "boot"

require "rails"
require "action_controller/railtie"
require "aport_rails"

module BasicApp
  class Application < Rails::Application
    config.load_defaults 7.0
    config.eager_load = false
    config.secret_key_base = ENV.fetch("SECRET_KEY_BASE", "development-secret-key-base")
  end
end
