require_relative "lib/aport_rails/version"

Gem::Specification.new do |spec|
  spec.name = "aport_rails"
  spec.version = APortRails::VERSION
  spec.authors = ["APort Community"]
  spec.email = ["opensource@aport.io"]

  spec.summary = "Rails middleware for APort policy verification."
  spec.description = "Protect Rails controller actions with APort agent identity and policy verification."
  spec.homepage = "https://github.com/aporthq/aport-integrations"
  spec.license = "MIT"
  spec.required_ruby_version = ">= 3.0"

  spec.metadata["homepage_uri"] = spec.homepage
  spec.metadata["source_code_uri"] = "#{spec.homepage}/tree/main/examples/middleware/rails"

  spec.files = Dir[
    "lib/**/*",
    "README.md",
    "LICENSE*",
    "examples/**/*"
  ]
  spec.require_paths = ["lib"]

  spec.add_dependency "actionpack", ">= 6.1", "< 8.0"
  spec.add_dependency "activesupport", ">= 6.1", "< 8.0"
  spec.add_dependency "railties", ">= 6.1", "< 8.0"

  spec.add_development_dependency "minitest", "~> 5.20"
  spec.add_development_dependency "rake", "~> 13.0"
  spec.add_development_dependency "tzinfo-data", "~> 1.2024"
  spec.add_development_dependency "webmock", "~> 3.19"
end
