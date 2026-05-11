require "rails/generators"

module APort
  module Generators
    class InstallGenerator < ::Rails::Generators::Base
      source_root File.expand_path("templates", __dir__)

      desc "Creates an APort initializer for Rails applications."

      def copy_initializer
        template "aport.rb", "config/initializers/aport.rb"
      end

      def show_next_steps
        say "APort Rails initializer created.", :green
        say "Set APORT_API_KEY and protect controllers with require_aport_policy.", :blue
      end
    end
  end
end
