require_relative "test_helper"
require "rails/generators/test_case"
require "generators/aport/install/install_generator"

class APortInstallGeneratorTest < Rails::Generators::TestCase
  tests Aport::Generators::InstallGenerator
  destination File.expand_path("tmp/generator", __dir__)

  setup :prepare_destination

  def test_creates_initializer
    run_generator

    assert_file "config/initializers/aport.rb", /APortRails.configure/
    assert_file "config/initializers/aport.rb", /APORT_API_KEY/
  end
end
