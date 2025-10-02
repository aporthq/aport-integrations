#!/usr/bin/env node

/**
 * Advanced usage example for APort CLI
 * This demonstrates error handling, batch operations, and complex scenarios
 */

const APortClient = require("../src/client");

async function advancedExample() {
  console.log("🛡️ APort CLI - Advanced Usage Example\n");

  const client = new APortClient();

  try {
    // Example 1: Batch verification with different policies
    console.log("1. Batch verification with multiple policies...");
    const policies = [
      { policy: "payments.refund.v1", context: { amount: 50 } },
      { policy: "data.export.v1", context: { rows: 1000 } },
      { policy: "repo.v1", context: { action: "merge" } },
    ];

    const agentId = "agt_inst_refund_bot_123";
    const results = [];

    for (const { policy, context } of policies) {
      try {
        const result = await client.verify(policy, agentId, context);
        results.push({ policy, verified: result.verified, success: true });
        console.log(`  ${policy}: ${result.verified ? "✅" : "❌"}`);
      } catch (error) {
        results.push({
          policy,
          verified: false,
          success: false,
          error: error.message,
        });
        console.log(`  ${policy}: ❌ (${error.message})`);
      }
    }

    const successCount = results.filter((r) => r.success && r.verified).length;
    console.log(
      `\nBatch verification: ${successCount}/${policies.length} successful\n`
    );

    // Example 2: Error handling and retry logic
    console.log("2. Error handling and retry logic...");
    const retryVerify = async (policy, agentId, context, maxRetries = 3) => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const result = await client.verify(policy, agentId, context);
          return { success: true, result, attempts: attempt };
        } catch (error) {
          console.log(
            `  Attempt ${attempt}/${maxRetries} failed: ${error.message}`
          );
          if (attempt === maxRetries) {
            return { success: false, error: error.message, attempts: attempt };
          }
          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }
    };

    const retryResult = await retryVerify("payments.refund.v1", agentId, {
      amount: 100,
    });
    console.log(
      `Retry result: ${retryResult.success ? "✅" : "❌"} (${
        retryResult.attempts
      } attempts)\n`
    );

    // Example 3: Passport lifecycle management
    console.log("3. Passport lifecycle management...");

    // Create a test passport
    const testPassport = {
      name: "Advanced Test Bot",
      role: "Advanced Test Role",
      description: "A bot for advanced testing scenarios",
      capabilities: [
        { id: "payments.refund", params: {} },
        { id: "data.export", params: {} },
        { id: "repo.merge", params: {} },
      ],
      limits: {
        refund_amount_max_per_tx: 200,
        refund_amount_daily_cap: 1000,
        max_rows_per_export: 50000,
        allow_pii: true,
      },
      regions: ["US", "CA"],
      contact: "advanced@test.com",
      controller_type: "person",
      status: "active",
      links: {
        homepage: "https://aport.io",
        repo: "https://github.com/aporthq/aport-integrations",
      },
      categories: ["advanced", "test"],
      framework: ["APort CLI"],
    };

    const createdPassport = await client.createPassport(testPassport);
    console.log(`Created passport: ${createdPassport.agent_id}`);

    // Verify the new passport
    const verifyNewPassport = await client.verify(
      "payments.refund.v1",
      createdPassport.agent_id,
      {
        amount: 150,
      }
    );
    console.log(`Verification: ${verifyNewPassport.verified ? "✅" : "❌"}`);

    // Get passport details
    const passportDetails = await client.getPassport(createdPassport.agent_id);
    console.log(`Passport name: ${passportDetails.name}`);
    console.log(
      `Capabilities: ${passportDetails.capabilities
        ?.map((c) => c.id)
        .join(", ")}`
    );
    console.log(`Limits: ${JSON.stringify(passportDetails.limits, null, 2)}`);

    // Suspend the passport
    const suspendResult = await client.suspendPassport(
      createdPassport.agent_id,
      "Advanced test completed"
    );
    console.log(`Suspension: ${suspendResult.success ? "✅" : "❌"}\n`);

    // Example 4: Policy pack exploration
    console.log("4. Policy pack exploration...");
    try {
      const policyPacks = await client.listPolicyPacks();
      console.log(`Available policy packs: ${policyPacks.length}`);

      // Get details for a specific policy pack
      const refundPolicy = await client.getPolicyPack("payments.refund.v1");
      console.log(`Refund policy: ${refundPolicy.name || "Unknown"}`);
      console.log(
        `Description: ${refundPolicy.description || "No description"}`
      );
    } catch (error) {
      console.log(`Policy exploration failed: ${error.message}`);
    }

    console.log("\n🎉 Advanced example completed successfully!");
  } catch (error) {
    console.error("❌ Fatal error:", error.message);
    process.exit(1);
  }
}

// Run the example
if (require.main === module) {
  advancedExample();
}

module.exports = { advancedExample };
