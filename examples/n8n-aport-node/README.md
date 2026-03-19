# APort Verification Node for n8n

A custom n8n node that integrates with APort for workflow verification with **conditional routing**.

## What's New in v2.0

- **Conditional Routing**: Automatically route workflows based on verification results
- **Two Outputs**: "Allowed" for verified actions, "Denied" for blocked actions
- **Better Error Handling**: Option to route errors to Denied output

## Prerequisites

- Node.js 18+
- n8n instance
- APort API key ([Get one here](https://aport.io/dashboard))

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/aporthq/aport-integrations.git
   cd aport-integrations/examples/n8n-aport-node
   ```

2. Copy this folder to your n8n custom nodes directory:
   - Local: `~/.n8n/nodes/`
   - Docker: `/data/nodes/`

3. Restart n8n

## Credentials

To use this node, you need to create APort API credentials in n8n:

1. Go to **Credentials** in n8n
2. Click **New Credential**
3. Select **APort API**
4. Enter your APort API key and optional project ID
5. Save

## Usage

### Basic Workflow

1. Add the APort Verify node to your workflow
2. Select your APort credentials
3. Configure the parameters:

| Parameter | Description | Required |
|-----------|-------------|----------|
| Action | The action to verify (e.g., 'send_email', 'api_call') | Yes |
| Actor ID | ID of the user/service performing the action | No |
| Actor Name | Name of the actor | No |
| Context | JSON object with additional context | No |
| Project ID | Your APort project ID | No |
| Fail on Error | Route errors to Denied output (default: true) | No |

### Conditional Routing

This node has **two outputs**:

1. **Allowed** (Output 0): When verification passes (`allow: true`)
2. **Denied** (Output 1): When verification fails (`allow: false`) or errors occur

Connect different workflow branches based on the verification result:

```
[Trigger] → [APort Verify] → [Allowed Branch]
                         → [Denied Branch]
```

### Example Use Cases

#### Email Verification
- Action: `send_email`
- Actor ID: `user-123`
- Context: `{"to": "user@example.com", "subject": "Alert"}`

#### API Call Verification
- Action: `api_request`
- Actor ID: `service-webhook`
- Context: `{"endpoint": "/api/data", "method": "POST"}`

#### File Operation Verification
- Action: `write_file`
- Actor ID: `automation-bot`
- Context: `{"path": "/data/output.txt", "operation": "create"}`

## Output

The node returns:

```json
{
  "success": true,
  "allow": true,
  "reasons": [],
  // Additional APort response fields
}
```

If verification is denied:
```json
{
  "success": true,
  "allow": false,
  "reasons": [
    "Rate limit exceeded",
    "Suspicious activity detected"
  ]
}
```

## Error Handling

- By default, errors are routed to the **Denied** output
- Set "Fail on Error" to false to throw errors instead
- Use "Continue On Fail" node setting for graceful error handling

## Workflow Example

Here's a typical security workflow:

```json
{
  "nodes": [
    {
      "name": "APort Verify",
      "type": "aportVerify",
      "parameters": {
        "action": "execute_code",
        "actorId": "{{ $json.user_id }}"
      },
      "typeVersion": 2,
      "onError": "continueErrorOutput"
    },
    {
      "name": "Execute Code",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "return items;"
      }
    },
    {
      "name": "Send Alert",
      "type": "n8n-nodes-base.slack",
      "parameters": {
        "channel": "#security-alerts",
        "text": "Action blocked: {{ $json.reasons }}"
      }
    }
  ]
}
```

## Development

To build the TypeScript:

```bash
npm install
npm run build
```

## Time & Space Complexity

- **Time Complexity**: O(1) for node processing, O(n) for API calls
- **Space Complexity**: O(1) for node operations

## Learn More

- [APort Documentation](https://docs.aport.io)
- [n8n Node Development](https://docs.n8n.io/integrations/creating-nodes/)
- [APort Dashboard](https://aport.io/dashboard)

## License

MIT
