# APort Next.js Middleware

Next.js middleware for APort verification, supporting both App Router and Pages Router.

## Installation

```bash
npm install @aport/nextjs
# or
yarn add @aport/nextjs
```

## Quick Start

### App Router (Next.js 13+)

Create or update your `middleware.ts`:

```typescript
import {aportMiddleware, configureAPort} from '@aport/nextjs'

// Optional: Configure APort
configureAPort({
  apiKey: process.env.APORT_API_KEY!,
  projectId: 'your-project-id',
  enabled: true,
  exemptPaths: ['/_next', '/static', '/api/health'],
})

export default aportMiddleware
```

### Pages Router

Create a wrapper in `middleware.ts`:

```typescript
import {createAPortMiddleware} from '@aport/nextjs'

export default createAPortMiddleware({
  apiKey: process.env.APORT_API_KEY!,
  exemptPaths: ['/api/health', '/_next'],
})
```

## Configuration

### configureAPort(options)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | string | required | Your APort API key |
| `projectId` | string | 'default' | Your project ID |
| `enabled` | boolean | true | Enable/disable verification |
| `exemptPaths` | string[] | [...] | Paths to skip |
| `timeout` | number | 5000 | Request timeout (ms) |

## API Reference

### aportMiddleware

Default middleware function for App Router.

```typescript
import {aportMiddleware} from '@aport/nextjs'

export default aportMiddleware
```

### createAPortMiddleware(options)

Create middleware with inline config.

```typescript
import {createAPortMiddleware} from '@aport/nextjs'

export default createAPortMiddleware({
  apiKey: 'your-api-key',
  exemptPaths: ['/public'],
})
```

### verifyAction(action, actorId, actorName, context)

Use in API routes for manual verification.

```typescript
import {verifyAction} from '@aport/nextjs'
import {NextRequest, NextResponse} from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  
  const result = await verifyAction(
    'custom_action',
    body.userId,
    body.username,
    { data: body.data }
  )
  
  if (!result.allow) {
    return NextResponse.json({error: 'Denied'}, {status: 403})
  }
  
  return NextResponse.json({success: true})
}
```

## Environment Variables

```env
APORT_API_KEY=your-api-key
APORT_PROJECT_ID=your-project-id
APORT_ENABLED=true
```

## Example

See the `example` directory for a complete Next.js app with APort integration.

## License

MIT
