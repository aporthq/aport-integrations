"use strict";

class AportApi {
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
          "APort API key. Some verification endpoints can be used without a key, but authenticated requests should provide one.",
      },
      {
        displayName: "Base URL",
        name: "baseUrl",
        type: "string",
        default: "https://aport.io",
        required: true,
        description: "Base URL for the APort API.",
      },
      {
        displayName: "Request Timeout (ms)",
        name: "timeout",
        type: "number",
        default: 10000,
        required: true,
        description: "Maximum time to wait for APort API responses.",
      },
    ];
  }
}

module.exports = { AportApi };
