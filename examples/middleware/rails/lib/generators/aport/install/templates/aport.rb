APortRails.configure do |config|
  config.api_key = ENV["APORT_API_KEY"]
  config.base_url = ENV.fetch("APORT_BASE_URL", "https://aport.io")
  config.open_timeout = 2
  config.read_timeout = 5
  config.strict = true
end
