const APort = require("./nodes/APort/APort.node.js");
const {
  credentialClass: APortApi,
} = require("./credentials/APortApi.credentials.js");

module.exports = {
  nodes: {
    APort,
  },
  credentials: {
    APortApi,
  },
};
