module APort
  module Rails
    module RequestExtractors
      module_function

      def agent_id_from_rack(env, configuration)
        env[configuration.agent_id_header] ||
          env[configuration.alternate_agent_id_header] ||
          extract_query_param(env["QUERY_STRING"], "agent_id")
      end

      def agent_id_from_controller(request, params, configuration)
        header_value(request, "X-Agent-ID") ||
          header_value(request, "X-APort-Agent-ID") ||
          params[:agent_id] ||
          params["agent_id"] ||
          params[:agentId] ||
          params["agentId"]
      end

      def header_value(request, name)
        return nil unless request.respond_to?(:headers)

        request.headers[name]
      end

      def extract_query_param(query_string, key)
        return nil if query_string.nil? || query_string.empty?

        query_string.split("&").each do |part|
          name, value = part.split("=", 2)
          return decode(value) if decode(name) == key
        end
        nil
      end

      def decode(value)
        return nil if value.nil?

        value.tr("+", " ").gsub(/%([0-9a-fA-F]{2})/) { Regexp.last_match(1).to_i(16).chr }
      end
    end
  end
end
