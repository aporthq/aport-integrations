# frozen_string_literal: true

APort::Rails.configure do |config|
  config.api_key = ENV["APORT_API_KEY"]
  config.base_url = ENV.fetch("APORT_BASE_URL", "https://api.aport.io")

  # Add values that should be sent with every verification request.
  config.default_context = {
    source: "rails",
    environment: Rails.env
  }

  # Header lookup order is X-Agent-ID, then X-APort-Agent-ID.
  # config.raise_on_missing_agent = true
end
