const { EmbedBuilder } = require("discord.js");

/**
 * Slash command definitions for the APort Discord Bot.
 * These must be registered with Discord via the REST API.
 */
const commandDefinitions = [
  {
    name: "aport-verify",
    description: "Verify an agent against an APort policy pack",
    options: [
      {
        name: "agent-id",
        description: "The agent ID to verify",
        type: 3, // STRING
        required: true,
      },
      {
        name: "policy",
        description: "Policy pack to verify against",
        type: 3, // STRING
        required: true,
        choices: [
          { name: "Refund", value: "finance.payment.refund.v1" },
          { name: "Data Export", value: "data.export.v1" },
          { name: "Repository Merge", value: "code.repository.merge.v1" },
          { name: "Admin Access", value: "admin.access.v1" },
        ],
      },
      {
        name: "context",
        description: "Additional context as JSON (e.g. {\"amount\":50})",
        type: 3, // STRING
        required: false,
      },
    ],
  },
  {
    name: "aport-passport",
    description: "Retrieve passport information for an agent",
    options: [
      {
        name: "agent-id",
        description: "The agent ID to look up",
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: "aport-policies",
    description: "List available APort policy packs",
  },
  {
    name: "aport-help",
    description: "Show APort bot help and usage guide",
  },
];

/**
 * Format a verification result into a Discord Embed.
 */
function formatVerifyResult(agentId, policy, result) {
  const decision = result.data?.decision || result.decision;
  const isApproved = decision && decision.allow;

  const embed = new EmbedBuilder()
    .setTitle("APort Agent Verification")
    .setColor(isApproved ? 0x00ff00 : 0xff0000)
    .setTimestamp()
    .addFields(
      { name: "Agent ID", value: agentId, inline: false },
      { name: "Policy", value: policy, inline: false },
      {
        name: "Status",
        value: isApproved ? "✅ Approved" : "❌ Denied",
        inline: true,
      }
    );

  if (decision) {
    if (decision.decision_id) {
      embed.addFields({
        name: "Decision ID",
        value: decision.decision_id,
        inline: true,
      });
    }

    if (decision.expires_in) {
      embed.addFields({
        name: "Expires In",
        value: `${decision.expires_in}s`,
        inline: true,
      });
    }

    if (decision.assurance_level) {
      embed.addFields({
        name: "Assurance Level",
        value: decision.assurance_level,
        inline: true,
      });
    }

    if (decision.reasons && decision.reasons.length > 0) {
      embed.addFields({
        name: "Reasons",
        value: decision.reasons.map((r) => `• ${r.message}`).join("\n"),
        inline: false,
      });
    }
  }

  if (result.passport) {
    embed.addFields({
      name: "Passport Name",
      value: result.passport.name || "N/A",
      inline: true,
    });
  }

  embed.setFooter({ text: "APort Bot • Trust but Verify" });
  return embed;
}

/**
 * Format passport data into a Discord Embed.
 */
function formatPassportResult(agentId, passport) {
  const embed = new EmbedBuilder()
    .setTitle("APort Agent Passport")
    .setColor(0x06b6d4)
    .setTimestamp()
    .addFields(
      { name: "Agent ID", value: agentId, inline: false },
      { name: "Name", value: passport.name || "N/A", inline: true },
      { name: "Role", value: passport.role || "N/A", inline: true },
      {
        name: "Status",
        value: passport.status || "unknown",
        inline: true,
      }
    );

  if (passport.description) {
    embed.addFields({
      name: "Description",
      value: passport.description,
      inline: false,
    });
  }

  if (passport.capabilities && passport.capabilities.length > 0) {
    embed.addFields({
      name: "Capabilities",
      value: passport.capabilities
        .map((c) => `• ${typeof c === "string" ? c : c.id}`)
        .join("\n"),
      inline: false,
    });
  }

  if (passport.limits) {
    const limitEntries = Object.entries(passport.limits)
      .map(([key, val]) => `• ${key}: ${val}`)
      .join("\n");
    embed.addFields({
      name: "Limits",
      value: limitEntries || "None",
      inline: false,
    });
  }

  embed.setFooter({ text: "APort Bot • Trust but Verify" });
  return embed;
}

/**
 * Format policy list into a Discord Embed.
 */
function formatPoliciesResult(policies) {
  const embed = new EmbedBuilder()
    .setTitle("APort Policy Packs")
    .setColor(0x06b6d4)
    .setDescription("Available policy packs for agent verification:")
    .setTimestamp();

  if (Array.isArray(policies)) {
    const policyList = policies
      .map((p) => `• \`${p.id || p.policy_id}\` — ${p.description || p.name || "No description"}`)
      .join("\n");
    embed.addFields({
      name: "Policies",
      value: policyList || "No policies available",
      inline: false,
    });
  } else {
    embed.addFields({
      name: "Policies",
      value: "```\nfinance.payment.refund.v1\ndata.export.v1\ncode.repository.merge.v1\nadmin.access.v1\n```",
      inline: false,
    });
  }

  embed.setFooter({ text: "APort Bot • Trust but Verify" });
  return embed;
}

/**
 * Format help information into a Discord Embed.
 */
function formatHelpResult() {
  const embed = new EmbedBuilder()
    .setTitle("APort Bot — Help")
    .setColor(0x06b6d4)
    .setDescription("Discord bot for APort agent verification in team workflows.")
    .addFields(
      {
        name: "Commands",
        value: [
          "`/aport-verify <agent-id> <policy> [context]` — Verify an agent against a policy",
          "`/aport-passport <agent-id>` — View agent passport details",
          "`/aport-policies` — List available policy packs",
          "`/aport-help` — Show this help guide",
        ].join("\n"),
        inline: false,
      },
      {
        name: "Quick Examples",
        value: [
          "`/aport-verify agent-id:ap_a2d10232 policy:Refund context:{\"amount\":50}`",
          "`/aport-passport agent-id:ap_a2d10232c6534523812423eec8a1425c`",
          "`/aport-policies`",
        ].join("\n"),
        inline: false,
      },
      {
        name: "Policy Packs",
        value: [
          "`finance.payment.refund.v1` — Refund processing",
          "`data.export.v1` — Data export operations",
          "`code.repository.merge.v1` — Repository operations",
          "`admin.access.v1` — Admin access control",
        ].join("\n"),
        inline: false,
      },
      {
        name: "Links",
        value: "[APort Website](https://aport.io) • [GitHub](https://github.com/aporthq/aport-integrations)",
        inline: false,
      }
    )
    .setFooter({ text: "APort Bot • Trust but Verify" })
    .setTimestamp();

  return embed;
}

module.exports = {
  commandDefinitions,
  formatVerifyResult,
  formatPassportResult,
  formatPoliciesResult,
  formatHelpResult,
};
