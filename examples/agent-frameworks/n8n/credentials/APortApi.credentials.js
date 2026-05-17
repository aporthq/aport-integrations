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
        required: true,
      },
      {
        displayName: "Base URL",
        name: "baseUrl",
        type: "string",
        default: "https://aport.io",
        required: true,
        description: "Base URL for the APort API.",
      },
    ];
  }
}

module.exports = {
  APortApi,
};
