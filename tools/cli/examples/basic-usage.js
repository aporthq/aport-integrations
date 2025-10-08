#!/usr/bin/env node

/**
 * Basic usage example for APort CLI
 * This demonstrates how to use the APortClient directly
 */

const APortClient = require("../src/client");

async function basicExample() {
  console.log("🛡️ APort CLI - Basic Usage Example\n");

  // Initialize client
  const client = new APortClient();

  try {
    // Example 1: Verify a refund bot
    console.log("1. Verifying refund bot...");
    const verifyResult = await client.verify(
      "finance.payment.refund.v1",
      "agt_inst_refund_bot_123",
      {
        amount: 50,
        currency: "USD",
      }
    );
    console.log("Result:", verifyResult.verified ? "✅ Verified" : "❌ Failed");
    console.log("Passport:", verifyResult.passport?.name || "N/A");
    console.log("");

    // Example 2: Create a new passport
    console.log("2. Creating new passport...");
    const passportData = {
      name: "Example Bot",
      role: "Example Role",
      description: "A bot created via basic example",
      capabilities: [
        { id: "payments.refund", params: {} },
        { id: "data.export", params: {} },
      ],
      limits: {
        refund_amount_max_per_tx: 100,
        refund_amount_daily_cap: 500,
        max_rows_per_export: 10000,
        allow_pii: false,
      },
      regions: ["US"],
      contact: "example@test.com",
      controller_type: "person",
      status: "active",
      links: {
        homepage: "https://aport.io",
        repo: "https://github.com/aporthq/aport-integrations",
      },
      categories: ["example", "test"],
      framework: ["APort CLI"],
    };

    const createResult = await client.createPassport(passportData);
    console.log("Created passport:", createResult.agent_id);
    console.log("Name:", createResult.name);
    console.log("");

    // Example 3: Get passport information
    console.log("3. Getting passport information...");
    const getResult = await client.getPassport(createResult.agent_id);
    console.log("Retrieved passport:", getResult.name);
    console.log(
      "Capabilities:",
      getResult.capabilities?.map((c) => c.id).join(", ") || "None"
    );
    console.log("");

    // Example 4: Verify against specific policy
    console.log("4. Verifying against specific policy...");
    const policyResult = await client.verifyPolicy(
      "data.export.v1",
      createResult.agent_id,
      {
        rows: 1000,
        dataset: "users",
      }
    );
    console.log(
      "Policy verification:",
      policyResult.verified ? "✅ Verified" : "❌ Failed"
    );
    console.log("");

    console.log("🎉 Basic example completed successfully!");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

// Run the example
if (require.main === module) {
  basicExample();
}

module.exports = { basicExample };
