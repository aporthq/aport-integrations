require "rails/railtie"

module APortRails
  class Railtie < Rails::Railtie
    initializer "aport_rails.controller_helpers" do
      ActiveSupport.on_load(:action_controller) do
        include APortRails::ControllerHelpers
      end
    end
  end
end
