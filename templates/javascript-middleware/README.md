# APort Express Middleware Template

**Scaffolding template** for building APort Express.js middleware integrations.

> **Note**: This is a template for scaffolding new integrations. For the official middleware, see [@aporthq/middleware-express](https://github.com/aporthq/aport-sdks/tree/main/express).

## 🚀 Quick Start

### 1. Copy the Template

```bash
# Copy this template to create your integration
cp -r templates/javascript-middleware examples/your-integration-name
cd examples/your-integration-name
```

### 2. Install Dependencies

```bash
# Install the official APort SDK
npm install @aporthq/sdk-node

# Install other dependencies
npm install
```

### Basic Usage

```javascript
const express = require('express');
const { createAPortMiddleware } = require('@aporthq/middleware-express');

const app = express();
app.use(express.json());

// Initialize middleware
const aportMiddleware = createAPortMiddleware({
  apiKey: process.env.APORT_API_KEY
});

// Protect a route
app.post('/refund', 
  aportMiddleware('payments.refund.v1'),
  (req, res) => {
    // Agent is verified, access passport data
    const { passport, agentId } = req.aport;
    
    res.json({ 
      success: true,
      agentId: agentId
    });
  }
);
```

## 📚 API Reference

### `createAPortMiddleware(options)`

Creates an APort middleware factory.

**Parameters:**
- `options.apiKey` (string): APort API key
- `options.baseUrl` (string): APort API base URL (optional)
- `options.defaults` (object): Default verification options (optional)

**Returns:** Function that creates middleware

### `requirePolicy(policy, middlewareOptions)`

Creates middleware that requires a specific policy.

**Parameters:**
- `policy` (string): Policy pack identifier
- `middlewareOptions` (object): Middleware-specific options
  - `context` (object): Additional context for verification
  - `strict` (boolean): Whether to fail on verification errors (default: true)

**Returns:** Express middleware function

## 🔧 Configuration

### Environment Variables

```bash
APORT_API_KEY=your_api_key_here
APORT_BASE_URL=https://api.aport.io  # optional
```

### Agent ID Sources

The middleware looks for agent IDs in the following order:

1. `X-Agent-ID` header
2. `X-APort-Agent-ID` header
3. `agent_id` query parameter
4. `agent_id` in request body
5. `agentId` in request body

## 📝 Examples

### Basic Route Protection

```javascript
app.post('/refund', 
  aportMiddleware('payments.refund.v1'),
  (req, res) => {
    const { passport } = req.aport;
    
    // Check specific limits
    if (req.body.amount > passport.limits.refund_amount_max_per_tx) {
      return res.status(403).json({
        error: 'Amount exceeds limit'
      });
    }
    
    // Process refund
    res.json({ success: true });
  }
);
```

### Admin Access

```javascript
app.get('/admin',
  aportMiddleware('admin.access', {
    context: {
      endpoint: 'admin',
      action: 'view_dashboard'
    }
  }),
  (req, res) => {
    res.json({
      message: 'Admin dashboard',
      capabilities: req.aport.passport.capabilities
    });
  }
);
```

### Custom Context

```javascript
app.post('/transfer',
  aportMiddleware('payments.transfer.v1', {
    context: {
      source: 'api',
      version: 'v1',
      endpoint: 'transfer'
    }
  }),
  (req, res) => {
    // Handle transfer
  }
);
```

## 🧪 Testing

```bash
npm test
```

## 📄 License

MIT
