class APortApi {
  name = "aportApi";
  displayName = "APort API";
  documentationUrl = "https://docs.aport.io";
  properties = [
    {
      displayName: "API Key",
      name: "apiKey",
      type: "string",
      typeOptions: {
        password: true,
      },
      default: "",
      description:
        "Your APort API key (optional for verification, required for passport creation)",
    },
    {
      displayName: "Base URL",
      name: "baseUrl",
      type: "string",
      default: "https://api.aport.io",
      description: "The base URL for the APort API",
    },
  ];
}

module.exports = { APortApi };
