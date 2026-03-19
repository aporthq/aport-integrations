# Zapier Custom App for APort

Official Zapier integration for APort verification.

## What is Zapier?

Zapier is a workflow automation platform that connects your apps and automates tasks.

## Installation

### Option 1: Use Public App

Search for "APort Verify" in the Zapier marketplace and install it.

### Option 2: Private App

1. Clone this repository
2. Run `npm install`
3. Deploy to Zapier using:
   ```bash
   zapier push
   ```

## Setup

1. **Create APort Account**: Get your API key from [aport.io](https://aport.io/dashboard)
2. **Connect Zapier**:
   - Add "APort Verify" action in your Zap
   - Enter your API Key
   - Optionally enter Project ID

## Usage

### Verify Action

Send any action through APort for verification:

**Input Fields:**
- `action`: The action name (e.g., "send_email", "api_call")
- `actor_id`: User or service ID
- `actor_name`: Name (optional)
- `context`: Additional context as JSON

**Output:**
- `allow`: Boolean - whether action is allowed
- `reasons`: Array of denial reasons (if denied)

## Example Zaps

### Gmail: Verify Before Send

Trigger: New email in Gmail
Action: APort Verify
- action: "send_email"
- actor_id: {{email_from}}
- context: {{subject}}

### Slack: Verify Command

Trigger: Slack command
Action: APort Verify
- action: "slack_command"
- actor_id: {{user_id}}
- context: {{command}}

### Form: Verify Submission

Trigger: Typeform submission
Action: APort Verify
- action: "form_submit"
- actor_id: {{form_response_id}}
- context: {{all_answers}}

## Development

```bash
# Install dependencies
npm install

# Test locally
zapier test

# Deploy to Zapier
zapier push
```

## API Reference

### Authentication

Use Bearer token authentication with your APort API key.

### Rate Limits

- 100 requests/minute (free tier)
- 1000 requests/minute (paid tier)

## Support

- Documentation: [docs.aport.io](https://docs.aport.io)
- Issues: [github.com/aporthq/aport-integrations](https://github.com/aporthq/aport-integrations)

## License

MIT
