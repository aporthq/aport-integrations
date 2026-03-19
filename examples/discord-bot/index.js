const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Configuration
const CONFIG = {
  token: process.env.DISCORD_BOT_TOKEN,
  aportApiKey: process.env.APORT_API_KEY,
  aportApiUrl: 'https://api.aport.io/verify',
  allowedChannelIds: process.env.ALLOWED_CHANNEL_IDS?.split(',') || []
};

// APort verification function
async function verifyWithAPort(userId, action, context) {
  try {
    const response = await axios.post(CONFIG.aportApiUrl, {
      action: 'verify',
      actor: {
        id: userId,
        name: `discord-user-${userId}`,
        owner: 'discord'
      },
      context: {
        data: {
          action,
          ...context
        }
      },
      projectId: process.env.APORT_PROJECT_ID || 'default-project'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.aportApiKey}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('APort verification error:', error.message);
    return { allow: true, reasons: ['APort verification failed, allowing by default'] };
  }
}

// Slash commands
const commands = [
  new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Verify an action with APort')
    .addStringOption(option =>
      option.setName('action')
        .setDescription('Action to verify')
        .setRequired(true)
        .addChoices(
          { name: 'Send Message', value: 'send_message' },
          { name: 'Join Voice', value: 'join_voice' },
          { name: 'Use Bot', value: 'use_bot' }
        ))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the action')
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName('status')
    .setDescription('Check your verification status')
];

// Handle slash commands
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName, user, options } = interaction;

  try {
    if (commandName === 'verify') {
      const action = options.getString('action');
      const reason = options.getString('reason') || 'No reason provided';

      // Verify with APort
      const result = await verifyWithAPort(user.id, action, { reason });

      // Create embed response
      const embed = new EmbedBuilder()
        .setTitle('🔐 APort Verification Result')
        .setColor(result.allow ? 0x00FF00 : 0xFF0000)
        .addFields(
          { name: 'User', value: user.username, inline: true },
          { name: 'Action', value: action, inline: true },
          { name: 'Status', value: result.allow ? '✅ Allowed' : '❌ Denied', inline: true }
        );

      if (result.reasons && result.reasons.length > 0) {
        embed.addFields({ name: 'Reasons', value: result.reasons.join('\n') });
      }

      await interaction.reply({ embeds: [embed] });
    } 
    else if (commandName === 'status') {
      const embed = new EmbedBuilder()
        .setTitle('📊 Verification Status')
        .setColor(0x0099FF)
        .addFields(
          { name: 'User', value: user.username, inline: true },
          { name: 'ID', value: user.id, inline: true }
        );

      await interaction.reply({ embeds: [embed] });
    }
  } catch (error) {
    console.error('Command error:', error);
    await interaction.reply({ 
      content: '❌ An error occurred while processing your request.',
      ephemeral: true 
    });
  }
});

// Message verification (optional)
client.on('messageCreate', async (message) => {
  // Skip bot messages and commands
  if (message.author.bot || message.content.startsWith('/')) return;
  
  // Check if channel is monitored
  if (CONFIG.allowedChannelIds.length > 0 && 
      !CONFIG.allowedChannelIds.includes(message.channelId)) {
    return;
  }

  // Optional: Verify message content
  const result = await verifyWithAPort(
    message.author.id, 
    'discord_message',
    { 
      channel: message.channelId,
      contentLength: message.content.length.toString()
    }
  );

  if (!result.allow) {
    try {
      await message.delete();
      await message.author.send({
        content: `❌ Your message was deleted because it failed APort verification.\nReason: ${result.reasons?.join(', ') || 'Unknown'}`
      });
    } catch (e) {
      console.error('Error handling denied message:', e);
    }
  }
});

// Ready event
client.once('ready', () => {
  console.log(`🤖 Discord Bot logged in as ${client.user.tag}`);
  
  // Register commands
  client.application.commands.set(commands)
    .then(() => console.log('✅ Commands registered'))
    .catch(console.error);
});

// Start the bot
if (CONFIG.token) {
  client.login(CONFIG.token);
} else {
  console.error('❌ DISCORD_BOT_TOKEN environment variable is not set');
}

module.exports = { client, verifyWithAPort };
