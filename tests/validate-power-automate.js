const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const connectorDir = path.join(
  root,
  "examples",
  "platform-integrations",
  "power-automate"
);

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(connectorDir, file), "utf8"));
}

const swagger = readJson("apiDefinition.swagger.json");
const properties = readJson("apiProperties.json");
const flow = readJson(path.join("examples", "refund-approval-flow.json"));

assert.equal(swagger.swagger, "2.0");
assert.equal(swagger.host, "aport.io");
assert.ok(swagger.paths["/verify"].post, "VerifyAction path is missing");
assert.equal(swagger.paths["/verify"].post.operationId, "VerifyAction");
assert.deepEqual(
  swagger.definitions.VerifyActionRequest.required,
  ["policy_pack", "context"]
);
assert.ok(
  swagger.securityDefinitions.api_key,
  "API key security definition is missing"
);

assert.ok(
  properties.properties.connectionParameters.api_key,
  "apiProperties is missing the API key connection parameter"
);
assert.equal(
  properties.properties.connectionParameters.api_key.type,
  "securestring"
);

assert.equal(flow.actions[0].operationId, "VerifyAction");
assert.equal(flow.actions[0].body.policy_pack, "finance.payment.refund.v1");

console.log("Power Automate connector files are valid.");
