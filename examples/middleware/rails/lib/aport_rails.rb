require "aport_rails/client"
require "aport_rails/configuration"
require "aport_rails/controller_helpers"
require "aport_rails/errors"
require "aport_rails/version"

begin
  require "aport_rails/railtie"
rescue LoadError
  nil
end

module APortRails
  class << self
    attr_writer :configuration

    def configuration
      @configuration ||= Configuration.new
    end

    def configure
      yield(configuration)
    end

    def reset_configuration!
      @configuration = Configuration.new
    end
  end
end
