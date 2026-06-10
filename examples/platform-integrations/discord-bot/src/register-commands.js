require("dotenv").config();

const { REST, Routes } = require("discord.js");

const { getCommands } = require("./commands");

const requiredEnv = ["DISCORD_TOKEN", "DISCORD_CLIENT_ID"];
const missingEnv = requiredEnv.filter((name) => !process.env[name]);

if (missingEnv.length > 0) {
  console.error(`Missing required environment variables: ${missingEnv.join(", ")}`);
  process.exit(1);
}

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  const commands = getCommands();

  if (process.env.DISCORD_GUILD_ID) {
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.DISCORD_CLIENT_ID,
        process.env.DISCORD_GUILD_ID
      ),
      { body: commands }
    );
    console.log("Registered guild commands.");
    return;
  }

  await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), {
    body: commands,
  });
  console.log("Registered global commands.");
}

registerCommands().catch((error) => {
  console.error(`Failed to register commands: ${error.message}`);
  process.exit(1);
});
