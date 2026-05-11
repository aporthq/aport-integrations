module APortRails
  class Configuration
    attr_accessor :api_key, :base_url, :open_timeout, :read_timeout, :strict

    def initialize
      @api_key = ENV["APORT_API_KEY"]
      @base_url = ENV.fetch("APORT_BASE_URL", "https://aport.io")
      @open_timeout = 2
      @read_timeout = 5
      @strict = true
    end
  end
end
