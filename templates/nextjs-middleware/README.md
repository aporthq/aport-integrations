# APort Next.js Middleware Template

**Production-ready Next.js middleware** with APort integration for instant Vercel deployment.

> **🎯 One-Click Deploy**: This template is configured for instant deployment to Vercel with zero configuration required.

## 🚀 Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/aporthq/aport-integrations/tree/main/templates/nextjs-middleware&env=APORT_API_KEY&env=APORT_BASE_URL&project-name=aport-nextjs-example&repository-name=aport-nextjs-example)

**Deploy in 30 seconds:**
1. Click the deploy button above
2. Add your `APORT_API_KEY` (optional for demo)
3. Click "Deploy"

## 📋 What's Included

- ✅ **Next.js 14** with TypeScript and App Router
- ✅ **APort Middleware** with automatic agent verification
- ✅ **Protected API Routes** for payments and admin functions
- ✅ **Mock Client** for development and testing
- ✅ **Production Config** optimized for Vercel
- ✅ **CORS Support** for cross-origin requests
- ✅ **Health Check** endpoint for monitoring

## 🔧 Features

### Middleware Integration
- Automatic agent verification on protected routes
- Policy-based access control
- Passport data extraction and validation
- Graceful error handling and fallbacks

### API Endpoints
- `POST /api/payments/refund` - Process refunds with amount limits
- `POST /api/payments/transfer` - Transfer funds between accounts
- `GET /api/admin/dashboard` - Admin dashboard with system stats
- `GET /api/public/health` - Health check (no auth required)

### Development Features
- Mock APort client for testing without API keys
- TypeScript support with proper type definitions
- Hot reloading for development
- ESLint and Prettier configuration

## 🏃‍♂️ Local Development

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Setup
```bash
# Clone the template
cp -r templates/nextjs-middleware my-aport-app
cd my-aport-app

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your APORT_API_KEY

# Start development server
npm run dev
```

Visit `http://localhost:3000` to see the application.

## 🔐 Environment Variables

Create a `.env.local` file:

```bash
# Required for production
APORT_API_KEY=your_api_key_here

# Optional - defaults to https://api.aport.io
APORT_BASE_URL=https://api.aport.io
```

**Note**: Without `APORT_API_KEY`, the app uses a mock client for demonstration.

## 📚 API Usage Examples

### Health Check
```bash
curl https://your-app.vercel.app/api/public/health
```

### Admin Dashboard
```bash
curl -H "X-Agent-ID: test-agent-123" \
  https://your-app.vercel.app/api/admin/dashboard
```

### Process Refund
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-Agent-ID: test-agent-123" \
  -d '{"amount": 100, "reason": "Customer request"}' \
  https://your-app.vercel.app/api/payments/refund
```

### Transfer Funds
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-Agent-ID: test-agent-123" \
  -d '{"amount": 500, "to_account": "account_123", "description": "Payment"}' \
  https://your-app.vercel.app/api/payments/transfer
```

## 🛠️ Customization

### Adding New Policies
Update the policy mapping in `middleware.ts`:

```typescript
// Determine policy based on route
let policy = 'default.access.v1';

if (request.nextUrl.pathname.startsWith('/api/admin')) {
  policy = 'admin.access.v1';
} else if (request.nextUrl.pathname.startsWith('/api/payments/refund')) {
  policy = 'payments.refund.v1';
} else if (request.nextUrl.pathname.startsWith('/api/payments/transfer')) {
  policy = 'payments.transfer.v1';
}
// Add your custom policies here
```

### Creating New API Routes
1. Create a new file in `app/api/your-route/route.ts`
2. The middleware will automatically protect it
3. Access APort data via headers:

```typescript
export async function POST(request: NextRequest) {
  const verified = request.headers.get('x-aport-verified');
  const agentId = request.headers.get('x-aport-agent-id');
  const passportData = request.headers.get('x-aport-passport');
  
  // Parse passport data
  const passport = passportData ? 
    JSON.parse(Buffer.from(passportData, 'base64').toString()) : null;
  
  // Your API logic here
}
```

## 🧪 Testing

### Manual Testing
Use the provided curl commands or test with tools like Postman.

### Mock Agent IDs
The mock client accepts these test agent IDs:
- `test-agent-123` - Full access with payment capabilities
- Any other ID - Will fail verification

### Unit Testing
```bash
npm run test
```

## 📦 Build & Deploy

### Local Build
```bash
npm run build
npm start
```

### Vercel Deployment
The app is pre-configured for Vercel:
- Automatic builds on git push
- Environment variable configuration
- Edge runtime optimization
- CORS headers configured

## 🔍 Troubleshooting

### Common Issues

**1. "Agent verification required" error**
- Ensure you're sending `X-Agent-ID` header
- Use `test-agent-123` for mock client testing

**2. Build failures**
- Check that all dependencies are installed: `npm install`
- Verify TypeScript types: `npm run type-check`

**3. API key issues**
- Verify `APORT_API_KEY` is set in environment variables
- Check API key permissions in APort dashboard

### Debug Mode
Enable debug logging by setting:
```bash
DEBUG=aport:*
```

## 📄 License

MIT License - see [LICENSE](../../LICENSE) file.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📞 Support

- 📖 [APort Documentation](https://docs.aport.io)
- 🐛 [Report Issues](https://github.com/aporthq/aport-integrations/issues)
- 💬 [Community Discord](https://discord.gg/aport)
- 📧 [Email Support](mailto:support@aport.io)

---

**Made with ❤️ by the APort team**
