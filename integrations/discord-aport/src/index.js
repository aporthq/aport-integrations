/**
 * APort Discord Bot
 * 
 * Discord bot that verifies agent actions in team workflows using APort.
 * 
 * Commands:
 *   /verify <agent_id> - Verify an agent against configured policies
 *   /status <agent_id> - Check agent verification status
 *   /policies          - List available APort policies
 *   /setup             - Configure APort settings (admin only)
 */

const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder } = require('discord.js');
require('dotenv').config();

// Mock APort Client for template demonstration
class APortClient {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.APORT_API_KEY;
    this.baseUrl = options.baseUrl || process.env.APORT_BASE_URL || 'https://api.aport.io';
  }

  async verify(policy, agentId, context = {}) {
    // Mock verification - in production, replace with actual API call
    console.log(`[APort] Verifying agent ${agentId} against policy ${policy}`);
    
    // In production:
    // const response = await fetch(`${this.baseUrl}/verify`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${this.apiKey}`
    //   },
    //   body: JSON.stringify({ policy, agent_id: agentId, context })
    // });
    // return response.json();

    // Mock response for demonstration
    return {
      verified: true,
      passport: {
        agentId,
        capabilities: ['read', 'write', 'deploy'],
        limits: { requests: 1000, period: '1h' },
        level: 'github_verified',
        issuedAt: new Date().toISOString(),
      },
      policy,
      message: 'Verification successful',
      details: {
        source: 'discord-bot',
        discordUser: context.discordUser,
        discordGuild: context.discordGuild,
      }
    };
  }

  async getStatus(agentId) {
    console.log(`[APort] Checking status for agent ${agentId}`);
    return {
      agentId,
      status: 'active',
      passport: {
        agentId,
        capabilities: ['read', 'write', 'deploy'],
        limits: { requests: 800, period: '1h' },
        level: 'github_verified',
      },
      lastVerified: new Date(Date.now() - 3600000).toISOString(),
    };
  }

  async listPolicies() {
    return {
      policies: [
        { id: 'deploy-policy', name: 'Deploy Policy', description: 'Required for deployment actions' },
        { id: 'data-export-policy', name: 'Data Export Policy', description: 'Required for data export' },
        { id: 'refund-policy', name: 'Refund Policy', description: 'Required for processing refunds' },
        { id: 'pr-merge-policy', name: 'PR Merge Policy', description: 'Required for merging PRs' },
      ]
    };
  }
}

// Configuration store
class BotConfig {
  constructor() {
    this.apiKey = process.env.APORT_API_KEY || '';
    this.baseUrl = process.env.APORT_BASE_URL || 'https://api.aport.io';
    this.adminRoleId = process.env.ADMIN_ROLE_ID || '';
    this.logChannelId = process.env.LOG_CHANNEL_ID || '';
    this.enabled = !!this.apiKey;
  }

  getClient() {
    return new APortClient({
      apiKey: this.apiKey,
      baseUrl: this.baseUrl,
    });
}

// Global config instance
const config = new BotConfig();

// Verification cache to avoid repeated calls
const verificationCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached verification result or verify fresh
 */
async function getCachedVerification(agentId, policy) {
  const cacheKey = `${agentId}:${policy}`;
  const cached = verificationCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
    return { ...cached.result, fromCache: true };
  }
  
  const client = config.getClient();
  const result = await client.verify(policy, agentId);
  
  verificationCache.set(cacheKey, {
    result,
    timestamp: Date.now(),
  });
  
  return { ...result, fromCache: false };
}

/**
 * Create verification result embed
 */
function createVerificationEmbed(result, agentId, policy) {
  const statusColor = result.verified ? 0x10b981 : 0xef4444; // Green or Red
  
  const embed = new EmbedBuilder()
    .setTitle(`APort Verification: ${agentId}`)
    .setColor(statusColor)
    .addFields(
      { name: 'Policy', value: policy, inline: true },
      { name: 'Verified', value: result.verified ? '✅ Yes' : '❌ No', inline: true },
      { name: 'From Cache', value: result.fromCache ? 'Yes' : 'No', inline: true }
    );
  
  if (result.passport) {
    embed.addFields(
      { name: 'Capabilities', value: result.passport.capabilities?.join(', ') || 'N/A', inline: false },
      { name: 'Rate Limit', value: `${result.passport.limits?.requests || 'N/A'} / ${result.passport.limits?.period || 'N/A'}`, inline: true },
      { name: 'Verification Level', value: result.passport.level || 'N/A', inline: true }
    );
  }
  
  if (result.message) {
    embed.setDescription(result.message);
  }
  
  embed.setTimestamp();
  embed.setFooter({ text: 'APort Discord Verification Bot' });
  
  return embed;
}

/**
 * Create status embed
 */
function createStatusEmbed(result) {
  const embed = new EmbedBuilder()
    .setTitle(`Agent Status: ${result.agentId}`)
    .setColor(0x3b82f6)
    .addFields(
      { name: 'Status', value: result.status || 'unknown', inline: true },
      { name: 'Last Verified', value: result.lastVerified ? new Date(result.lastVerified).toLocaleString() : 'N/A', inline: true }
    );
  
  if (result.passport) {
    embed.addFields(
      { name: 'Capabilities', value: result.passport.capabilities?.join(', ') || 'N/A', inline: false },
      { name: 'Rate Limit', value: `${result.passport.limits?.requests || 'N/A'} / ${result.passport.limits?.period || 'N/A'}`, inline: true },
      { name: 'Level', value: result.passport.level || 'N/A', inline: true }
    );
  }
  
  embed.setTimestamp();
  return embed;
}

/**
 * Create policies list embed
 */
function createPoliciesEmbed(policiesResult) {
  const embed = new EmbedBuilder()
    .setTitle('Available APort Policies')
    .setColor(0x8b5cf6);
  
  for (const policy of (policiesResult.policies || [])) {
    embed.addFields({
      name: policy.name,
      value: `\`${policy.id}\`\n${policy.description || 'No description'}`,
      inline: false
    });
  }
  
  embed.setTimestamp();
  embed.setFooter({ text: 'Use /verify <agent_id> to verify against a specific policy' });
  
  return embed;
}

/**
 * Create error embed
 */
function createErrorEmbed(error, context = '') {
  return new EmbedBuilder()
    .setTitle('❌ Verification Error')
    .setColor(0xf59e0b)
    .setDescription(error.message || String(error))
    .addFields({ name: 'Context', value: context || 'N/A', inline: false })
    .setTimestamp();
}

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Bot ready handler
client.once('ready', async () => {
  console.log(`[APort Bot] Logged in as ${client.user.tag}`);
  
  // Register slash commands
  const commands = [
    new SlashCommandBuilder()
      .setName('verify')
      .setDescription('Verify an agent against a policy')
      .addStringOption(option =>
        option.setName('agent_id')
          .setDescription('The agent ID to verify')
          .setRequired(true)
      )
      .addStringOption(option =>
        option.setName('policy')
          .setDescription('The policy ID to verify against')
          .setRequired(false)
      )
      .addStringOption(option =>
        option.setName('context')
          .setDescription('Additional context (JSON)')
          .setRequired(false)
      )
      .toJSON(),
    
    new SlashCommandBuilder()
      .setName('status')
      .setDescription('Check an agent\'s verification status')
      .addStringOption(option =>
        option.setName('agent_id')
          .setDescription('The agent ID to check')
          .setRequired(true)
      )
      .toJSON(),
    
    new SlashCommandBuilder()
      .setName('policies')
      .setDescription('List available APort policies')
      .toJSON(),
    
    new SlashCommandBuilder()
      .setName('setup')
      .setDescription('Configure APort bot settings (admin only)')
      .addStringOption(option =>
        option.setName('api_key')
          .setDescription('APort API key')
          .setRequired(false)
      )
      .addStringOption(option =>
        option.setName('base_url')
          .setDescription('APort API base URL')
          .setRequired(false)
      )
      .toJSON(),
  ];

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
  
  try {
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID || '@me'),
      { body: commands }
    );
    console.log('[APort Bot] Slash commands registered');
  } catch (error) {
    console.error('[APort Bot] Failed to register commands:', error);
  }
});

// Interaction handler
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  try {
    // Check if bot is configured
    if (commandName !== 'setup' && !config.enabled) {
      return interaction.reply({
        embeds: [createErrorEmbed(
          new Error('APort bot is not configured. Use /setup to configure the API key.'),
          'Configuration required'
        )],
        ephemeral: true,
      });
    }

    switch (commandName) {
      case 'verify': {
        const agentId = interaction.options.getString('agent_id');
        const policy = interaction.options.getString('policy') || 'default-policy';
        const contextStr = interaction.options.getString('context');
        
        let context = { discordUser: interaction.user.id, discordGuild: interaction.guildId };
        
        if (contextStr) {
          try {
            context = { ...context, ...JSON.parse(contextStr) };
          } catch {
            return interaction.reply({
              embeds: [createErrorEmbed(
                new Error('Invalid JSON in context parameter'),
                'Context parsing error'
              )],
              ephemeral: true,
            });
          }
        }

        await interaction.deferReply();
        
        const result = await getCachedVerification(agentId, policy);
        const embed = createVerificationEmbed(result, agentId, policy);
        
        await interaction.editReply({ embeds: [embed] });
        
        // Log to log channel if configured
        if (config.logChannelId) {
          const logChannel = client.channels.cache.get(config.logChannelId);
          if (logChannel) {
            logChannel.send({
              embeds: [embed]
                .map(e => e.setFooter({ text: `Requested by ${interaction.user.tag}` }))
            );
          }
        }
        break;
      }

      case 'status': {
        const agentId = interaction.options.getString('agent_id');
        
        await interaction.deferReply();
        
        const client = config.getClient();
        const result = await client.getStatus(agentId);
        const embed = createStatusEmbed(result);
        
        await interaction.editReply({ embeds: [embed] });
        break;
      }

      case 'policies': {
        await interaction.deferReply();
        
        const client = config.getClient();
        const result = await client.listPolicies();
        const embed = createPoliciesEmbed(result);
        
        await interaction.editReply({ embeds: [embed] });
        break;
      }

      case 'setup': {
        // Admin-only command - in production, add role check
        const apiKey = interaction.options.getString('api_key');
        const baseUrl = interaction.options.getString('base_url');
        
        if (apiKey) {
          config.apiKey = apiKey;
          config.enabled = true;
        }
        if (baseUrl) {
          config.baseUrl = baseUrl;
        }
        
        await interaction.reply({
          content: '✅ APort configuration updated. API Key: ' + (apiKey ? '**[configured]**' : '[unchanged]'),
          ephemeral: true,
        });
        break;
      }
    }
  } catch (error) {
    console.error(`[APort Bot] Error handling ${commandName}:`, error);
    
    try {
      await interaction.reply({
        embeds: [createErrorEmbed(error, commandName)],
        ephemeral: true,
      });
    } catch (replyError) {
      console.error('[APort Bot] Failed to send error reply:', replyError);
    }
  }
});

// Message event handler for prefix commands (alternative to slash commands)
client.on('messageCreate', async (message) => {
  // Ignore bot messages and messages without prefix
  if (message.author.bot) return;
  if (!message.content.startsWith('!aport ')) return;

  const args = message.content.slice(7).trim().split(/\s+/);
  const command = args[0]?.toLowerCase();

  if (!config.enabled && command !== 'setup') {
    return message.reply('❌ APort bot is not configured. Use `!aport setup <api_key>` first.');
  }

  try {
    switch (command) {
      case 'verify': {
        const [agentId, policy = 'default-policy'] = args.slice(1);
        if (!agentId) {
          return message.reply('Usage: `!aport verify <agent_id> [policy]`');
        }
        
        const result = await getCachedVerification(agentId, policy);
        const embed = createVerificationEmbed(result, agentId, policy);
        await message.reply({ embeds: [embed] });
        break;
      }

      case 'status': {
        const agentId = args[1];
        if (!agentId) {
          return message.reply('Usage: `!aport status <agent_id>`');
        }
        
        const client = config.getClient();
        const result = await client.getStatus(agentId);
        const embed = createStatusEmbed(result);
        await message.reply({ embeds: [embed] });
        break;
      }

      case 'policies': {
        const client = config.getClient();
        const result = await client.listPolicies();
        const embed = createPoliciesEmbed(result);
        await message.reply({ embeds: [embed] });
        break;
      }

      case 'help': {
        await message.reply({
          content: `
**APort Discord Bot Commands**

Slash Commands:
\`/verify <agent_id> [policy]\` - Verify an agent
\`/status <agent_id>\` - Check agent status
\`/policies\` - List available policies
\`/setup [api_key]\` - Configure bot (admin)

Prefix Commands:
\`!aport verify <agent_id> [policy]\`
\`!aport status <agent_id>\`
\`!aport policies\`
\`!aport help\`
          `.trim()
        });
        break;
      }

      default:
        await message.reply(`Unknown command: ${command}. Use \`!aport help\` for available commands.`);
    }
  } catch (error) {
    console.error('[APort Bot] Error:', error);
    await message.reply({ embeds: [createErrorEmbed(error, command)] });
  }
});

// Login
if (!process.env.DISCORD_BOT_TOKEN) {
  console.error('[APort Bot] ERROR: DISCORD_BOT_TOKEN environment variable is required');
  process.exit(1);
}

client.login(process.env.DISCORD_BOT_TOKEN);

module.exports = { APortClient, BotConfig, getCachedVerification };
