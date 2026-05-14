require("dotenv").config();

const { REST, Routes } = require("discord.js");
const { commands } = require("./commands");

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(name + " is required.");
  }

  return value;
}

async function registerCommands() {
  const token = requireEnv("DISCORD_TOKEN");
  const clientId = requireEnv("DISCORD_CLIENT_ID");
  const guildId = process.env.DISCORD_GUILD_ID;
  const rest = new REST({ version: "10" }).setToken(token);
  const body = commands.map((command) => command.toJSON());

  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body });
    console.log("Registered APort commands for guild " + guildId);
    return;
  }

  await rest.put(Routes.applicationCommands(clientId), { body });
  console.log("Registered global APort commands");
}

if (require.main === module) {
  registerCommands().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  registerCommands,
  requireEnv,
};
