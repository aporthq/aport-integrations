const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { verifyPolicy } = require("./aport");

const defaultPolicy = process.env.APORT_DEFAULT_POLICY || "code.repository.merge.v1";

const verifyCommand = new SlashCommandBuilder()
  .setName("aport-verify")
  .setDescription("Verify an agent action with APort")
  .addStringOption((option) =>
    option
      .setName("agent-id")
      .setDescription("APort agent id or mapped team agent identifier")
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName("action")
      .setDescription("Team workflow action being requested")
      .setRequired(true)
      .addChoices(
        { name: "Merge pull request", value: "merge_pr" },
        { name: "Process refund", value: "process_refund" },
        { name: "Export data", value: "export_data" },
        { name: "Admin access", value: "admin_access" }
      )
  )
  .addStringOption((option) =>
    option
      .setName("policy")
      .setDescription("APort policy pack")
      .setRequired(false)
  )
  .addStringOption((option) =>
    option
      .setName("context")
      .setDescription("Optional JSON context, such as {\"amount\":50}")
      .setRequired(false)
  );

const helpCommand = new SlashCommandBuilder()
  .setName("aport-help")
  .setDescription("Show APort verification bot usage");

const commands = [verifyCommand, helpCommand];

function parseJsonContext(input) {
  if (!input || input.trim() === "") {
    return {};
  }

  try {
    const parsed = JSON.parse(input);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Context must be a JSON object.");
    }

    return parsed;
  } catch (error) {
    throw new Error("Invalid context JSON: " + (error instanceof Error ? error.message : String(error)));
  }
}

function buildTeamContext(interaction, action, context) {
  return {
    action,
    discord: {
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      userId: interaction.user.id,
      username: interaction.user.username,
    },
    ...context,
  };
}

function createResultEmbed({ allowed, agentId, policy, reason, action }) {
  const color = allowed ? 0x1f883d : 0xcf222e;
  const title = allowed ? "APort verification approved" : "APort verification denied";
  const description = allowed
    ? "Agent `" + agentId + "` is allowed to perform `" + action + "`."
    : "Agent `" + agentId + "` is not allowed to perform `" + action + "`.";
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .addFields(
      { name: "Policy", value: "`" + policy + "`", inline: true },
      { name: "Action", value: "`" + action + "`", inline: true }
    )
    .setTimestamp(new Date());

  if (reason) {
    embed.addFields({ name: "Reason", value: reason.slice(0, 1024) });
  }

  return embed;
}

async function handleVerifyCommand(interaction, verifier = verifyPolicy) {
  const agentId = interaction.options.getString("agent-id", true);
  const action = interaction.options.getString("action", true);
  const policy = interaction.options.getString("policy") || defaultPolicy;
  const rawContext = interaction.options.getString("context");
  const context = parseJsonContext(rawContext);
  const teamContext = buildTeamContext(interaction, action, context);

  await interaction.deferReply({ ephemeral: true });

  const result = await verifier({
    agentId,
    policy,
    context: teamContext,
  });
  const embed = createResultEmbed({
    allowed: result.allowed,
    agentId,
    policy,
    reason: result.reason,
    action,
  });

  await interaction.editReply({ embeds: [embed] });

  return result;
}

async function handleHelpCommand(interaction) {
  await interaction.reply({
    ephemeral: true,
    content: [
      "Use `/aport-verify` to check whether an agent can perform a team workflow action.",
      "",
      "Example context:",
      "```json",
      "{\"repository\":\"owner/repo\",\"pull_request\":42}",
      "```",
    ].join("\n"),
  });
}

async function handleInteraction(interaction, verifier = verifyPolicy) {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  try {
    if (interaction.commandName === "aport-verify") {
      await handleVerifyCommand(interaction, verifier);
      return;
    }

    if (interaction.commandName === "aport-help") {
      await handleHelpCommand(interaction);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const payload = {
      ephemeral: true,
      content: "APort verification failed: " + message,
    };

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(payload);
    } else {
      await interaction.reply(payload);
    }
  }
}

module.exports = {
  buildTeamContext,
  commands,
  createResultEmbed,
  handleInteraction,
  handleVerifyCommand,
  parseJsonContext,
};
