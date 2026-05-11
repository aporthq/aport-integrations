# Integration Development Guide

This guide will help you create high-quality integrations for the APort ecosystem.

## 🎯 Integration Categories

### Agent Framework Integrations
Make APort the default trust layer for AI agent frameworks.

**Examples:**
- LangChain Tool Guard
- CrewAI Task Decorator
- n8n APort Node
- LangGraph Checkpoints

### E-commerce Platform Guardrails
Prove the refund use case with working platform integrations.

**Examples:**
- Shopify Refund Guardrail
- WooCommerce Plugin
- Stripe Connect Verification

### Developer Experience Tools
Reduce APort integration time from hours to minutes.

**Examples:**
- APort CLI Tool
- VS Code Extension
- Postman Collection

### Protocol Bridges & Standards
Position APort as the universal verify layer.

**Examples:**
- OpenAPI 3.1 Specification
- AP2 Bridge
- SPIFFE/SPIRE Integration

### Core Framework SDKs & Middleware
Native support for popular web frameworks.

**Examples:**
- Next.js Middleware
- Express.js Middleware
- FastAPI Middleware
- Django Middleware

## 🏗️ Integration Architecture

### Core Components

Every integration should include:

1. **Client/Service Layer**: Handles APort API communication
2. **Verification Logic**: Implements policy checking
3. **Error Handling**: Graceful failure modes
4. **Configuration**: Environment-based settings
5. **Documentation**: Clear usage instructions
6. **Tests**: Comprehensive test coverage

### Directory Structure

```
examples/[category]/[integration-name]/
├── README.md              # Integration documentation
├── package.json           # Dependencies (if applicable)
├── requirements.txt       # Python dependencies (if applicable)
├── src/                   # Source code
│   ├── index.js          # Main integration file
│   ├── client.js         # APort client wrapper
│   └── utils.js          # Helper functions
├── tests/                 # Test files
│   ├── integration.test.js
│   ├── client.test.js
│   └── utils.test.js
├── examples/              # Usage examples
│   ├── basic-usage.js
│   ├── advanced-usage.js
│   └── error-handling.js
├── docs/                  # Additional documentation
│   ├── api-reference.md
│   └── troubleshooting.md
└── .env.example          # Environment variables template
```

## 🔧 Development Process

### 1. Planning

Before you start coding:

- [ ] Understand the target platform/framework
- [ ] Identify key integration points
- [ ] Plan error handling strategies
- [ ] Design the API surface
- [ ] Consider security implications

### 2. Implementation

Follow these steps:

1. **Set up the project structure**
2. **Implement the core client**
3. **Add verification logic**
4. **Handle errors gracefully**
5. **Write comprehensive tests**
6. **Create documentation**
7. **Add usage examples**

### 3. Testing

Test your integration thoroughly:

- **Unit tests**: Test individual functions
- **Integration tests**: Test the full flow
- **Error tests**: Test failure scenarios
- **Performance tests**: Test with realistic data
- **Security tests**: Test for vulnerabilities

### 4. Documentation

Document everything:

- **README**: Clear setup and usage instructions
- **API Reference**: Complete function documentation
- **Examples**: Working code examples
- **Troubleshooting**: Common issues and solutions

## 📝 Code Standards

### JavaScript/TypeScript

```javascript
// Use modern ES6+ features
const { APortClient } = require('@aporthq/sdk-node');

class APortIntegration {
  constructor(options = {}) {
    this.client = new APortClient(options);
  }

  async verify(policy, agentId, context = {}) {
    try {
      const result = await this.client.verify(policy, agentId, context);
      return result;
    } catch (error) {
      console.error('Verification failed:', error.message);
      throw error;
    }
  }
}

module.exports = { APortIntegration };
```

### Python

```python
"""APort Integration for Python frameworks."""

import os
from typing import Dict, Any, Optional
from aporthq_sdk import APortClient


class APortIntegration:
    """APort integration for Python frameworks."""
    
    def __init__(self, api_key: Optional[str] = None):
        """Initialize the integration.
        
        Args:
            api_key: APort API key. If not provided, will use APORT_API_KEY env var.
        """
        self.client = APortClient(api_key or os.getenv('APORT_API_KEY'))
    
    async def verify(self, policy: str, agent_id: str) -> Dict[str, Any]:
        """Verify an agent against a policy.
        
        Args:
            policy: Policy pack identifier
            agent_id: Agent identifier
            
        Returns:
            Verification result
            
        Raises:
            APortError: If verification fails
        """
        try:
            result = await self.client.verify(policy, agent_id)
            return result
        except Exception as e:
            print(f"Verification failed: {e}")
            raise
```

### Django Middleware

Use the package under `examples/middleware/django` when building Django apps:

```python
INSTALLED_APPS = [
    "aport_django",
]

MIDDLEWARE = [
    "aport_django.middleware.APortVerificationMiddleware",
]

APORT_POLICIES = [
    {
        "path": "/payments/refund/",
        "methods": ["POST"],
        "policy": "finance.payment.refund.v1",
        "context": {"risk": "high"},
    }
]
```

The middleware extracts the agent ID from request headers, query parameters, form
data, or JSON bodies before calling `aporthq-sdk-python`.

### Go

```go
package aport

import (
    "context"
    "fmt"
    "os"
    
    "github.com/aporthq/sdk-go"
)

// Integration represents an APort integration
type Integration struct {
    client *sdk.Client
}

// NewIntegration creates a new APort integration
func NewIntegration(apiKey string) *Integration {
    if apiKey == "" {
        apiKey = os.Getenv("APORT_API_KEY")
    }
    
    return &Integration{
        client: sdk.NewClient(apiKey),
    }
}

// Verify verifies an agent against a policy
func (i *Integration) Verify(ctx context.Context, policy, agentID string) (*sdk.VerificationResult, error) {
    result, err := i.client.Verify(ctx, policy, agentID)
    if err != nil {
        return nil, fmt.Errorf("verification failed: %w", err)
    }
    
    return result, nil
}
```

## 🧪 Testing Guidelines

### Test Structure

```javascript
// tests/integration.test.js
const { APortIntegration } = require('../src');
const { mockAPortAPI } = require('./mocks');

describe('APortIntegration', () => {
  let integration;
  
  beforeEach(() => {
    integration = new APortIntegration({
      apiKey: 'test-key'
    });
  });
  
  describe('verify', () => {
    it('should verify agent successfully', async () => {
      // Arrange
      mockAPortAPI.verify.mockResolvedValue({
        verified: true,
        passport: { /* mock passport */ }
      });
      
      // Act
      const result = await integration.verify('finance.payment.refund.v1', 'agt_123');
      
      // Assert
      expect(result.verified).toBe(true);
      expect(mockAPortAPI.verify).toHaveBeenCalledWith('finance.payment.refund.v1', 'agt_123');
    });
    
    it('should handle verification failure', async () => {
      // Arrange
      mockAPortAPI.verify.mockRejectedValue(new Error('Verification failed'));
      
      // Act & Assert
      await expect(integration.verify('finance.payment.refund.v1', 'agt_123'))
        .rejects.toThrow('Verification failed');
    });
  });
});
```

### Test Requirements

- **Unit Tests**: Test individual functions and methods
- **Integration Tests**: Test the full integration flow
- **Error Cases**: Test error handling and edge cases
- **Mocking**: Mock external API calls
- **Coverage**: Minimum 80% code coverage
- **Performance**: Test with realistic data sizes

## 📚 Documentation Standards

### README Template

```markdown
# [Integration Name]

Brief description of what this integration does.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- APort account

### Installation
```bash
npm install
```

### Configuration
```bash
cp .env.example .env
# Edit .env with your credentials
```

### Usage
```javascript
// Basic usage example
const { APortIntegration } = require('./src');

const integration = new APortIntegration({
  apiKey: process.env.APORT_API_KEY
});
```

## 📚 API Reference

### Methods

#### `verify(policy, agentId)`
Verifies an agent against a policy.

**Parameters:**
- `policy` (string): Policy pack identifier
- `agentId` (string): Agent identifier

**Returns:** Promise<VerificationResult>

## 🧪 Testing

```bash
npm test
```

## 📄 License

MIT
```

## 🔒 Security Considerations

### Environment Variables

Never hardcode sensitive information:

```javascript
// ❌ Bad
const apiKey = 'sk_live_1234567890abcdef';

// ✅ Good
const apiKey = process.env.APORT_API_KEY;
```

### Error Handling

Don't expose sensitive information in errors:

```javascript
// ❌ Bad
catch (error) {
  throw new Error(`API call failed: ${error.response.data}`);
}

// ✅ Good
catch (error) {
  console.error('API call failed:', error.message);
  throw new Error('Verification failed');
}
```

### Input Validation

Validate all inputs:

```javascript
function verify(policy, agentId) {
  if (!policy || typeof policy !== 'string') {
    throw new Error('Policy must be a non-empty string');
  }
  
  if (!agentId || typeof agentId !== 'string') {
    throw new Error('Agent ID must be a non-empty string');
  }
  
  // ... rest of implementation
}
```

## 🚀 Deployment

### Package Management

For JavaScript/TypeScript:
- Publish to npm
- Use semantic versioning
- Include proper package.json metadata

For Python:
- Publish to PyPI
- Use proper setup.py or pyproject.toml
- Include proper classifiers

For Go:
- Use proper module structure
- Tag releases with semantic versions
- Include proper go.mod

### CI/CD

Set up automated testing and deployment:

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
      - name: Run linting
        run: npm run lint
```

## 🤝 Contributing

When contributing to an integration:

1. **Fork** the repository
2. **Create** a feature branch
3. **Follow** the coding standards
4. **Write** comprehensive tests
5. **Update** documentation
6. **Submit** a pull request

## 📞 Support

Need help? We're here for you:

- **Discord**: [Join our Discord](https://discord.gg/aport)
- **GitHub**: [Open an issue](https://github.com/aporthq/aport-integrations/issues)
- **Email**: [Contact us](mailto:support@aport.io)

---

Happy coding! 🚀
