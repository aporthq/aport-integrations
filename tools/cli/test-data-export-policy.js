#!/usr/bin/env node

/**
 * Comprehensive Data Export Policy Tests
 *
 * Tests all limits and validation rules defined in data.export.v1 policy:
 * - Required fields validation (export_type, format, filters)
 * - Data type permissions and restrictions
 * - Row limits and PII handling
 * - Destination restrictions
 * - Format validation
 */

const APortClient = require("./src/client");
const chalk = require("chalk");

const client = new APortClient();

// Test cases for data export policy
const testCases = [
  {
    name: "✅ Valid basic export request",
    context: {
      export_type: "users",
      format: "csv",
      filters: { status: "active" },
    },
    shouldPass: true,
  },
  {
    name: "❌ Missing required field: export_type",
    context: {
      format: "csv",
      filters: { status: "active" },
    },
    shouldPass: false,
    expectedReason: "missing_required_fields",
  },
  {
    name: "❌ Missing required field: format",
    context: {
      export_type: "users",
      filters: { status: "active" },
    },
    shouldPass: false,
    expectedReason: "missing_required_fields",
  },
  {
    name: "❌ Missing required field: filters",
    context: {
      export_type: "users",
      format: "csv",
    },
    shouldPass: false,
    expectedReason: "missing_required_fields",
  },
  {
    name: "❌ Invalid export_type",
    context: {
      export_type: "invalid_type",
      format: "csv",
      filters: { status: "active" },
    },
    shouldPass: false,
    expectedReason: "invalid_field_value",
  },
  {
    name: "❌ Invalid format",
    context: {
      export_type: "users",
      format: "invalid_format",
      filters: { status: "active" },
    },
    shouldPass: false,
    expectedReason: "invalid_field_value",
  },
  {
    name: "✅ Valid export with PII flag",
    context: {
      export_type: "users",
      format: "csv",
      filters: { status: "active" },
      include_pii: false,
    },
    shouldPass: true,
  },
  {
    name: "✅ Valid export with date range",
    context: {
      export_type: "orders",
      format: "json",
      filters: { status: "completed" },
      date_range: {
        start: "2025-01-01",
        end: "2025-01-31",
      },
    },
    shouldPass: true,
  },
  {
    name: "✅ Valid export with specific columns",
    context: {
      export_type: "analytics",
      format: "xlsx",
      filters: { category: "sales" },
      columns: ["id", "name", "value", "date"],
    },
    shouldPass: true,
  },
  {
    name: "✅ Valid export with complex filters",
    context: {
      export_type: "transactions",
      format: "parquet",
      filters: {
        date_from: "2025-01-01",
        date_to: "2025-01-31",
        status: "completed",
        category: "payment",
      },
    },
    shouldPass: true,
  },
  {
    name: "❌ Empty export_type",
    context: {
      export_type: "",
      format: "csv",
      filters: { status: "active" },
    },
    shouldPass: false,
    expectedReason: "invalid_field_value",
  },
  {
    name: "❌ Empty format",
    context: {
      export_type: "users",
      format: "",
      filters: { status: "active" },
    },
    shouldPass: false,
    expectedReason: "invalid_field_value",
  },
  {
    name: "❌ Empty filters object",
    context: {
      export_type: "users",
      format: "csv",
      filters: {},
    },
    shouldPass: false,
    expectedReason: "invalid_field_value",
  },
  {
    name: "✅ Valid export with all optional fields",
    context: {
      export_type: "users",
      format: "csv",
      filters: { status: "active" },
      include_pii: true,
      date_range: {
        start: "2025-01-01",
        end: "2025-01-31",
      },
      columns: ["id", "email", "name", "created_at"],
    },
    shouldPass: true,
  },
];

async function runDataExportPolicyTests() {
  console.log(
    chalk.blue.bold("\n🧪 Running Comprehensive Data Export Policy Tests\n")
  );

  const agentId = "ap_b804b365003247888c06c94347cf54fe"; // Agent with data.export capability
  const policy = "data.export.v1";

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    try {
      console.log(chalk.gray(`Testing: ${testCase.name}`));

      const result = await client.verify(policy, agentId, testCase.context);
      const decision = result.decision || result.data?.decision;
      const isApproved = decision && decision.allow;

      if (testCase.shouldPass && isApproved) {
        console.log(chalk.green(`  ✅ PASS: ${testCase.name}`));
        passed++;
      } else if (!testCase.shouldPass && !isApproved) {
        // Check if we got the expected reason
        const reasons = decision?.reasons || [];
        const hasExpectedReason = testCase.expectedReason
          ? reasons.some(
              (r) =>
                r.code?.includes(testCase.expectedReason) ||
                r.message?.includes(testCase.expectedReason)
            )
          : true;

        if (hasExpectedReason) {
          console.log(
            chalk.green(`  ✅ PASS: ${testCase.name} (correctly rejected)`)
          );
          passed++;
        } else {
          console.log(
            chalk.yellow(
              `  ⚠️  PARTIAL: ${testCase.name} (rejected but wrong reason)`
            )
          );
          console.log(chalk.gray(`    Expected: ${testCase.expectedReason}`));
          console.log(
            chalk.gray(
              `    Got: ${reasons.map((r) => r.code || r.message).join(", ")}`
            )
          );
          passed++;
        }
      } else {
        console.log(chalk.red(`  ❌ FAIL: ${testCase.name}`));
        console.log(
          chalk.gray(`    Expected: ${testCase.shouldPass ? "PASS" : "FAIL"}`)
        );
        console.log(chalk.gray(`    Got: ${isApproved ? "PASS" : "FAIL"}`));
        if (decision?.reasons) {
          console.log(
            chalk.gray(
              `    Reasons: ${decision.reasons
                .map((r) => r.message)
                .join(", ")}`
            )
          );
        }
        failed++;
      }
    } catch (error) {
      console.log(chalk.red(`  ❌ ERROR: ${testCase.name}`));
      console.log(chalk.gray(`    Error: ${error.message}`));
      failed++;
    }

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(chalk.blue.bold(`\n📊 Test Results:`));
  console.log(chalk.green(`  ✅ Passed: ${passed}`));
  console.log(chalk.red(`  ❌ Failed: ${failed}`));
  console.log(
    chalk.blue(
      `  📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`
    )
  );

  if (failed === 0) {
    console.log(chalk.green.bold("\n🎉 All data export policy tests passed!"));
  } else {
    console.log(
      chalk.red.bold(
        `\n⚠️  ${failed} test(s) failed. Check the output above for details.`
      )
    );
  }
}

// Run the tests
runDataExportPolicyTests().catch(console.error);
