/**
 * Basic usage example — verify agents and check passports
 * without running a full Discord bot.
 *
 * Usage: node examples/basic-usage.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const APortClient = require("../src/client");

async function main() {
  console.log("APort Discord Bot — Basic Usage Example\n");

  const client = new APortClient();

  // Sample agent IDs (these are the public test agents from APort CLI)
  const sampleAgents = {
    refundBot: "ap_a2d10232c6534523812423eec8a1425c",
    dataExporter: "ap_b804b365003247888c06c94347cf54fe",
    prMerger: "ap_4343a3f0c90948a59ee1c05bf019f9ac",
  };

  // --- Example 1: Verify refund bot ---
  console.log("1. Verifying refund bot...");
  try {
    const result = await client.verify(
      "finance.payment.refund.v1",
      sampleAgents.refundBot,
      { amount: 50, currency: "USD" }
    );
    const decision = result.data?.decision || result.decision;
    const approved = decision?.allow;
    console.log(`   Result: ${approved ? "APPROVED" : "DENIED"}`);
    if (decision?.reasons) {
      decision.reasons.forEach((r) => console.log(`   - ${r.message}`));
    }
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  // --- Example 2: Verify data exporter ---
  console.log("\n2. Verifying data exporter...");
  try {
    const result = await client.verify(
      "data.export.v1",
      sampleAgents.dataExporter,
      { rows: 5000, dataset: "users" }
    );
    const decision = result.data?.decision || result.decision;
    const approved = decision?.allow;
    console.log(`   Result: ${approved ? "APPROVED" : "DENIED"}`);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  // --- Example 3: Get passport ---
  console.log("\n3. Fetching passport for refund bot...");
  try {
    const passport = await client.getPassport(sampleAgents.refundBot);
    console.log(`   Name: ${passport.name || "N/A"}`);
    console.log(`   Status: ${passport.status || "N/A"}`);
    if (passport.capabilities) {
      const caps = passport.capabilities.map((c) =>
        typeof c === "string" ? c : c.id
      );
      console.log(`   Capabilities: ${caps.join(", ")}`);
    }
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  // --- Example 4: List policies ---
  console.log("\n4. Listing available policies...");
  try {
    const policies = await client.listPolicies();
    if (Array.isArray(policies)) {
      policies.forEach((p) =>
        console.log(`   - ${p.id || p.policy_id}: ${p.name || p.description || "N/A"}`)
      );
    } else {
      console.log("   No policies returned (API may require authentication)");
    }
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  console.log("\nBasic example completed!");
}

main().catch(console.error);
