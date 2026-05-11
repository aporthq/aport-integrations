module APort
  module Rails
    class Configuration
      DEFAULT_BASE_URL = "https://api.aport.io"
      DEFAULT_AGENT_HEADER = "HTTP_X_AGENT_ID"
      DEFAULT_ALTERNATE_AGENT_HEADER = "HTTP_X_APORT_AGENT_ID"

      attr_accessor :api_key,
                    :base_url,
                    :timeout,
                    :open_timeout,
                    :agent_id_header,
                    :alternate_agent_id_header,
                    :default_context,
                    :raise_on_missing_agent,
                    :logger

      def initialize
        @api_key = ENV["APORT_API_KEY"]
        @base_url = ENV.fetch("APORT_BASE_URL", DEFAULT_BASE_URL)
        @timeout = 5
        @open_timeout = 2
        @agent_id_header = DEFAULT_AGENT_HEADER
        @alternate_agent_id_header = DEFAULT_ALTERNATE_AGENT_HEADER
        @default_context = {}
        @raise_on_missing_agent = true
        @logger = nil
      end

      def merge_context(context)
        default_context.merge(context || {})
      end
    end
  end
end
