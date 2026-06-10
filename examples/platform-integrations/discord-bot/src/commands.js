const { SlashCommandBuilder } = require("discord.js");

const verifyCommand = new SlashCommandBuilder()
  .setName("aport-verify")
  .setDescription("Verify a team action with APort")
  .addStringOption((option) =>
    option
      .setName("action")
      .setDescription("Action to verify, such as merge_pr or approve_refund")
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName("resource")
      .setDescription("Resource affected by the action")
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName("reason")
      .setDescription("Short business reason for the action")
      .setRequired(false)
  );

const statusCommand = new SlashCommandBuilder()
  .setName("aport-status")
  .setDescription("Show the configured APort policy pack for this bot");

function getCommands() {
  return [verifyCommand, statusCommand].map((command) => command.toJSON());
}

module.exports = {
  getCommands,
};
