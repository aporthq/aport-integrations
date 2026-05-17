class APortApi {
  constructor() {
    this.name = "aportApi";
    this.displayName = "APort API";
    this.documentationUrl = "https://aport.io/docs";
    this.properties = [
      {
        displayName: "API Key",
        name: "apiKey",
        type: "string",
        typeOptions: {
          password: true,
        },
        default: "",
        required: false,
        description:
          "Bearer token for APort API calls. Some verification endpoints may be usable without a key.",
      },
      {
        displayName: "Base URL",
        name: "baseUrl",
        type: "string",
        default: "https://aport.io",
        required: true,
        description: "APort API base URL.",
      },
    ];
    this.authenticate = {
      type: "generic",
      properties: {
        headers: {
          Authorization: "=Bearer {{$credentials.apiKey}}",
        },
      },
    };
    this.test = {
      request: {
        baseURL: "={{$credentials.baseUrl}}",
        url: "/api/policies",
        method: "GET",
      },
    };
  }
}

module.exports = {
  APortApi,
};
