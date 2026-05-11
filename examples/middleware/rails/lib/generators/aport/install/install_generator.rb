require "rails/generators"

module Aport
  module Generators
    class InstallGenerator < Rails::Generators::Base
      source_root File.expand_path("templates", __dir__)

      desc "Creates an APort Rails initializer."

      def copy_initializer
        template "aport.rb", "config/initializers/aport.rb"
      end
    end
  end
end
