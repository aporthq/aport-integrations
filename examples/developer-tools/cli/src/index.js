#!/usr/bin/env node

const { Command } = require("commander");
const chalk = require("chalk");
const ora = require("ora");
const inquirer = require("inquirer");
const APortClient = require("./client");

const program = new Command();

// Sample agent IDs for testing
const SAMPLE_AGENTS = {
  "refund-bot": "ap_a2d10232c6534523812423eec8a1425c",
  "data-exporter": "ap_b804b365003247888c06c94347cf54fe",
  "pr-merger": "ap_4343a3f0c90948a59ee1c05bf019f9ac",
};

program
  .name("aport")
  .description("APort CLI - Test agent verification and passport management")
  .version("1.0.0")
  .option(
    "-k, --api-key <key>",
    "APort API key (optional for verification commands)"
  );

// Verify command
program
  .command("verify")
  .description("Verify an agent against a policy")
  .option("-a, --agent-id <id>", "Agent ID to verify")
  .option("-p, --policy <policy>", "Policy pack to verify against")
  .option("-c, --context <context>", "Additional context (JSON string)")
  .option("--interactive", "Interactive mode to select from sample agents")
  .argument("[agentId]", "Agent ID to verify")
  .argument("[policy]", "Policy pack to verify against")
  .argument("[context]", "Additional context (JSON string)")
  .action(async (posAgentId, posPolicy, posContext, options) => {
    const client = new APortClient({ apiKey: program.opts().apiKey });

    try {
      // Use positional arguments if provided, otherwise fall back to options
      let agentId = posAgentId || options.agentId;
      let policy = posPolicy || options.policy;
      let context = posContext || options.context;

      // Interactive mode
      if (options.interactive) {
        const answers = await inquirer.prompt([
          {
            type: "list",
            name: "agent",
            message: "Select a sample agent:",
            choices: Object.keys(SAMPLE_AGENTS).map((key) => ({
              name: `${key} (${SAMPLE_AGENTS[key]})`,
              value: SAMPLE_AGENTS[key],
            })),
          },
          {
            type: "list",
            name: "policy",
            message: "Select a policy pack:",
            choices: [
              "payments.refund.v1",
              "data.export.v1",
              "repo.v1",
              "admin.access.v1",
            ],
          },
          {
            type: "input",
            name: "context",
            message: "Additional context (JSON, optional):",
            default: "{}",
          },
        ]);

        agentId = answers.agent;
        policy = answers.policy;
        context = answers.context;
      }

      if (!agentId || !policy) {
        console.error(chalk.red("❌ Agent ID and policy are required"));
        process.exit(1);
      }

      const spinner = ora("Verifying agent...").start();

      let contextObj = {};
      if (context) {
        try {
          contextObj = JSON.parse(context);
        } catch (e) {
          console.error(chalk.red("❌ Invalid JSON context"));
          process.exit(1);
        }
      }

      const result = await client.verify(policy, agentId, contextObj);
      spinner.stop();

      // Check if verification was successful using decision object
      const decision = result.data?.decision || result.decision;
      const isApproved = decision && decision.allow;

      if (isApproved) {
        console.log(chalk.green("✅ Agent verification successful!"));
        console.log(chalk.gray(`Agent: ${agentId}`));
        console.log(chalk.gray(`Policy: ${policy}`));
        if (decision.reasons && decision.reasons.length > 0) {
          console.log(
            chalk.gray(
              `Notes: ${decision.reasons.map((r) => r.message).join(", ")}`
            )
          );
        }
      } else {
        console.log(chalk.red("❌ Agent verification failed"));
        if (decision && decision.reasons && decision.reasons.length > 0) {
          console.log(
            chalk.red(
              `Reasons: ${decision.reasons.map((r) => r.message).join(", ")}`
            )
          );
        } else {
          console.log(chalk.red("Reason: Unknown"));
        }

        // Show decision details
        if (decision) {
          console.log(chalk.yellow("\nDecision Details:"));
          console.log(chalk.gray(`  Decision ID: ${decision.decision_id}`));
          console.log(chalk.gray(`  Allow: ${decision.allow ? "✅" : "❌"}`));
          console.log(chalk.gray(`  Expires: ${decision.expires_in}s`));
          if (decision.assurance_level) {
            console.log(
              chalk.gray(`  Assurance Level: ${decision.assurance_level}`)
            );
          }
        }
      }
    } catch (error) {
      console.error(chalk.red("❌ Error:"), error.message);
      process.exit(1);
    }
  });

// Policy verify command
program
  .command("policy")
  .description("Verify an agent against a specific policy pack")
  .option("-a, --agent-id <id>", "Agent ID to verify")
  .option("-p, --policy <policy>", "Policy pack to verify against")
  .option("-c, --context <context>", "Additional context (JSON string)")
  .action(async (options) => {
    const client = new APortClient({ apiKey: program.opts().apiKey });

    try {
      if (!options.agentId || !options.policy) {
        console.error(chalk.red("❌ Agent ID and policy are required"));
        process.exit(1);
      }

      const spinner = ora("Verifying policy...").start();

      let contextObj = {};
      if (options.context) {
        try {
          contextObj = JSON.parse(options.context);
        } catch (e) {
          console.error(chalk.red("❌ Invalid JSON context"));
          process.exit(1);
        }
      }

      const result = await client.verifyPolicy(
        options.policy,
        options.agentId,
        contextObj
      );
      spinner.stop();

      if (result.verified) {
        console.log(chalk.green("✅ Policy verification successful!"));
        console.log(
          chalk.blue("📋 Passport:"),
          JSON.stringify(result.passport, null, 2)
        );
        console.log(chalk.blue("🔒 Policy:"), result.policy);
      } else {
        console.log(chalk.red("❌ Policy verification failed"));
        console.log(chalk.yellow("Reason:"), result.reason || "Unknown");
      }
    } catch (error) {
      console.error(chalk.red("❌ Error:"), error.message);
      process.exit(1);
    }
  });

// Create passport command
program
  .command("create-passport")
  .description("Create a new agent passport")
  .option("--interactive", "Interactive mode to create passport")
  .action(async (options) => {
    const client = new APortClient({ apiKey: program.opts().apiKey });

    try {
      let passportData;

      if (options.interactive) {
        const answers = await inquirer.prompt([
          {
            type: "input",
            name: "name",
            message: "Agent name:",
            default: "My Test Agent",
          },
          {
            type: "input",
            name: "role",
            message: "Agent role:",
            default: "Test Agent",
          },
          {
            type: "input",
            name: "description",
            message: "Agent description:",
            default: "A test agent for APort CLI",
          },
          {
            type: "list",
            name: "capabilities",
            message: "Select capabilities:",
            choices: [
              "payments.refund",
              "data.export",
              "repo.merge",
              "admin.access",
            ],
            multiple: true,
          },
          {
            type: "input",
            name: "contact",
            message: "Contact email:",
            default: "test@example.com",
          },
        ]);

        passportData = {
          name: answers.name,
          role: answers.role,
          description: answers.description,
          capabilities: answers.capabilities.map((cap) => ({
            id: cap,
            params: {},
          })),
          limits: {
            refund_amount_max_per_tx: 100,
            refund_amount_daily_cap: 500,
            max_rows_per_export: 10000,
            allow_pii: false,
          },
          regions: ["US"],
          contact: answers.contact,
          controller_type: "person",
          status: "active",
          links: {
            homepage: "https://aport.io",
            repo: "https://github.com/aporthq/aport-integrations",
          },
          categories: ["test", "cli"],
          framework: ["APort CLI"],
        };
      } else {
        // Use default test passport
        passportData = {
          name: "CLI Test Agent",
          role: "Test Agent",
          description: "A test agent created via APort CLI",
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
          contact: "test@example.com",
          controller_type: "person",
          status: "active",
          links: {
            homepage: "https://aport.io",
            repo: "https://github.com/aporthq/aport-integrations",
          },
          categories: ["test", "cli"],
          framework: ["APort CLI"],
        };
      }

      const spinner = ora("Creating passport...").start();
      const result = await client.createPassport(passportData);
      spinner.stop();

      console.log(chalk.green("✅ Passport created successfully!"));
      console.log(chalk.blue("🆔 Agent ID:"), result.agent_id);
      console.log(chalk.blue("📋 Passport:"), JSON.stringify(result, null, 2));
    } catch (error) {
      console.error(chalk.red("❌ Error:"), error.message);
      process.exit(1);
    }
  });

// Get passport command
program
  .command("get-passport")
  .description("Get passport information for an agent")
  .option("-a, --agent-id <id>", "Agent ID to fetch")
  .option("--interactive", "Interactive mode to select from sample agents")
  .action(async (options) => {
    const client = new APortClient({ apiKey: program.opts().apiKey });

    try {
      let agentId = options.agentId;

      if (options.interactive) {
        const answers = await inquirer.prompt([
          {
            type: "list",
            name: "agent",
            message: "Select a sample agent:",
            choices: Object.keys(SAMPLE_AGENTS).map((key) => ({
              name: `${key} (${SAMPLE_AGENTS[key]})`,
              value: SAMPLE_AGENTS[key],
            })),
          },
        ]);

        agentId = answers.agent;
      }

      if (!agentId) {
        console.error(chalk.red("❌ Agent ID is required"));
        process.exit(1);
      }

      const spinner = ora("Fetching passport...").start();
      const result = await client.getPassport(agentId);
      spinner.stop();

      console.log(chalk.green("✅ Passport retrieved successfully!"));
      console.log(chalk.blue("📋 Passport:"), JSON.stringify(result, null, 2));
    } catch (error) {
      console.error(chalk.red("❌ Error:"), error.message);
      process.exit(1);
    }
  });

// Demo command
program
  .command("demo")
  .description("Run a complete demo with sample agents")
  .action(async () => {
    const client = new APortClient({ apiKey: program.opts().apiKey });

    console.log(chalk.blue("🎬 Running APort CLI Demo...\n"));

    // Demo 1: Verify refund bot
    console.log(
      chalk.yellow("1. Verifying refund bot against payments.refund.v1 policy")
    );
    try {
      const result1 = await client.verify(
        "payments.refund.v1",
        SAMPLE_AGENTS["refund-bot"],
        {
          amount: 50,
          currency: "USD",
        }
      );
      // Check if verification was successful using decision object
      const decision1 = result1.data?.decision || result1.decision;
      const isApproved1 = decision1 && decision1.allow;
      console.log(
        isApproved1 ? chalk.green("✅ Verified") : chalk.red("❌ Failed")
      );
    } catch (error) {
      console.log(chalk.red("❌ Error:"), error.message);
    }

    // Demo 2: Verify data exporter
    console.log(
      chalk.yellow("\n2. Verifying data exporter against data.export.v1 policy")
    );
    try {
      const result2 = await client.verify(
        "data.export.v1",
        SAMPLE_AGENTS["data-exporter"],
        {
          rows: 5000,
          dataset: "users",
        }
      );
      // Check if verification was successful using decision object
      const decision2 = result2.data?.decision || result2.decision;
      const isApproved2 = decision2 && decision2.allow;
      console.log(
        isApproved2 ? chalk.green("✅ Verified") : chalk.red("❌ Failed")
      );
    } catch (error) {
      console.log(chalk.red("❌ Error:"), error.message);
    }

    // Demo 3: Get passport
    console.log(chalk.yellow("\n3. Fetching passport for admin bot"));
    try {
      const passport = await client.getPassport(SAMPLE_AGENTS["refund-bot"]);
      console.log(chalk.green("✅ Passport retrieved:"), passport.name);
    } catch (error) {
      console.log(chalk.red("❌ Error:"), error.message);
    }

    console.log(chalk.blue("\n🎉 Demo completed!"));
  });

// Help command
program
  .command("help")
  .description("Show help and examples")
  .action(() => {
    console.log(chalk.blue("🛡️ APort CLI - Agent Verification Tool\n"));

    console.log(chalk.yellow("Quick Start (No API Key Needed!):"));
    console.log("  aport demo                    # Run complete demo");
    console.log("  aport verify --interactive    # Interactive verification");
    console.log("  aport get-passport --interactive  # Get passport info");
    console.log(
      "  aport create-passport --interactive  # Create new passport (needs API key)\n"
    );

    console.log(chalk.yellow("Sample Agent IDs:"));
    Object.entries(SAMPLE_AGENTS).forEach(([name, id]) => {
      console.log(`  ${name}: ${id}`);
    });

    console.log(chalk.yellow("\nPolicy Packs:"));
    console.log("  payments.refund.v1    # Refund processing");
    console.log("  data.export.v1        # Data export");
    console.log("  repo.v1               # Repository operations");
    console.log("  admin.access.v1       # Admin access\n");

    console.log(chalk.yellow("Examples (No API Key Needed!):"));
    console.log(
      "  aport verify -a ap_a2d10232c6534523812423eec8a1425c -p payments.refund.v1 -c '{\"amount\":50}'"
    );
    console.log(
      "  aport policy -a ap_b804b365003247888c06c94347cf54fe -p data.export.v1 -c '{\"rows\":1000}'"
    );
    console.log("  aport get-passport -a ap_a2d10232c6534523812423eec8a1425c");
    console.log(chalk.yellow("\nWith API Key:"));
    console.log("  aport create-passport --interactive");
  });

program.parse();
