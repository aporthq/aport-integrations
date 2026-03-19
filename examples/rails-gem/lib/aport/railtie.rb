# frozen_string_literal: true

module APort
  class Railtie < Rails::Railtie
    initializer 'aport.setup' do |app|
      app.config.middleware.use APort::Middleware
    end
    
    config.aport = ActiveSupport::OrderedOptions.new.tap do |config|
      config.api_key = ENV['APORT_API_KEY']
      config.project_id = ENV['APORT_PROJECT_ID'] || 'default'
      config.enabled = ENV.fetch('APORT_ENABLED', true)
      config.exempt_paths = ENV.fetch('APORT_EXEMPT_PATHS', '').split(',')
    end
  end
end
