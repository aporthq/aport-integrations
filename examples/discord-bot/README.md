# Discord Bot for APort Verification

A Discord bot that integrates with APort to verify agent actions in team workflows.

## Prerequisites

- Node.js 18+
- Discord Bot Token ([Create one here](https://discord.com/developers/applications))
- APort API Key ([Get one here](https://aport.io/dashboard))

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/aporthq/aport-integrations.git
   cd aport-integrations/examples/discord-bot
   ```

2. Install dependencies:
   ```bash
   npm install discord.js axios dotenv
   ```

3. Create a `.env` file:
   ```env
   DISCORD_BOT_TOKEN=your-discord-bot-token
   APORT_API_KEY=your-aport-api-key
   APORT_PROJECT_ID=your-project-id
   ALLOWED_CHANNEL_IDS=channel1,channel2
   ```

4. Run the bot:
   ```bash
   node index.js
   ```

## Bot Commands

### `/verify`
Verify an action with APort before executing it.

**Usage:**
```
/verify action: Send_Message reason: Testing the bot
```

**Response:**
- Shows whether the action is allowed or denied
- Displays reasons if denied

### `/status`
Check your verification status.

**Usage:**
```
/status
```

## Features

1. **Slash Commands**
   - `/verify` - Verify actions with APort
   - `/status` - Check user verification status

2. **Message Verification** (Optional)
   - Automatically verifies messages in monitored channels
   - Deletes messages that fail verification
   - Notifies users why their message was deleted

3. **APort Integration**
   - Uses APort's verify endpoint
   - Supports custom actions and contexts
   - Configurable project IDs

## Configuration

| Environment Variable | Description | Required |
|---------------------|-------------|----------|
| `DISCORD_BOT_TOKEN` | Your Discord bot token | Yes |
| `APORT_API_KEY` | Your APort API key | Yes |
| `APORT_PROJECT_ID` | Your APort project ID | No (defaults to 'default-project') |
| `ALLOWED_CHANNEL_IDS` | Comma-separated channel IDs to monitor | No |

## Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to "Bot" and create a bot
4. Copy the bot token
5. Go to "OAuth2" → "URL Generator"
6. Select scopes: `bot`
7. Select permissions: `Send Messages`, `Manage Messages`, `Read Message History`
8. Use the generated URL to invite the bot

## Time & Space Complexity

- **Time Complexity**: O(1) for command processing, O(n) for API calls where n is response size
- **Space Complexity**: O(1) for bot operations

## Learn More

- [APort Documentation](https://docs.aport.io)
- [Discord.js Guide](https://discordjs.guide/)
- [APort Dashboard](https://aport.io/dashboard)

## License

MIT
