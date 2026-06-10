require("dotenv").config();

const { Client, Events, GatewayIntentBits } = require("discord.js");

const { formatDecision, verifyAction } = require("./aport");

const requiredEnv = ["DISCORD_TOKEN", "APORT_POLICY_PACK"];
const missingEnv = requiredEnv.filter((name) => !process.env[name]);

if (missingEnv.length > 0) {
  console.error(`Missing required environment variables: ${missingEnv.join(", ")}`);
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`APort Discord bot signed in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  if (interaction.commandName === "aport-status") {
    await interaction.reply({
      ephemeral: true,
      content: `APort policy pack: ${process.env.APORT_POLICY_PACK}`,
    });
    return;
  }

  if (interaction.commandName !== "aport-verify") {
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const decision = await verifyAction({
      apiKey: process.env.APORT_API_KEY,
      apiUrl: process.env.APORT_API_URL,
      policyPack: process.env.APORT_POLICY_PACK,
      userId: interaction.user.id,
      action: interaction.options.getString("action", true),
      resource: interaction.options.getString("resource", true),
      reason: interaction.options.getString("reason") || "",
    });

    const formatted = formatDecision(decision);
    await interaction.editReply(formatted.text);
  } catch (error) {
    await interaction.editReply(`Verification error: ${error.message}`);
  }
});

client.login(process.env.DISCORD_TOKEN);
