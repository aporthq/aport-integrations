# 🤖 APort Discord Bot

**Discord bot for APort agent verification in team workflows.**

Integrate APort's agent identity verification and policy enforcement directly into your Discord server. Verify agents, check passports, and manage team security — right from chat.

## 🎯 Features

- **Agent Verification** — Verify agents against APort policy packs via `/aport-verify`
- **Passport Lookup** — Retrieve agent passport details via `/aport-passport`
- **Policy Listing** — Browse available policy packs via `/aport-policies`
- **Rich Embeds** — Clean, formatted results with Discord embed UI
- **Error Handling** — Graceful error messages and user feedback

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+**
- **Discord Bot Application** ([Discord Developer Portal](https://discord.com/developers/applications))
- **APort Account** (optional — verification works without API key for public endpoints)

### 1. Install Dependencies

```bash
cd examples/platform-integrations/discord-bot
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

Required environment variables:

| Variable | Description |
|---|---|
| `DISCORD_BOT_TOKEN` | Your Discord bot token |
| `DISCORD_CLIENT_ID` | Your Discord application client ID |
| `DISCORD_GUILD_ID` | (Optional) Specific guild for instant command registration |
| `APORT_API_KEY` | (Optional) APort API key for management operations |

### 3. Invite Bot to Your Server

Use this URL (replace `CLIENT_ID`):
```
https://discord.com/oauth2/authorize?client_id=CLIENT_ID&permissions=2147485696&scope=bot%20applications.commands
```

### 4. Start the Bot

```bash
npm start
```

## 📋 Commands

### `/aport-verify <agent-id> <policy> [context]`

Verify an agent against an APort policy pack.

```
/aport-verify agent-id:ap_a2d10232 policy:Refund context:{"amount":50}
```

**Parameters:**
- `agent-id` — The agent ID to verify (required)
- `policy` — Policy pack selection (required): Refund, Data Export, Repository Merge, Admin Access
- `context` — Additional context as JSON string (optional)

### `/aport-passport <agent-id>`

Retrieve passport details for an agent.

```
/aport-passport agent-id:ap_a2d10232c6534523812423eec8a1425c
```

### `/aport-policies`

List all available APort policy packs.

```
/aport-policies
```

### `/aport-help`

Display bot commands and usage guide.

```
/aport-help
```

## 🏗️ Project Structure

```
discord-bot/
├── README.md              # This file
├── package.json           # Node.js dependencies
├── .env.example           # Environment variables template
├── src/
│   ├── index.js           # Bot entry point & command router
│   ├── client.js          # APort API client wrapper
│   └── commands.js        # Slash command definitions & embed formatters
├── tests/
│   └── bot.test.js        # Unit & integration tests
└── examples/
    └── basic-usage.js     # Standalone usage without Discord
```

## 🔧 Architecture

```
┌──────────┐     ┌──────────────┐     ┌──────────┐
│ Discord   │────▶│  Bot (Node)  │────▶│  APort   │
│ Server    │◀────│  index.js    │◀────│  API     │
└──────────┘     └──────────────┘     └──────────┘
                       │
                 ┌─────┴──────┐
                 │  client.js  │  ← Axios HTTP client
                 │ commands.js │  ← Discord.js command handlers
                 └────────────┘
```

## 🧪 Testing

```bash
npm test
```

Tests cover:
- APort client initialization and error handling
- Command embed formatting for all result types
- Input validation and edge cases

## 📚 Policy Packs

| Policy | Description |
|---|---|
| `finance.payment.refund.v1` | Refund processing with amount limits |
| `data.export.v1` | Data export with row limits |
| `code.repository.merge.v1` | Repository merge operations |
| `admin.access.v1` | Administrative access control |

## 🔒 Security

- Never commit `.env` files or hardcode secrets
- Use environment variables for all credentials
- The bot uses deferReply to prevent interaction timeouts
- Error messages do not expose sensitive API details
- Slash commands use proper Discord.js permission model

## 🤝 Contributing

Contributions welcome! This integration is part of the [APort Integrations](https://github.com/aporthq/aport-integrations) repository.

## 📄 License

MIT — See [LICENSE](../../../LICENSE) in the root repository.
