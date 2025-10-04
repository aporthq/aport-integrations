# 🚀 One-Click Deploy to Vercel

Deploy this APort Next.js middleware example to your Vercel account with a single click!

## Deploy Now

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/aporthq/aport-integrations/tree/main/templates/nextjs-middleware&env=APORT_API_KEY&env=APORT_BASE_URL&project-name=aport-nextjs-example&repository-name=aport-nextjs-example)

## Manual Deployment

If you prefer to deploy manually:

1. **Fork the [aport-integrations repository](https://github.com/aporthq/aport-integrations)** or copy the `templates/nextjs-middleware` directory
2. **Import to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your repository
   - Select the `templates/nextjs-middleware` directory

3. **Configure Environment Variables**:
   ```
   APORT_API_KEY=your_api_key_here
   APORT_BASE_URL=https://api.aport.io  # optional
   ```

4. **Deploy** - Vercel will automatically build and deploy your application!

## What Gets Deployed

- ✅ Next.js 14 application with TypeScript
- ✅ APort middleware integration
- ✅ Protected API routes for payments and admin
- ✅ Mock client for development/testing
- ✅ Production-ready configuration
- ✅ CORS headers for API access
- ✅ Health check endpoint

## Testing Your Deployment

Once deployed, test these endpoints:

### Health Check (No Auth Required)
```bash
curl https://your-app.vercel.app/api/public/health
```

### Admin Dashboard (Requires Agent ID)
```bash
curl -H "X-Agent-ID: test-agent-123" https://your-app.vercel.app/api/admin/dashboard
```

### Payment Refund (Requires Agent ID)
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-Agent-ID: test-agent-123" \
  -d '{"amount": 100, "reason": "Customer request"}' \
  https://your-app.vercel.app/api/payments/refund
```

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `APORT_API_KEY` | Your APort API key | Yes* | - |
| `APORT_BASE_URL` | APort API base URL | No | `https://api.aport.io` |

*Required for production. If not provided, uses mock client for demonstration.

## Customization

After deployment, you can:

1. **Update API routes** in `app/api/` directory
2. **Modify middleware** in `middleware.ts`
3. **Add new policies** by updating the policy mapping
4. **Customize UI** in `app/page.tsx`

## Support

- 📖 [APort Documentation](https://docs.aport.io)
- 🐛 [Report Issues](https://github.com/aporthq/aport-integrations/issues)
- 💬 [Community Discord](https://discord.gg/aport)
