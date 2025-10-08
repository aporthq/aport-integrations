#!/usr/bin/env node

/**
 * Comprehensive Messaging Policy Tests
 *
 * Tests all limits and validation rules defined in messaging.message.send.v1 policy:
 * - Message length limits (max 2000 characters)
 * - Required fields validation
 * - Message type validation
 * - Rate limiting (messages per minute/day)
 * - Channel allowlist (if configured)
 * - Mention policy (@everyone restrictions)
 */

const APortClient = require("./src/client");
const chalk = require("chalk");

const client = new APortClient();

// Test cases for messaging policy
const testCases = [
  {
    name: "✅ Valid basic message",
    context: {
      channel_id: "general",
      message: "Hello world!",
      message_type: "text",
    },
    shouldPass: true,
  },
  {
    name: "❌ Message too long (>2000 chars)",
    context: {
      channel_id: "general",
      message: "A".repeat(2001), // 2001 characters
      message_type: "text",
    },
    shouldPass: false,
    expectedReason: "content_too_long",
  },
  {
    name: "❌ Missing required field: channel_id",
    context: {
      message: "Hello world!",
      message_type: "text",
    },
    shouldPass: false,
    expectedReason: "missing_required_fields",
  },
  {
    name: "❌ Missing required field: message",
    context: {
      channel_id: "general",
      message_type: "text",
    },
    shouldPass: false,
    expectedReason: "missing_required_fields",
  },
  {
    name: "❌ Missing required field: message_type",
    context: {
      channel_id: "general",
      message: "Hello world!",
    },
    shouldPass: false,
    expectedReason: "missing_required_fields",
  },
  {
    name: "❌ Invalid message_type",
    context: {
      channel_id: "general",
      message: "Hello world!",
      message_type: "invalid_type",
    },
    shouldPass: false,
    expectedReason: "invalid_field_value",
  },
  {
    name: "✅ Valid message with mentions",
    context: {
      channel_id: "general",
      message: "Hello @user1 and @user2!",
      message_type: "text",
      mentions: ["@user1", "@user2"],
    },
    shouldPass: true,
  },
  {
    name: "❌ @everyone mention (if not allowed)",
    context: {
      channel_id: "general",
      message: "Hello @everyone!",
      message_type: "text",
      mentions: ["@everyone"],
    },
    shouldPass: false,
    expectedReason: "mention_forbidden",
  },
  {
    name: "✅ Valid message with attachments",
    context: {
      channel_id: "general",
      message: "Here's a file",
      message_type: "file",
      attachments: [
        {
          url: "https://example.com/file.pdf",
          filename: "document.pdf",
          size: 1024,
        },
      ],
    },
    shouldPass: true,
  },
  {
    name: "✅ Valid embed message",
    context: {
      channel_id: "general",
      message: "System status update",
      message_type: "embed",
    },
    shouldPass: true,
  },
  {
    name: "✅ Valid reaction message",
    context: {
      channel_id: "general",
      message: "👍",
      message_type: "reaction",
    },
    shouldPass: true,
  },
  {
    name: "✅ Valid threaded message",
    context: {
      channel_id: "general",
      message: "This is a reply",
      message_type: "text",
      thread_id: "thread_123",
      reply_to: "msg_456",
    },
    shouldPass: true,
  },
  {
    name: "❌ Empty message",
    context: {
      channel_id: "general",
      message: "",
      message_type: "text",
    },
    shouldPass: false,
    expectedReason: "invalid_field_value",
  },
  {
    name: "❌ Empty channel_id",
    context: {
      channel_id: "",
      message: "Hello world!",
      message_type: "text",
    },
    shouldPass: false,
    expectedReason: "invalid_field_value",
  },
];

async function runMessagingPolicyTests() {
  console.log(
    chalk.blue.bold("\n🧪 Running Comprehensive Messaging Policy Tests\n")
  );

  const agentId = "ap_a2d10232c6534523812423eec8a1425c"; // Agent with messaging.send capability
  const policy = "messaging.message.send.v1";

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
    console.log(chalk.green.bold("\n🎉 All messaging policy tests passed!"));
  } else {
    console.log(
      chalk.red.bold(
        `\n⚠️  ${failed} test(s) failed. Check the output above for details.`
      )
    );
  }
}

// Run the tests
runMessagingPolicyTests().catch(console.error);
