const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const aportClient = require('../lib/aport-client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Check bot and API connection status'),

  async execute(interaction) {
    const apiOk = await aportClient.healthCheck();

    const embed = new EmbedBuilder()
      .setColor(apiOk ? 0x00CC66 : 0xFF3333)
      .setTitle('🤖 Bot Status')
      .addFields(
        { name: 'Bot', value: 'Online', inline: true },
        { name: 'APort API', value: apiOk ? 'Connected' : 'Disconnected', inline: true },
        { name: 'API Base URL', value: process.env.APORT_BASE_URL || 'https://api.aport.io', inline: true },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
