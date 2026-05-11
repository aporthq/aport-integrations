require "aport/rails/version"
require "aport/rails/configuration"
require "aport/rails/client"
require "aport/rails/middleware"
require "aport/rails/controller_concern"
require "aport/rails/engine" if defined?(::Rails)

module APort
  module Rails
    class << self
      def configuration
        @configuration ||= Configuration.new
      end

      def configure
        yield(configuration)
        @client = nil
      end

      def client
        @client ||= Client.new(configuration)
      end

      def reset!
        @configuration = Configuration.new
        @client = nil
      end
    end
  end
end
