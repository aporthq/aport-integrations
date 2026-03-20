const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const aportClient = require('../lib/aport-client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('policy')
    .setDescription('Check a specific policy for an agent')
    .addStringOption(opt =>
      opt.setName('agent_id').setDescription('The agent ID').setRequired(true))
    .addStringOption(opt =>
      opt.setName('policy_id').setDescription('The policy ID to verify').setRequired(true)),

  async execute(interaction) {
    const agentId = interaction.options.getString('agent_id');
    const policyId = interaction.options.getString('policy_id');

    const pending = new EmbedBuilder()
      .setColor(0xFFAA00)
      .setTitle('🔍 Checking Policy...')
      .setDescription(`Checking policy **${policyId}** for agent **${agentId}**.`)
      .setTimestamp();

    await interaction.reply({ embeds: [pending] });

    try {
      const result = await aportClient.verifyPolicy(agentId, policyId);

      const color = result.decision === 'allow' ? 0x00CC66 : 0xFF3333;

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${result.decision === 'allow' ? '✅' : '❌'} Policy Decision`)
        .addFields(
          { name: 'Agent ID', value: agentId, inline: true },
          { name: 'Policy ID', value: policyId, inline: true },
          { name: 'Decision', value: result.decision || 'N/A', inline: true },
        )
        .setTimestamp();

      if (result.reason) embed.addFields({ name: 'Reason', value: result.reason });
      if (result.details) embed.addFields({ name: 'Details', value: String(result.details) });

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      const embed = new EmbedBuilder()
        .setColor(0xFF3333)
        .setTitle('❌ Policy Check Failed')
        .setDescription(err.message)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }
  },
};
