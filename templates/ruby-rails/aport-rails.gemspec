Gem::Specification.new do |spec|
  spec.name = "aport-rails"
  spec.version = "0.1.0"
  spec.authors = ["APort Community"]
  spec.email = ["community@aport.io"]

  spec.summary = "APort verification helpers for Rails applications."
  spec.description = "Rails middleware, controller helpers, and generators for enforcing APort policy verification."
  spec.homepage = "https://github.com/aporthq/aport-integrations"
  spec.license = "MIT"
  spec.required_ruby_version = ">= 3.0"

  spec.metadata = {
    "homepage_uri" => spec.homepage,
    "source_code_uri" => spec.homepage,
    "bug_tracker_uri" => "https://github.com/aporthq/aport-integrations/issues",
    "documentation_uri" => "https://aport.io/docs"
  }

  spec.files = Dir["lib/**/*", "README.md", "LICENSE*"]
  spec.require_paths = ["lib"]

  spec.add_dependency "faraday", ">= 1.10", "< 3.0"
  spec.add_dependency "rails", ">= 6.1", "< 8.0"

  spec.add_development_dependency "minitest", "~> 5.0"
  spec.add_development_dependency "rack-test", "~> 2.1"
  spec.add_development_dependency "rake", ">= 13.0"
  spec.add_development_dependency "webmock", "~> 3.0"
end
