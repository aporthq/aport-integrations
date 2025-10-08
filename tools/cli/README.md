# APort CLI Tool

A simple command-line tool for testing APort agent verification and passport management. Perfect for developers who want to quickly test APort functionality without building a full integration.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- APort API key (optional for verification commands, required for passport management)

### Installation

```bash
# Clone the repository
git clone https://github.com/aporthq/aport-integrations.git
cd aport-integrations/examples/developer-tools/cli

# Install dependencies
npm install

# Optional: Set up environment for passport management
cp env.example .env
# Edit .env with your APort API key (only needed for create-passport, get-passport)
```

### Basic Usage

```bash
# Run the demo (uses sample agent IDs) - NO API KEY NEEDED!
npm start demo

# Interactive verification - NO API KEY NEEDED!
npm start verify -- --interactive

# Direct verification with real agent IDs - NO API KEY NEEDED!
npm start verify ap_a2d10232c6534523812423eec8a1425c finance.payment.refund.v1 '{"amount":50}'

# Or using options
npm start verify -a ap_a2d10232c6534523812423eec8a1425c -p finance.payment.refund.v1 -c '{"amount":50}'

# Get passport information - NO API KEY NEEDED!
npm start get-passport -- --interactive

# Create a new passport (requires API key)
npm start create-passport -- --interactive
```

## 📋 Available Commands

### `verify` - Verify an agent against a policy

```bash
# Interactive mode
aport verify --interactive

# Direct mode (positional arguments)
aport verify agt_inst_refund_bot_123 finance.payment.refund.v1 '{"amount":50}'

# Direct mode (options)
aport verify -a agt_inst_refund_bot_123 -p finance.payment.refund.v1 -c '{"amount":50}'
```

### `policy` - Verify against specific policy pack

```bash
aport policy -a agt_inst_data_exporter_456 -p data.export.v1 -c '{"rows":1000}'
```

### `create-passport` - Create a new agent passport

```bash
# Interactive mode
aport create-passport --interactive

# Default mode (creates test passport)
aport create-passport
```

### `get-passport` - Get passport information

```bash
# Interactive mode (no API key needed!)
aport get-passport --interactive

# Direct mode (no API key needed!)
aport get-passport -a ap_a2d10232c6534523812423eec8a1425c
```

### `demo` - Run complete demo

```bash
aport demo
```

### `help` - Show help and examples

```bash
aport help
```

## 🎯 Sample Agent IDs

The CLI includes pre-configured sample agent IDs for testing:

| Agent | ID | Description |
|-------|----|-----------| 
| `refund-bot` | `agt_inst_refund_bot_123` | Handles refund processing |
| `data-exporter` | `agt_inst_data_exporter_456` | Exports data with limits |
| `pr-merger` | `agt_inst_pr_merger_789` | Merges pull requests |

## 📦 Policy Packs

Test against these policy packs:

- `finance.payment.refund.v1` - Refund processing policies
- `data.export.v1` - Data export policies  
- `code.repository.merge.v1` - Repository operation policies
- `admin.access.v1` - Admin access policies

## 🔧 Configuration

### Environment Variables

```bash
# Optional - Only needed for create-passport command
APORT_API_KEY=your_api_key_here

# Optional - Override default API endpoint
APORT_BASE_URL=https://aport.io
```

**Note:** Most commands (`verify`, `policy`, `get-passport`, `demo`) work without an API key! Only `create-passport` requires authentication.

### API Client

The CLI uses a simple API client that handles:

- ✅ Agent verification (`/api/verify`)
- ✅ Policy verification (`/api/verify/policy/{policy}`)
- ✅ Passport creation (`/api/issue`)
- ✅ Passport retrieval (`/api/passports/{id}`)
- ✅ Passport suspension (`/api/suspend`)
- ✅ Policy pack listing (`/api/policies`)

## 🧪 Testing

```bash
# Run tests
npm test

# Run demo
npm start demo
```

## 📝 Examples

### Example 1: Verify Refund Bot

```bash
aport verify -a agt_inst_refund_bot_123 -p finance.payment.refund.v1 -c '{"amount":50,"currency":"USD"}'
```

### Example 2: Create Test Passport

```bash
aport create-passport --interactive
```

### Example 3: Check Data Export Limits

```bash
aport policy -a agt_inst_data_exporter_456 -p data.export.v1 -c '{"rows":5000,"dataset":"users"}'
```

### Example 4: Get Admin Bot Passport

```bash
aport get-passport -a agt_inst_admin_bot_101
```

## 🎨 Features

- **Interactive Mode**: Easy-to-use prompts for all operations
- **Sample Data**: Pre-configured agent IDs for quick testing
- **Error Handling**: Clear error messages and validation
- **Colored Output**: Beautiful terminal output with chalk
- **Spinner**: Loading indicators for API calls
- **Demo Mode**: Complete walkthrough of all features

## 🛠️ Development

### Project Structure

```
src/
├── index.js      # CLI commands and interface
├── client.js     # APort API client
└── ...

package.json      # Dependencies and scripts
env.example       # Environment variables template
README.md         # This file
```

### Adding New Commands

1. Add command to `program.command()` in `src/index.js`
2. Implement the command logic
3. Add corresponding API method to `src/client.js` if needed
4. Update this README

### API Client Methods

- `verify(policy, agentId, context)` - Verify agent
- `verifyPolicy(policy, agentId, context)` - Verify specific policy
- `createPassport(passportData)` - Create passport
- `getPassport(agentId)` - Get passport
- `suspendPassport(agentId, reason)` - Suspend passport
- `getPolicyPack(policyId)` - Get policy pack
- `listPolicyPacks()` - List all policy packs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT

---

**🛡️ Secure your AI agents. Trust but verify.**

Made with ❤️ by the APort community
