module APortRails
  class Error < StandardError; end
  class ConfigurationError < Error; end
  class APIError < Error; end
  class NetworkError < Error; end
end
