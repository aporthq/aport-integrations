# APort Discord Verification Bot

Discord bot for checking team workflow actions with APort policy verification.

The bot adds slash commands that let a team verify whether an agent is allowed to perform actions such as merging a pull request, processing a refund, exporting data, or requesting admin access.

## Commands

| Command | Description |
| --- | --- |
| `/aport-verify` | Verify an agent action against an APort policy. |
| `/aport-help` | Show usage details and a context example. |

`/aport-verify` options:

| Option | Required | Description |
| --- | --- | --- |
| `agent-id` | Yes | APort agent id or team-mapped agent identifier. |
| `action` | Yes | Team workflow action to verify. |
| `policy` | No | APort policy pack. Defaults to `APORT_DEFAULT_POLICY`. |
| `context` | No | Additional JSON context for the policy check. |

## Setup

1. Create a Discord application in the Discord Developer Portal.
2. Add a bot user and copy the bot token.
3. Enable the `applications.commands` OAuth2 scope when installing the bot.
4. Copy `.env.example` to `.env` and fill in the values.

```bash
npm install
cp .env.example .env
npm run register
npm start
```

For local development, set `DISCORD_GUILD_ID` so commands register immediately in one test server. Leave it empty when you want global commands.

## Environment

```bash
DISCORD_TOKEN=replace_with_your_bot_token
DISCORD_CLIENT_ID=replace_with_your_application_client_id
DISCORD_GUILD_ID=replace_with_your_test_server_id
APORT_API_KEY=your_aport_api_key
APORT_BASE_URL=https://aport.io
APORT_DEFAULT_POLICY=code.repository.merge.v1
```

## Example

```text
/aport-verify agent-id:ap_a2d10232c6534523812423eec8a1425c action:merge_pr policy:code.repository.merge.v1 context:{"repository":"owner/repo","pull_request":42}
```

The bot replies privately with an approval or denial embed. The request context sent to APort includes the Discord guild, channel, user, selected action, and any custom JSON context.

## Development

```bash
npm test
npm run check
```

## Files

```text
src/index.js              Discord client entrypoint
src/register-commands.js  Slash command registration
src/commands.js           Command definitions and handlers
src/aport.js              APort policy verification helper
tests/                    Unit tests for parsing, context, and API behavior
```
