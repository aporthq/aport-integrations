# frozen_string_literal: true

module Aport
  module Rails
    class Engine < ::Rails::Engine
      isolate_namespace Aport::Rails

      initializer "aport_rails.middleware" do |app|
        if Aport.configuration.default_policy_id
          app.config.middleware.use Aport::Rails::Middleware
        end
      end

      initializer "aport_rails.controller_concern" do
        ActiveSupport.on_load(:action_controller) do
          include Aport::Rails::ControllerConcern
        end
      end
    end
  end
end
