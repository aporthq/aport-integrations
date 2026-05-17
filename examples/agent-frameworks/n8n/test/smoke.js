const assert = require("node:assert/strict");

const { APortApi } = require("../credentials/APortApi.credentials");
const {
  APortPolicyCheck,
  normalizeBaseUrl,
  parseContext,
} = require("../nodes/APortPolicyCheck/APortPolicyCheck.node");

const credentials = new APortApi();
const node = new APortPolicyCheck();

assert.equal(credentials.name, "aportApi");
assert.equal(credentials.properties.some((property) => property.name === "apiKey"), true);
assert.equal(credentials.properties.some((property) => property.name === "baseUrl"), true);

assert.equal(node.description.name, "aportPolicyCheck");
assert.equal(node.description.credentials[0].name, "aportApi");
assert.deepEqual(node.description.inputs, ["main"]);
assert.deepEqual(node.description.outputs, ["main"]);
assert.equal(
  node.description.properties.some((property) => property.name === "policyId"),
  true,
);
assert.equal(
  node.description.properties.some((property) => property.name === "agentId"),
  true,
);
assert.deepEqual(parseContext('{"action":"merge"}'), { action: "merge" });
assert.equal(normalizeBaseUrl("https://aport.io/"), "https://aport.io");
assert.throws(() => parseContext("[]"), /JSON object/);

console.log("APort n8n node smoke test passed");
