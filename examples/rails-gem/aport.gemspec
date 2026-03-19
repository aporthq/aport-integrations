# frozen_string_literal: true

Gem::Specification.new do |spec|
  spec.name          = 'aport'
  spec.version       = APort::VERSION
  spec.authors       = ['APort Team']
  spec.email         = ['hello@aport.io']
  spec.summary       = 'APort verification middleware for Rails'
  spec.description   = 'Ruby gem for APort verification in Rails applications'
  spec.homepage      = 'https://github.com/aporthq/aport-integrations'
  spec.license       = 'MIT'
  
  spec.files         = Dir['{lib}/**/*.rb', '*.md']
  spec.require_paths = ['lib']
  
  spec.required_ruby_version = '>= 2.7'
  
  spec.add_runtime_dependency 'railties', '>= 5.0'
  
  spec.add_development_dependency 'bundler', '~> 2.0'
end
