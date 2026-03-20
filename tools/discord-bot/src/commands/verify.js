const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const aportClient = require('../lib/aport-client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Verify an agent with APort')
    .addStringOption(opt =>
      opt.setName('agent_id').setDescription('The agent ID to verify').setRequired(true))
    .addStringOption(opt =>
      opt.setName('policy_id').setDescription('Optional policy ID to check').setRequired(false)),

  async execute(interaction) {
    const agentId = interaction.options.getString('agent_id');
    const policyId = interaction.options.getString('policy_id');

    const pending = new EmbedBuilder()
      .setColor(0xFFAA00)
      .setTitle('🔍 Verifying...')
      .setDescription(`Verifying agent **${agentId}**${policyId ? ` against policy **${policyId}**` : ''}. Please wait.`)
      .setTimestamp();

    await interaction.reply({ embeds: [pending] });

    try {
      if (policyId) {
        const result = await aportClient.verifyPolicy(agentId, policyId);

        const embed = new EmbedBuilder()
          .setColor(0x00CC66)
          .setTitle('✅ Verification Complete')
          .addFields(
            { name: 'Agent ID', value: agentId, inline: true },
            { name: 'Policy ID', value: policyId, inline: true },
            { name: 'Decision', value: result.decision || 'N/A', inline: true },
          )
          .setTimestamp();

        if (result.details) {
          embed.addFields({ name: 'Details', value: result.details });
        }

        await interaction.editReply({ embeds: [embed] });
      } else {
        const result = await aportClient.getPassportView(agentId);

        const embed = new EmbedBuilder()
          .setColor(0x00CC66)
          .setTitle('✅ Agent Found')
          .addFields(
            { name: 'Agent ID', value: agentId, inline: true },
            { name: 'Status', value: result.status || 'active', inline: true },
          )
          .setTimestamp();

        if (result.policies) {
          embed.addFields({ name: 'Policies', value: result.policies.join(', ') || 'None' });
        }

        await interaction.editReply({ embeds: [embed] });
      }
    } catch (err) {
      const embed = new EmbedBuilder()
        .setColor(0xFF3333)
        .setTitle('❌ Verification Failed')
        .setDescription(err.message)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }
  },
};
