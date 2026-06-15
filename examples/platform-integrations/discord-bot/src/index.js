require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  Events,
} = require("discord.js");

const APortClient = require("./client");
const {
  commandDefinitions,
  formatVerifyResult,
  formatPassportResult,
  formatPoliciesResult,
  formatHelpResult,
} = require("./commands");

// --- Environment Validation ---
function validateEnv() {
  const required = ["DISCORD_BOT_TOKEN", "DISCORD_CLIENT_ID"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
    console.error(
      "Please copy .env.example to .env and fill in your credentials."
    );
    process.exit(1);
  }

  console.log("Environment configured successfully.");
  console.log(`APort Base URL: ${process.env.APORT_BASE_URL || "https://aport.io"}`);
}

// --- Slash Command Registration ---
async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(
    process.env.DISCORD_BOT_TOKEN
  );

  try {
    console.log("Registering slash commands...");

    if (process.env.DISCORD_GUILD_ID) {
      // Guild-specific registration (instant)
      await rest.put(
        Routes.applicationGuildCommands(
          process.env.DISCORD_CLIENT_ID,
          process.env.DISCORD_GUILD_ID
        ),
        { body: commandDefinitions }
      );
      console.log(
        `Registered ${commandDefinitions.length} commands for guild ${process.env.DISCORD_GUILD_ID}`
      );
    } else {
      // Global registration (up to 1 hour to propagate)
      await rest.put(
        Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
        { body: commandDefinitions }
      );
      console.log(
        `Registered ${commandDefinitions.length} global commands`
      );
    }
  } catch (error) {
    console.error("Failed to register slash commands:", error.message);
    throw error;
  }
}

// --- Command Handlers ---

/**
 * Handle /aport-verify command.
 */
async function handleVerify(interaction, aportClient) {
  const agentId = interaction.options.getString("agent-id", true);
  const policy = interaction.options.getString("policy", true);
  const contextRaw = interaction.options.getString("context");

  // Parse context JSON if provided
  let context = {};
  if (contextRaw) {
    try {
      context = JSON.parse(contextRaw);
    } catch (e) {
      await interaction.editReply({
        content: "Invalid JSON format for context. Please provide valid JSON.",
      });
      return;
    }
  }

  try {
    const result = await aportClient.verify(policy, agentId, context);
    const embed = formatVerifyResult(agentId, policy, result);
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    await interaction.editReply({
      content: `Verification failed: ${error.message}`,
    });
  }
}

/**
 * Handle /aport-passport command.
 */
async function handlePassport(interaction, aportClient) {
  const agentId = interaction.options.getString("agent-id", true);

  try {
    const passport = await aportClient.getPassport(agentId);
    const embed = formatPassportResult(agentId, passport);
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    await interaction.editReply({
      content: `Failed to retrieve passport: ${error.message}`,
    });
  }
}

/**
 * Handle /aport-policies command.
 */
async function handlePolicies(interaction, aportClient) {
  try {
    const policies = await aportClient.listPolicies();
    const embed = formatPoliciesResult(policies);
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    // Fallback: show hardcoded policy list if API is unavailable
    const embed = formatPoliciesResult(null);
    await interaction.editReply({ embeds: [embed] });
  }
}

/**
 * Handle /aport-help command.
 */
async function handleHelp(interaction) {
  const embed = formatHelpResult();
  await interaction.editReply({ embeds: [embed] });
}

// --- Main Bot Setup ---
async function main() {
  validateEnv();

  // Initialize APort client
  const aportClient = new APortClient();

  // Initialize Discord client
  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  // Ready event
  client.once(Events.ClientReady, async (readyClient) => {
    console.log(`Logged in as ${readyClient.user.tag}`);

    // Register slash commands on startup
    await registerCommands();
  });

  // Interaction handler
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    // Defer reply to allow processing time
    await interaction.deferReply();

    const commandHandlers = {
      "aport-verify": handleVerify,
      "aport-passport": handlePassport,
      "aport-policies": handlePolicies,
      "aport-help": handleHelp,
    };

    const handler = commandHandlers[interaction.commandName];
    if (handler) {
      try {
        await handler(interaction, aportClient);
      } catch (error) {
        console.error(`Error handling ${interaction.commandName}:`, error);
        try {
          await interaction.editReply({
            content: `An unexpected error occurred while processing the command. Please try again later.`,
          });
        } catch {
          // Interaction may have already expired
        }
      }
    }
  });

  // Error handling
  client.on(Events.Error, (error) => {
    console.error("Discord client error:", error.message);
  });

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\nShutting down...");
    client.destroy();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.log("\nShutting down...");
    client.destroy();
    process.exit(0);
  });

  // Login
  try {
    await client.login(process.env.DISCORD_BOT_TOKEN);
  } catch (error) {
    console.error("Failed to login:", error.message);
    process.exit(1);
  }
}

// Start
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
