require("dotenv").config({ path: "../../.env" });
const { APort } = require("./nodes/APort/APort.node.js");

// Mock n8n context
function createMockContext(operation, parameters, credentials = {}) {
  return {
    getInputData: () => [{ json: {} }],
    getNodeParameter: (name, index) => parameters[name],
    getCredentials: async () => credentials,
    continueOnFail: () => false,
  };
}

async function testVerifyPolicy() {
  console.log("\n🧪 Testing Verify Policy...");

  const node = new APort();
  const context = createMockContext("verifyPolicy", {
    operation: "verifyPolicy",
    policyId: "data.export.v1",
    agentId: "ap_testbot123",
    context:
      '{"rows": 1000, "dataset": "users", "idempotency_key": "test-123", "export_type": "csv"}',
  });

  Object.setPrototypeOf(context, Object.getPrototypeOf(node));
  Object.assign(node, context);

  try {
    const result = await node.execute();
    console.log("✅ Success:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.log("❌ Error:", error.message);
    if (error.response) {
      console.log("Response status:", error.response.status);
      console.log(
        "Response data:",
        JSON.stringify(error.response.data, null, 2)
      );
    }
  }
}

async function testListPolicies() {
  console.log("\n🧪 Testing List Policy Packs...");

  const node = new APort();
  const context = createMockContext("listPolicyPacks", {
    operation: "listPolicyPacks",
  });

  Object.setPrototypeOf(context, Object.getPrototypeOf(node));
  Object.assign(node, context);

  try {
    const result = await node.execute();
    console.log("✅ Success:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.log("❌ Error:", error.message);
  }
}

async function runTests() {
  console.log("🚀 Starting APort Node Tests...");
  await testListPolicies();
  await testCreateAndVerify();
  console.log("\n✨ Tests completed!");
}

async function testCreateAndVerify() {
  console.log("\n🧪 Testing Create Passport...");

  const createNode = new APort();
  const createContext = createMockContext(
    "createPassport",
    {
      operation: "createPassport",
      passportData: JSON.stringify({
        name: "Test Bot n8n",
        role: "Test Role",
        description: "A bot created for testing n8n node",
        capabilities: [{ id: "data.export", params: {} }],
        limits: {
          max_rows_per_export: 10000,
          allow_pii: false,
        },
        regions: ["US"],
        contact: "test@example.com",
        controller_type: "person",
        status: "active",
      }),
    },
    {
      apiKey: process.env.APORT_API_KEY,
      baseUrl: process.env.APORT_BASE_URL || "https://api.aport.io",
    }
  );

  Object.setPrototypeOf(createContext, Object.getPrototypeOf(createNode));
  Object.assign(createNode, createContext);

  try {
    const createResult = await createNode.execute();
    console.log(
      "  ✅ Full passport response:",
      JSON.stringify(createResult, null, 2)
    );
  } catch (error) {
    console.log("  ❌ Error:", error.message);
    if (error.response) {
      console.log(
        "  Response data:",
        JSON.stringify(error.response.data, null, 2)
      );
    }
  }
}

runTests();
