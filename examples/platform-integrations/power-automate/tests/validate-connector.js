const fs = require("fs");
const path = require("path");

const connectorRoot = path.resolve(__dirname, "..");
const apiDefinitionPath = path.join(connectorRoot, "apiDefinition.swagger.json");
const apiPropertiesPath = path.join(connectorRoot, "apiProperties.json");
const workflowPath = path.join(
  connectorRoot,
  "examples",
  "verify-policy-workflow.json"
);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const apiDefinition = readJson(apiDefinitionPath);
const apiProperties = readJson(apiPropertiesPath);
const workflow = readJson(workflowPath);

assert(apiDefinition.swagger === "2.0", "connector must use Swagger 2.0");
assert(apiDefinition.host === "aport.io", "connector host must default to aport.io");
assert(apiDefinition.securityDefinitions.api_key, "api_key security is required");

const operations = Object.values(apiDefinition.paths).flatMap((pathItem) =>
  Object.values(pathItem).map((operation) => operation.operationId)
);

[
  "VerifyPolicy",
  "GetPassport",
  "ListPolicies",
  "GetPolicyPack",
  "SuspendPassport",
].forEach((operationId) => {
  assert(operations.includes(operationId), `missing operation ${operationId}`);
});

const connectionParameters = apiProperties.properties.connectionParameters;
assert(connectionParameters.api_key, "api_key connection parameter is required");

const policies = apiProperties.properties.policyTemplateInstances || [];
assert(
  policies.some(
    (policy) =>
      policy.templateId === "setheader" &&
      policy.parameters["x-ms-apimTemplateParameter.name"] === "Authorization"
  ),
  "Authorization header policy is required"
);

const verifyAction =
  workflow.definition.actions.Verify_policy.inputs.host.operationId;
assert(
  verifyAction === "VerifyPolicy",
  "example workflow must call the VerifyPolicy operation"
);

console.log("Power Automate connector JSON validation passed.");
