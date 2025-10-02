# 🛡️ APort Integrations

<div align="center">

![APort Logo](https://img.shields.io/badge/APort-Integrations-06b6d4?style=for-the-badge&logo=shield&logoColor=white)

**Community-built integrations, SDKs, and tools for the APort ecosystem**

[![GitHub Issues](https://img.shields.io/github/issues/aporthq/aport-integrations?style=flat-square&logo=github)](https://github.com/aporthq/aport-integrations/issues)
[![GitHub PRs](https://img.shields.io/github/issues-pr/aporthq/aport-integrations?style=flat-square&logo=github)](https://github.com/aporthq/aport-integrations/pulls)
[![License](https://img.shields.io/badge/License-MIT-f59e0b?style=flat-square)](LICENSE)
[![Hacktoberfest](https://img.shields.io/badge/Hacktoberfest-Accepted-ff6900?style=flat-square&logo=digitalocean)](https://hacktoberfest.digitalocean.com/)

[🌐 APort Website](https://aport.io) • [📚 Documentation](https://aport.io/docs) • [🚀 Try APort](https://aport.io/dashboard) • [💬 Discord](https://discord.gg/aport)

</div>

---

## 🎯 About APort Integrations

This repository houses community-contributed integrations, SDKs, middleware, and tools that extend APort's capabilities across different platforms, frameworks, and use cases. Each integration demonstrates how to implement APort's agent identity verification and policy enforcement in real-world scenarios.

### 🏆 What Makes APort Special?

- **🆔 Agent Identity**: Portable passports with capabilities & limits
- **📋 Policy Packs**: Pre-built policies for common actions (refunds, data export, PR merges)
- **⚡ Real-time Verify**: Sub-100ms policy checks with global suspend capability
- **🔐 Multi-level Assurance**: Email, GitHub, Domain verification levels
- **🌐 Platform Agnostic**: Works across all platforms and frameworks

---


## 📦 Official SDKs

The official APort SDKs are maintained in the [aport-sdks repository](https://github.com/aporthq/aport-sdks).

### Node.js/JavaScript

- **Core SDK**: [@aporthq/sdk-node](https://github.com/aporthq/aport-sdks/tree/main/javascript) - Core Node.js SDK
- **Express Middleware**: [@aporthq/middleware-express](https://github.com/aporthq/aport-sdks/tree/main/express) - Express.js middleware
- **Next.js Middleware**: [@aporthq/middleware-nextjs](https://github.com/aporthq/aport-sdks/tree/main/nextjs) - Next.js middleware (needed)
- **n8n Node**: [@aporthq/n8n-node](https://github.com/aporthq/aport-sdks/tree/main/n8n) - Custom n8n node (needed)
- **Zapier App**: [@aporthq/zapier-app](https://github.com/aporthq/aport-sdks/tree/main/zapier) - Zapier custom app (needed)

### Python

- **Core SDK**: [aporthq-sdk-python](https://github.com/aporthq/aport-sdks/tree/main/python) - Core Python SDK
- **FastAPI Middleware**: [agent-passport-middleware-fastapi](https://github.com/aporthq/aport-sdks/tree/main/fastapi) - FastAPI middleware
- **Django Middleware**: [aporthq-middleware-django](https://github.com/aporthq/aport-sdks/tree/main/django) - Django middleware (needed)
- **LangChain Integration**: [aporthq-langchain](https://github.com/aporthq/aport-sdks/tree/main/langchain) - LangChain tool guard (needed)
- **CrewAI Integration**: [aporthq-crewai](https://github.com/aporthq/aport-sdks/tree/main/crewai) - CrewAI decorator (needed)
- **LangGraph Integration**: [aporthq-langgraph](https://github.com/aporthq/aport-sdks/tree/main/langgraph) - LangGraph checkpoints (needed)

### PHP

- **Core SDK**: [aporthq-sdk-php](https://github.com/aporthq/aport-sdks/tree/main/php) - Core PHP SDK (needed)
- **Laravel Middleware**: [aporthq-middleware-laravel](https://github.com/aporthq/aport-sdks/tree/main/laravel) - Laravel middleware (needed)
- **WordPress Plugin**: [aporthq-woocommerce](https://github.com/aporthq/aport-sdks/tree/main/woocommerce) - WooCommerce plugin (needed)

### Ruby

- **Core SDK**: [aporthq-sdk-ruby](https://github.com/aporthq/aport-sdks/tree/main/ruby) - Core Ruby SDK (needed)
- **Rails Gem**: [aporthq-rails](https://github.com/aporthq/aport-sdks/tree/main/rails) - Rails gem (needed)

### Go

- **Core SDK**: [aporthq-sdk-go](https://github.com/aporthq/aport-sdks/tree/main/go) - Core Go SDK (needed)
- **Gin Middleware**: [aporthq-middleware-gin](https://github.com/aporthq/aport-sdks/tree/main/gin) - Gin framework middleware (needed)
- **Echo Middleware**: [aporthq-middleware-echo](https://github.com/aporthq/aport-sdks/tree/main/echo) - Echo framework middleware (needed)
- **Fiber Middleware**: [aporthq-middleware-fiber](https://github.com/aporthq/aport-sdks/tree/main/fiber) - Fiber framework middleware (needed)

### E-commerce Platforms

- **Shopify App**: [aporthq-shopify](https://github.com/aporthq/aport-sdks/tree/main/shopify) - Shopify app with refund guardrails (needed)
- **Stripe Integration**: [aporthq-stripe](https://github.com/aporthq/aport-sdks/tree/main/stripe) - Stripe Connect verification (needed)

### Developer Tools

- **CLI Tool**: [@aporthq/cli](https://github.com/aporthq/aport-sdks/tree/main/cli) - APort CLI for scaffolding (needed)
- **VS Code Extension**: [aporthq-vscode](https://github.com/aporthq/aport-sdks/tree/main/vscode) - VS Code extension (needed)
- **Postman Collection**: [aporthq-postman](https://github.com/aporthq/aport-sdks/tree/main/postman) - Postman collection (needed)

### Protocol Bridges

- **OpenAPI Spec**: [aporthq-openapi](https://github.com/aporthq/aport-sdks/tree/main/openapi) - OpenAPI 3.1 specification (needed)
- **AP2 Bridge**: [aporthq-ap2](https://github.com/aporthq/aport-sdks/tree/main/ap2) - AP2 payment bridge (needed)
- **SPIFFE/SPIRE**: [aporthq-spiffe](https://github.com/aporthq/aport-sdks/tree/main/spiffe) - SPIFFE/SPIRE integration (needed)

## 🎯 Strategic Need for Comprehensive SDK Coverage

Based on our [Hacktoberfest 2025 strategy](https://github.com/aporthq/aport-integrations/blob/main/HACKTOBERFEST-STRATEGY.md), we need to establish APort as the **default trust rail for the AI agent economy**. This requires:

### **Agent Framework Coverage** (Highest Priority)
- **LangChain**: Most popular AI framework - needs tool guard integration
- **CrewAI**: Multi-agent orchestration - needs task verification decorator
- **n8n**: Low-code automation - needs custom verification node
- **LangGraph**: State machine workflows - needs checkpoint integration
- **Zapier**: No-code automation - needs custom app

### **E-commerce Platform Integration** (Design Partner Demos)
- **Shopify**: Complete app with refund guardrails
- **WooCommerce**: WordPress plugin for order verification
- **Stripe**: Connect payout verification

### **Developer Experience Tools** (Reduce Integration Friction)
- **CLI Tool**: `npx create-aport-integration` scaffolding
- **VS Code Extension**: Policy development with IntelliSense
- **Postman Collection**: Complete API testing suite

### **Framework Middleware** (Native Support)
- **Next.js**: App Router and Pages Router support
- **Django**: Python web framework middleware
- **Laravel**: PHP framework with Artisan commands
- **Rails**: Ruby gem with generators
- **Go Frameworks**: Gin, Echo, Fiber middleware

### **Protocol Bridges** (Universal Interoperability)
- **OpenAPI 3.1**: Complete API specification
- **AP2 Bridge**: Payment authorization integration
- **SPIFFE/SPIRE**: Enterprise identity federation

## 🚀 Quick Start

### 1. Browse Available Integrations

```bash
# Clone the repository
git clone https://github.com/aporthq/aport-integrations.git
cd aport-integrations

# Explore integrations by category
ls examples/
# agent-frameworks/  ecommerce/  developer-tools/  middleware/  protocol-bridges/
```

### 2. Try an Integration

```bash
# Example: LangChain Tool Guard
cd examples/agent-frameworks/langchain
npm install
npm run example

# Example: Express.js Middleware
cd examples/middleware/express
npm install
npm start
```

### 3. Create Your Own Integration

```bash
# Use our CLI to scaffold a new integration
npx create-aport-integration my-integration
cd my-integration
npm install
```

---

## 📁 Repository Structure

```
aport-integrations/
├── examples/                    # Working integration examples
│   ├── agent-frameworks/        # LangChain, CrewAI, n8n, etc.
│   ├── ecommerce/              # Shopify, WooCommerce, Stripe
│   ├── middleware/             # Express, FastAPI, Django, etc.
│   └── protocol-bridges/       # OpenAPI, AP2, SPIFFE/SPIRE
├── tools/                      # Developer tools and utilities
│   ├── cli/                    # APort CLI for scaffolding
│   ├── vscode-extension/       # VS Code extension
│   └── postman-collection/     # Postman collection
├── templates/                  # Integration scaffolding templates
│   ├── javascript-middleware/  # Express.js template
│   └── python-middleware/      # FastAPI template
├── sdk/                        # References to official SDKs
│   └── README.md               # Links to aport-sdks repository
└── docs/                       # Integration documentation
```

### 📋 Directory Purposes

- **`examples/`** - **Working integration examples** that demonstrate real-world usage of APort
- **`tools/`** - **Developer tools and utilities** (CLI, VS Code extension, Postman collection)
- **`templates/`** - **Scaffolding templates** for quick integration development and consistent structure
- **`sdk/`** - **References to official APort SDKs** maintained in the aport-sdks repository

---

## 🎨 Integration Categories

### 🤖 **Agent Framework Integrations**
Make APort the default trust layer for AI agent frameworks.

| Integration | Description | Status | Maintainer |
|-------------|-------------|--------|------------|
| [LangChain Tool Guard](examples/agent-frameworks/langchain/) | Secure LangChain tools with APort verification | ✅ Active | Community |
| [CrewAI Task Decorator](examples/agent-frameworks/crewai/) | `@aport_verify` decorator for CrewAI tasks | ✅ Active | Community |
| [n8n APort Node](examples/agent-frameworks/n8n/) | Custom n8n node for APort verification | 🚧 In Progress | Community |
| [LangGraph Checkpoints](examples/agent-frameworks/langgraph/) | APort verification in LangGraph state machines | 📋 Planned | Community |

### 🛒 **E-commerce Platform Guardrails**
Prove the refund use case with working platform integrations.

| Integration | Description | Status | Maintainer |
|-------------|-------------|--------|------------|
| [Shopify Refund Guardrail](examples/ecommerce/shopify/) | Complete Shopify app with APort verification | ✅ Active | Community |
| [WooCommerce Plugin](examples/ecommerce/woocommerce/) | WordPress plugin for order/refund verification | 🚧 In Progress | Community |
| [Stripe Connect Verification](examples/ecommerce/stripe/) | Webhook handler for Stripe Connect payouts | 📋 Planned | Community |

### 🔧 **Developer Experience Tools**
Reduce APort integration time from hours to minutes.

| Tool | Description | Status | Maintainer |
|------|-------------|--------|------------|
| [APort CLI](tools/cli/) | `npx create-aport-integration` scaffolding tool | ✅ Active | Community |
| [VS Code Extension](tools/vscode-extension/) | Policy development with IntelliSense | 🚧 In Progress | Community |
| [Postman Collection](tools/postman-collection/) | Complete API testing collection | ✅ Active | Community |

### 🌉 **Protocol Bridges & Standards**
Position APort as the universal verify layer.

| Bridge | Description | Status | Maintainer |
|--------|-------------|--------|------------|
| [OpenAPI 3.1 Spec](examples/protocol-bridges/openapi/) | Complete OpenAPI specification | ✅ Active | Community |
| [AP2 Bridge](examples/protocol-bridges/ap2/) | APort passport authorization for AP2 payments | 📋 Planned | Community |
| [SPIFFE/SPIRE Integration](examples/protocol-bridges/spiffe/) | Enterprise identity federation | 📋 Planned | Community |

### 🛠️ **Core Framework SDKs & Middleware**
Native support for popular web frameworks.

| Framework | SDK/Middleware | Status | Maintainer |
|-----------|----------------|--------|------------|
| Next.js | Middleware package | ✅ Active | Community |
| Express.js | Middleware package | ✅ Active | Community |
| FastAPI | Middleware package | ✅ Active | Community |
| Django | Middleware package | 🚧 In Progress | Community |
| Laravel | Composer package | 📋 Planned | Community |
| Rails | Ruby gem | 📋 Planned | Community |
| Go | Official SDK | 🚧 In Progress | Community |

---

## 🎯 Real-World Examples

### 💳 E-commerce Refund Protection

```javascript
// Express.js with APort middleware
const { createAPortMiddleware } = require("@aporthq/middleware-express");

const aportMiddleware = createAPortMiddleware({
  apiKey: process.env.APORT_API_KEY
});

app.post("/api/refunds", 
  aportMiddleware("payments.refund.v1"),
  async (req, res) => {
    // Policy already verified! Check specific limits
    const passport = req.aport.passport;
    
    if (req.body.amount > passport.limits.refund_amount_max_per_tx) {
      return res.status(403).json({
        error: "Refund exceeds limit",
        requested: req.body.amount,
        limit: passport.limits.refund_amount_max_per_tx
      });
    }

    // Process refund safely
    const refund = await stripe.refunds.create({
      amount: req.body.amount,
      payment_intent: req.body.payment_intent
    });
    
    res.json({ success: true, refund });
  }
);
```

### 🤖 LangChain Tool Protection

```python
# LangChain with APort Tool Guard
from aporthq_sdk import APortClient
from langchain.tools import Tool

def refund_tool(order_id: str, amount: float) -> str:
    return f"Refunded ${amount} for order {order_id}"

# Initialize APort client
aport_client = APortClient(api_key=os.getenv("APORT_API_KEY"))

# Create protected tool wrapper
class APortToolGuard:
    def __init__(self, tool, policy_pack, agent_id):
        self.tool = tool
        self.policy_pack = policy_pack
        self.agent_id = agent_id
    
    async def __call__(self, *args, **kwargs):
        # Verify agent before tool execution
        result = await aport_client.verify(self.policy_pack, self.agent_id)
        if not result.verified:
            raise Exception("Agent verification failed")
        
        # Execute tool if verified
        return self.tool(*args, **kwargs)

# Wrap tool with APort verification
protected_refund_tool = APortToolGuard(
    tool=Tool(
        name="refund_tool",
        description="Process customer refunds",
        func=refund_tool
    ),
    policy_pack="payments.refund.v1",
    agent_id="agt_inst_xyz789"
)

# Use in agent
agent = initialize_agent([protected_refund_tool], llm, agent_type="zero-shot-react-description")
```

### 🔀 GitHub Actions Integration

```yaml
# .github/workflows/aport-verify.yml
name: APort Verify PR
on: [pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aporthq/policy-verify-action@v1
        with:
          agent-id: ${{ secrets.APORT_AGENT_ID }}
          policy-pack: 'repo.v1'
          context: |
            {
              "repo": "${{ github.repository }}",
              "base": "${{ github.event.pull_request.base.ref }}",
              "head": "${{ github.event.pull_request.head.ref }}",
              "files_changed": ${{ toJson(github.event.pull_request.changed_files) }}
            }
```

---

## 🏆 Hacktoberfest 2025

We're participating in [Hacktoberfest 2025](https://hacktoberfest.digitalocean.com/)! Join us in building the future of AI agent security.

### 🎁 Rewards & Recognition

- **💰 Bounties**: $15-$50 per merged PR
- **👕 Swag**: APort Champion T-shirts for contributors
- **🏆 Grand Prizes**: Up to $150 for exceptional contributions
- **🌟 Recognition**: Featured on our website and social media

### 🚀 How to Participate

1. **Fork** this repository
2. **Browse** [open issues](https://github.com/aporthq/aport-integrations/issues) labeled `hacktoberfest`
3. **Claim** an issue by commenting "I'd like to work on this"
4. **Build** your integration following our [contribution guidelines](CONTRIBUTING.md)
5. **Submit** a pull request with your implementation
6. **Get paid** via Chimoney when your PR is merged!

### 🎯 Priority Issues

- [ ] [LangChain Tool Guard](https://github.com/aporthq/aport-integrations/issues/1) - $50
- [ ] [CrewAI Task Decorator](https://github.com/aporthq/aport-integrations/issues/2) - $50
- [ ] [Shopify Refund Guardrail](https://github.com/aporthq/aport-integrations/issues/3) - $50
- [ ] [APort CLI Tool](https://github.com/aporthq/aport-integrations/issues/4) - $50

[View all Hacktoberfest issues →](https://github.com/aporthq/aport-integrations/issues?q=is:issue+is:open+label:hacktoberfest)

---

## 🤝 Contributing

We love contributions! Whether you're fixing bugs, adding features, or creating new integrations, your work helps make APort better for everyone.

### 🚀 Quick Contribution Guide

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-integration`
3. **Follow** our [coding standards](CONTRIBUTING.md#coding-standards)
4. **Test** your integration thoroughly
5. **Document** your work with clear README files
6. **Submit** a pull request

### 📋 Integration Requirements

- ✅ **Working Example**: Must include a complete, runnable example
- ✅ **Documentation**: Clear README with setup instructions
- ✅ **Tests**: Unit tests for core functionality
- ✅ **Error Handling**: Graceful failure modes
- ✅ **Security**: No hardcoded secrets or credentials

### 🎨 Code Standards

- **Language-specific**: Follow standard conventions (ESLint, Black, gofmt)
- **Documentation**: Include docstrings and comments
- **Testing**: Minimum 80% code coverage
- **Security**: Use environment variables for secrets

[Read our full Contributing Guide →](CONTRIBUTING.md)

---

## 📚 Resources

### 🔗 **APort Resources**
- [📖 Documentation](https://aport.io/docs) - Complete guides and API reference
- [🎮 Playground](https://aport.io/playground) - Try APort in your browser
- [📺 Video Tutorials](https://youtube.com/@aport) - Step-by-step guides
- [💡 Examples](https://github.com/aporthq/aport-examples) - Real-world implementations

### 🛠️ **Development Resources**
- [API Reference](https://api.aport.io/docs) - Complete API documentation
- [Policy Packs](https://github.com/aporthq/aport-policies) - Pre-built policy definitions
- [SDKs](https://github.com/aporthq/aport-sdks) - Language-specific SDKs
- [Specification](https://github.com/aporthq/aport-spec) - AI Passport Specification
- [GitHub Actions](https://github.com/aporthq/policy-verify-action) - CI/CD integrations

### 💬 **Community**
- [Discord](https://discord.gg/aport) - Chat with the community
- [GitHub Discussions](https://github.com/aporthq/aport-integrations/discussions) - Ask questions
- [Twitter](https://twitter.com/aporthq) - Follow for updates
- [LinkedIn](https://linkedin.com/company/aporthq) - Professional updates

---

## 📊 Project Status

<div align="center">

| **Metric** | **Count** | **Status** |
|------------|-----------|------------|
| **🔧 Integrations** | 15+ | ✅ Active |
| **📦 SDKs** | 5+ | ✅ Active |
| **🛠️ Tools** | 8+ | ✅ Active |
| **👥 Contributors** | 25+ | 🌟 Growing |
| **⭐ Stars** | 100+ | 🚀 Rising |

</div>

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**🛡️ Secure your AI agents. Trust but verify.**

[![GitHub](https://img.shields.io/badge/GitHub-Follow-black?style=social&logo=github)](https://github.com/aporthq)
[![Twitter](https://img.shields.io/badge/Twitter-Follow-06b6d4?style=social&logo=twitter)](https://twitter.com/aporthq)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Follow-06b6d4?style=social&logo=linkedin)](https://linkedin.com/company/aporthq)
[![Discord](https://img.shields.io/badge/Discord-Join-5865f2?style=social&logo=discord)](https://discord.gg/aport)

Made with ❤️ by the APort community

</div>
