# frozen_string_literal: true

require 'net/http'
require 'json'
require 'uri'

module APort
  VERSION = '1.0.0'
  
  class Error < StandardError; end
  class VerificationError < Error; end
  
  # Configuration
  class Configuration
    attr_accessor :api_key, :project_id, :enabled, :exempt_paths, :timeout
    
    def initialize
      @api_key = nil
      @project_id = 'default'
      @enabled = true
      @exempt_paths = []
      @timeout = 5
    end
  end
  
  # Client for APort verification
  class Client
    attr_reader :config
    
    def initialize
      @config = Configuration.new
      yield(@config) if block_given?
    end
    
    def verify(action:, actor_id:, actor_name:, context: {})
      return { 'allow' => true, 'reasons' => ['Verification disabled'] } unless @config.enabled
      return { 'allow' => true, 'reasons' => ['No API key'] } if @config.api_key.nil? || @config.api_key.empty?
      
      uri = URI.parse('https://api.aport.io/verify')
      request = Net::HTTP::Post.new(uri)
      request['Content-Type'] = 'application/json'
      request['Authorization'] = "Bearer #{@config.api_key}"
      
      body = {
        action: action,
        actor: {
          id: actor_id.to_s,
          name: actor_name.to_s,
          owner: 'rails'
        },
        context: {
          data: context
        },
        projectId: @config.project_id
      }
      
      request.body = body.to_json
      
      begin
        http = Net::HTTP.new(uri.host, uri.port)
        http.use_ssl = true
        http.open_timeout = @config.timeout
        http.read_timeout = @config.timeout
        
        response = http.request(request)
        
        if response.code == '200'
          JSON.parse(response.body)
        else
          { 'allow' => true, 'reasons' => ["API error: #{response.code}"] }
        end
      rescue => e
        { 'allow' => true, 'reasons' => ["Verification failed: #{e.message}"] }
      end
    end
  end
  
  # Rails middleware
  class Middleware
    def initialize(app)
      @app = app
      @client = Client.new do |config|
        config.api_key = ENV['APORT_API_KEY']
        config.project_id = ENV['APORT_PROJECT_ID'] || 'default'
        config.enabled = ENV.fetch('APORT_ENABLED', true)
        config.exempt_paths = ENV.fetch('APORT_EXEMPT_PATHS', '').split(',')
      end
    end
    
    def call(env)
      request = Rack::Request.new(env)
      
      # Skip exempt paths
      if exempt?(request.path)
        return @app.call(env)
      end
      
      # Skip if disabled
      return @app.call(env) unless @client.config.enabled
      
      # Verify request
      result = @client.verify(
        action: "rails_#{request.request_method.downcase}",
        actor_id: get_actor_id(request),
        actor_name: get_actor_name(request),
        context: {
          method: request.request_method,
          path: request.path,
          ip: request.ip,
          user_agent: request.user_agent
        }
      )
      
      if result['allow']
        @app.call(env)
      else
        [403, { 'Content-Type' => 'application/json' }, [{ error: 'Access Denied', reasons: result['reasons'] }.to_json]]
      end
    end
    
    private
    
    def exempt?(path)
      @client.config.exempt_paths.any? { |p| path.start_with?(p) }
    end
    
    def get_actor_id(request)
      if request.env['warden']&.user
        request.env['warden'].user.id
      elsif request.env['current_user']
        request.env['current_user'].id
      else
        "anonymous_#{request.ip}"
      end
    end
    
    def get_actor_name(request)
      if request.env['warden']&.user
        request.env['warden'].user.name || request.env['warden'].user.email || 'user'
      elsif request.env['current_user']
        request.env['current_user'].name || 'user'
      else
        'anonymous'
      end
    end
  end
end

# Rails integration
require 'aport/railtie' if defined?(Rails)
