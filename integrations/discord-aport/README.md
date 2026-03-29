# APort Discord Bot

Discord bot that verifies agent actions in team workflows using APort.

## Overview

This bot integrates APort agent identity verification into Discord for team collaboration workflows. Use it to verify that agents are authorized before performing sensitive actions like deployments, data exports, or refunds.

## Commands

### Slash Commands

| Command | Description |
|---------|-------------|
| `/verify <agent_id> [policy]` | Verify an agent against a specific policy |
| `/status <agent_id>` | Check an agent's current verification status |
| `/policies` | List all available APort policies |
| `/setup [api_key]` | Configure APort settings (admin only) |

### Prefix Commands

| Command | Description |
|---------|-------------|
| `!aport verify <agent_id> [policy]` | Verify an agent |
| `!aport status <agent_id>` | Check agent status |
| `!aport policies` | List policies |
| `!aport help` | Show help |

## Installation

```bash
# Clone the repository
git clone https://github.com/aporthq/aport-integrations.git
cd aport-integrations/integrations/discord-aport

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your tokens
```

## Configuration

Create a `.env` file:

```env
# Discord bot token (from Discord Developer Portal)
DISCORD_BOT_TOKEN=your_discord_bot_token_here

# APort API credentials
APORT_API_KEY=your_aport_api_key_here
APORT_BASE_URL=https://api.aport.io

# Optional: Discord guild ID for command registration
GUILD_ID=your_guild_id_here

# Optional: Channel ID for verification logs
LOG_CHANNEL_ID=your_log_channel_id_here

# Optional: Admin role ID for setup command
ADMIN_ROLE_ID=your_admin_role_id_here
```

## Getting Started

1. **Create a Discord Application**:
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Create a new application
   - Go to the Bot tab and create a bot
   - Copy the bot token to `DISCORD_BOT_TOKEN`

2. **Add Bot to Server**:
   ```bash
   # Generate invite link with required permissions
   https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=2147483648&scope=bot%20applications.commands
   ```

3. **Configure APort**:
   - Get your API key from [aport.io/dashboard](https://aport.io/dashboard)
   - Use `/setup your_api_key` in Discord

## Verification Workflows

### Deployment Verification

```
Developer: /verify agent_deploy_bot deploy-policy
Bot: ✅ Verified! Agent can deploy to production
Developer: /deploy
```

### Data Export Verification

```
Developer: /verify agent_exporter data-export-policy
Bot: ✅ Verified! Agent authorized for data export
Developer: /export-all-data
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DISCORD_BOT_TOKEN` | Yes | - | Discord bot token |
| `APORT_API_KEY` | Yes* | - | APort API key (*configurable via /setup) |
| `APORT_BASE_URL` | No | `https://api.aport.io` | APort API base URL |
| `GUILD_ID` | No | - | Discord guild ID for dev |
| `LOG_CHANNEL_ID` | No | - | Channel for verification logs |
| `ADMIN_ROLE_ID` | No | - | Role required for /setup |

## Caching

Verification results are cached for 5 minutes to reduce API calls. Use `/verify` with `force=true` context to bypass cache (future enhancement).

## License

MIT
