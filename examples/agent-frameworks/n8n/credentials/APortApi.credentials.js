class APortApi {
  constructor() {
    this.name = "aportApi";
    this.displayName = "APort API";
    this.documentationUrl = "https://aport.io/docs";
    this.properties = [
      {
        displayName: "Base URL",
        name: "baseUrl",
        type: "string",
        default: "https://api.aport.io",
        placeholder: "https://api.aport.io",
        description: "APort API base URL. Use a sandbox or self-hosted URL when needed.",
      },
      {
        displayName: "API Key",
        name: "apiKey",
        type: "string",
        typeOptions: {
          password: true,
        },
        default: "",
        description: "Optional APort API key. Some verification endpoints may work without it, but authenticated environments should set it.",
      },
      {
        displayName: "Timeout (MS)",
        name: "timeoutMs",
        type: "number",
        default: 800,
        description: "Request timeout passed to the APort Node.js SDK.",
      },
    ];
  }
}

module.exports = {
  APortApi,
};
