# 🤝 Contributing to APort Integrations

Thank you for your interest in contributing to APort Integrations! This guide will help you get started with contributing to our community-driven repository.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Integration Requirements](#integration-requirements)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation Standards](#documentation-standards)
- [Hacktoberfest Guidelines](#hacktoberfest-guidelines)
- [Review Process](#review-process)
- [Release Process](#release-process)

## 📜 Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ (for JavaScript/TypeScript integrations)
- **Python** 3.9+ (for Python integrations)
- **Go** 1.19+ (for Go integrations)
- **PHP** 8.0+ (for PHP integrations)
- **Git** (for version control)
- **APort Account** ([Sign up here](https://aport.io/dashboard))

### Fork and Clone

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/aport-integrations.git
   cd aport-integrations
   ```
3. **Add upstream** remote:
   ```bash
   git remote add upstream https://github.com/aporthq/aport-integrations.git
   ```

### Development Setup

1. **Install dependencies** (if any):
   ```bash
   # For Node.js projects
   npm install
   
   # For Python projects
   pip install -r requirements.txt
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your APort API credentials
   ```

3. **Run tests** to ensure everything works:
   ```bash
   npm test  # or pytest, go test, etc.
   ```

## 🔄 Development Workflow

### 1. Choose an Issue

- Browse [open issues](https://github.com/aporthq/aport-integrations/issues)
- Look for issues labeled `hacktoberfest`, `good first issue`, or `help wanted`
- Comment "I'd like to work on this" to claim an issue

### 2. Create a Branch

```bash
git checkout -b feature/your-integration-name
# or
git checkout -b fix/issue-description
```

### 3. Use Integration Templates (Recommended)

We provide scaffolding templates to help you get started quickly:

```bash
# For JavaScript/Node.js integrations
cp -r templates/javascript-middleware examples/your-integration-name
cd examples/your-integration-name

# For Python integrations
cp -r templates/python-middleware examples/your-integration-name
cd examples/your-integration-name
```

**Template Benefits:**
- ✅ **Consistent structure** across all integrations
- ✅ **Pre-configured dependencies** and build tools
- ✅ **Example code** and tests already set up
- ✅ **Documentation templates** ready to customize
- ✅ **Best practices** embedded in the template

**Template Customization:**
1. **Update package.json/pyproject.toml** with your integration details
2. **Modify the source code** to implement your specific functionality
3. **Update tests** to cover your integration's behavior
4. **Customize README.md** with your integration's documentation
5. **Add examples** showing real-world usage

**Available Templates:**
- **`templates/javascript-middleware/`** - Express.js middleware template
- **`templates/python-middleware/`** - FastAPI middleware template

**Template Structure:**
```
templates/[language]-[framework]/
├── README.md              # Template documentation
├── package.json           # Dependencies and scripts
├── src/                   # Source code template
├── tests/                 # Test template
├── examples/              # Usage examples
└── .env.example          # Environment variables template
```

### 4. Make Changes

- Follow our [coding standards](#coding-standards)
- Write tests for your changes
- Update documentation as needed

### 5. Test Your Changes

```bash
# Run all tests
npm test

# Run specific tests
npm test -- --grep "your test"

# Lint your code
npm run lint
```

### 6. Commit Your Changes

```bash
git add .
git commit -m "feat: add LangChain Tool Guard integration

- Implement APortToolGuard class
- Add verification before tool execution
- Include comprehensive tests
- Add documentation and examples

Closes #123"
```

**Commit Message Format:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

### 7. Push and Create PR

```bash
git push origin feature/your-integration-name
```

Then create a pull request on GitHub with:
- Clear title and description
- Reference the issue being closed
- Include screenshots or demos if applicable

## 📋 Integration Requirements

### ✅ Must Have

- **Working Example**: Complete, runnable integration
- **Documentation**: Clear README with setup instructions
- **Tests**: Unit tests with minimum 80% coverage
- **Error Handling**: Graceful failure modes
- **Security**: No hardcoded secrets or credentials
- **Environment Variables**: Use `.env` files for configuration

### 📁 Directory Structure

```
examples/[category]/[integration-name]/
├── README.md              # Integration documentation
├── package.json           # Dependencies (if applicable)
├── requirements.txt       # Python dependencies (if applicable)
├── src/                   # Source code
│   ├── index.js          # Main integration file
│   └── utils.js          # Helper functions
├── tests/                 # Test files
│   ├── integration.test.js
│   └── utils.test.js
├── examples/              # Usage examples
│   ├── basic-usage.js
│   └── advanced-usage.js
└── .env.example          # Environment variables template
```

### 📝 README Template

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

## 🎨 Coding Standards

### JavaScript/TypeScript

```javascript
// Use modern ES6+ features
const { APortClient } = require('@aporthq/sdk');

class APortIntegration {
  constructor(options = {}) {
    this.client = new APortClient(options);
  }

  async verify(policy, agentId) {
    try {
      const result = await this.client.verify(policy, agentId);
      return result;
    } catch (error) {
      console.error('Verification failed:', error.message);
      throw error;
    }
  }
}

module.exports = { APortIntegration };
```

**Standards:**
- Use `const`/`let` instead of `var`
- Use arrow functions for callbacks
- Use async/await instead of Promises
- Use template literals for strings
- Use destructuring for object properties
- Use meaningful variable and function names
- Add JSDoc comments for public methods

### Python

```python
"""APort Integration for Python frameworks."""

import os
from typing import Dict, Any, Optional
from aport_sdk import APortClient


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

**Standards:**
- Use type hints
- Use f-strings for string formatting
- Use async/await for async operations
- Follow PEP 8 style guide
- Use docstrings for classes and methods
- Use meaningful variable and function names

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

**Standards:**
- Use meaningful package names
- Use context for cancellation
- Use proper error handling with wrapped errors
- Follow Go naming conventions
- Use meaningful variable and function names
- Add godoc comments

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
      const result = await integration.verify('payments.refund.v1', 'agt_123');
      
      // Assert
      expect(result.verified).toBe(true);
      expect(mockAPortAPI.verify).toHaveBeenCalledWith('payments.refund.v1', 'agt_123');
    });
    
    it('should handle verification failure', async () => {
      // Arrange
      mockAPortAPI.verify.mockRejectedValue(new Error('Verification failed'));
      
      // Act & Assert
      await expect(integration.verify('payments.refund.v1', 'agt_123'))
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

### Code Documentation

```javascript
/**
 * Verifies an agent against a policy pack
 * @param {string} policy - Policy pack identifier (e.g., 'payments.refund.v1')
 * @param {string} agentId - Agent identifier (e.g., 'agt_inst_xyz789')
 * @param {Object} context - Additional context for verification
 * @param {string} context.userId - User ID for user-specific policies
 * @param {Object} context.metadata - Additional metadata
 * @returns {Promise<VerificationResult>} Verification result
 * @throws {APortError} If verification fails
 * @example
 * const result = await integration.verify('payments.refund.v1', 'agt_123', {
 *   userId: 'user_456',
 *   metadata: { amount: 100 }
 * });
 */
async verify(policy, agentId, context = {}) {
  // Implementation
}
```

### README Documentation

- **Clear title and description**
- **Installation instructions**
- **Configuration guide**
- **Usage examples**
- **API reference**
- **Troubleshooting section**
- **Contributing guidelines**

## 🎉 Hacktoberfest Guidelines

### Participation Requirements

1. **Fork** the repository
2. **Claim** an issue by commenting "I'd like to work on this"
3. **Build** your integration following our guidelines
4. **Submit** a pull request with proper documentation
5. **Get paid** via Chimoney when your PR is merged!

### Bounty Structure

- **Beginner**: $15-25 (Simple integrations, documentation)
- **Intermediate**: $30-40 (Framework integrations, middleware)
- **Advanced**: $45-50 (Complex integrations, protocol bridges)

### Quality Requirements

- ✅ Working integration with examples
- ✅ Comprehensive documentation
- ✅ Unit tests with good coverage
- ✅ Error handling and edge cases
- ✅ Security best practices
- ✅ Follows coding standards

## 🔍 Review Process

### What We Look For

1. **Functionality**: Does it work as expected?
2. **Code Quality**: Is it well-written and maintainable?
3. **Documentation**: Is it clear and comprehensive?
4. **Tests**: Are there adequate tests?
5. **Security**: Are there any security issues?
6. **Performance**: Is it efficient?

### Review Timeline

- **Initial Review**: 2-3 business days
- **Feedback**: We'll provide constructive feedback
- **Revisions**: Address feedback and resubmit
- **Final Review**: 1-2 business days
- **Merge**: Once approved, we'll merge your PR

### Common Issues

- **Missing Tests**: Add comprehensive tests
- **Poor Documentation**: Improve README and code comments
- **Security Issues**: Remove hardcoded secrets
- **Code Style**: Follow our coding standards
- **Missing Examples**: Add usage examples

## 🚀 Release Process

### Versioning

We use [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Steps

1. **Update version** in package.json/pyproject.toml
2. **Update CHANGELOG.md** with new features/fixes
3. **Create release PR** with version bump
4. **Merge and tag** the release
5. **Publish** to npm/PyPI/etc.

## 🆘 Getting Help

- **Discord**: [Join our Discord](https://discord.gg/aport)
- **GitHub Discussions**: [Ask questions](https://github.com/aporthq/aport-integrations/discussions)
- **Email**: [Contact us](mailto:support@aport.io)
- **Documentation**: [Read our docs](https://aport.io/docs)

## 🙏 Recognition

Contributors are recognized in:
- **README**: Listed as maintainers
- **Website**: Featured on our contributors page
- **Social Media**: Shoutouts on Twitter/LinkedIn
- **Swag**: APort Champion T-shirts for significant contributions

---

Thank you for contributing to APort Integrations! Together, we're building the future of AI agent security. 🛡️
