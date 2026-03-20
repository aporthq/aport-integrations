# frozen_string_literal: true

require "aport/rails/version"
require "aport/rails/configuration"
require "aport/rails/client"
require "aport/rails/middleware"
require "aport/rails/controller_concern"
require "aport/rails/engine"

module Aport
  module Rails
    class << self
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
end
