require "rails/engine"
require "aport/rails/controller_concern"

module APort
  module Rails
    class Engine < ::Rails::Engine
      initializer "aport_rails.controller_concern" do
        ActiveSupport.on_load(:action_controller) do
          include APort::Rails::ControllerConcern
        end
      end
    end
  end
end
