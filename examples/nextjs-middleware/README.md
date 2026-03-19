# APort Next.js Middleware

Next.js middleware for APort verification, supporting both App Router and Pages Router.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Next.js 13+

### Installation

```bash
npm install aport-nextjs-middleware
```

### Configuration

```bash
cp .env.example .env
# Edit .env with your APort API credentials
```

## Usage

### App Router (`middleware.ts`)

```typescript
import { aportMiddleware } from "aport-nextjs-middleware";
import { NextResponse } from "next/server";

export const config = { matcher: ["/api/:path*"] };

export default aportMiddleware({
  policy: "agent.basic.v1",

  onVerified: (request, result) => {
    const response = NextResponse.next();
    response.headers.set("x-aport-verified", "true");
    return response;
  },

  onDenied: (request, error) => {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  },
});
```

### Pages Router (`_app.tsx`)

```typescript
import { withAPort } from "aport-nextjs-middleware";
import type { AppProps } from "next/app";

function MyApp({ Component, pageProps, aport }: AppProps & { aport?: any }) {
  return <Component {...pageProps} aport={aport} />;
}

export default withAPort(MyApp, { policy: "agent.basic.v1" });
```

## 📚 API Reference

### `aportMiddleware(options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `policy` | string | `"default.v1"` | APort policy pack identifier |
| `apiKey` | string | `APORT_API_KEY` env | API key |
| `match` | string[] | `["/api"]` | Path prefixes to protect |
| `strict` | boolean | `true` | Block on verification errors |
| `onVerified` | Function | — | Success callback |
| `onDenied` | Function | — | Denial callback |
| `onError` | Function | — | Error callback |

### `withAPort(App, options)`

Higher-order component for Pages Router. Adds `aport` verification result to `ctx`.

## 🧪 Testing

```bash
npm test
```

## 📄 License

MIT
