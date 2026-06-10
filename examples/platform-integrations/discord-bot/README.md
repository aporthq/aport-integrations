# APort Discord Verification Bot

This example shows how to verify team actions from Discord slash commands before a workflow continues.

## Commands

- `/aport-verify action:<action> resource:<resource> reason:<reason>` calls APort and returns the allow/deny decision.
- `/aport-status` shows the configured policy pack.

## Setup

1. Create a Discord application and bot in the Discord Developer Portal.
2. Copy `.env.example` to `.env`.
3. Fill in `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, and `APORT_POLICY_PACK`.
4. Optional: set `DISCORD_GUILD_ID` for fast command registration in one test server.

```bash
npm install
npm run register
npm start
```

## Example

```text
/aport-verify action:merge_pr resource:aporthq/aport-integrations#116 reason:approved review
```

The bot sends this context to APort:

```json
{
  "actor": {
    "type": "discord_user",
    "id": "1234567890"
  },
  "action": "merge_pr",
  "resource": "aporthq/aport-integrations#116",
  "reason": "approved review"
}
```

## Configuration

| Variable | Description |
| --- | --- |
| `DISCORD_TOKEN` | Discord bot token. |
| `DISCORD_CLIENT_ID` | Discord application client id. |
| `DISCORD_GUILD_ID` | Optional guild id for test-server command registration. |
| `APORT_API_KEY` | APort API key when your policy requires authentication. |
| `APORT_API_URL` | APort verification endpoint. Defaults to `https://aport.io/api/verify`. |
| `APORT_POLICY_PACK` | Policy pack used for team action checks. |

## Test

```bash
npm test
```
