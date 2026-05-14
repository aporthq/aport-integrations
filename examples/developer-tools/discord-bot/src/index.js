require("dotenv").config();

const { Client, GatewayIntentBits, Events } = require("discord.js");
const { handleInteraction } = require("./commands");

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(name + " is required.");
  }

  return value;
}

async function main() {
  const token = requireEnv("DISCORD_TOKEN");
  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  client.once(Events.ClientReady, (readyClient) => {
    console.log("APort Discord bot signed in as " + readyClient.user.tag);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    await handleInteraction(interaction);
  });

  await client.login(token);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  main,
  requireEnv,
};
