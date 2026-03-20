# APort Discord Bot

Discord bot for agent verification and policy checking via the APort API.

## Setup

1. Create a [Discord Application](https://discord.com/developers/applications) and bot
2. Enable **MESSAGE CONTENT INTENT** and **SERVER MEMBERS INTENT** in the Bot tab
3. Invite the bot to your server with `applications.commands` scope
4. Copy `.env.example` to `.env` and fill in your tokens:
   ```
   DISCORD_TOKEN=your_discord_bot_token
   APORT_API_KEY=your_aport_api_key
   APORT_BASE_URL=https://api.aport.io
   ```

## Install & Run

```bash
npm install
npm start        # production
npm run dev      # development (auto-restart on changes)
```

## Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `/verify` | Verify an agent (optionally against a policy) | `/verify <agent_id> [policy_id]` |
| `/policy` | Check a specific policy for an agent | `/policy <agent_id> <policy_id>` |
| `/status` | Check bot and API status | `/status` |

## Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `DISCORD_TOKEN` | Discord bot token from Developer Portal | Yes |
| `APORT_API_KEY` | APort API authentication key | Yes |
| `APORT_BASE_URL` | APort API base URL (default: `https://api.aport.io`) | No |

## License

MIT
