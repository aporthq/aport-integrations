// @ts-ignore
import type { NextRequest } from 'next/server';
// @ts-ignore
import { NextResponse } from 'next/server';

let APortClient: any;
try {
  // Dynamically import APortClient to avoid errors if module is missing in some environments
  // @ts-ignore
  APortClient = require('@aporthq/sdk-node').APortClient;
} catch (e) {
  // Fallback if module is not available (e.g., in local dev without dependency)
  APortClient = undefined;
}
const aportClient = APortClient
  ? new APortClient({
      apiKey: (globalThis as any).process?.env?.APORT_API_KEY,
      baseUrl: (globalThis as any).process?.env?.APORT_BASE_URL || 'https://api.aport.io'
    })
  : undefined;

// Mock client for development/testing
class MockAPortClient {
  async verify(policy: string, agentId: string, context?: any) {
    // Simulate verification logic
    if (agentId === 'test-agent-123') {
      return {
        verified: true,
        passport: {
          agent_id: agentId,
          capabilities: ['payments.refund', 'payments.transfer'],
          limits: {
            refund_amount_max_per_tx: 1000,
            transfer_amount_max_per_tx: 5000
          },
          metadata: {
            verified_at: new Date().toISOString(),
            policy: policy
          }
        },
        message: 'Agent verified successfully'
      };
    }
    
    return {
      verified: false,
      message: 'Agent verification failed',
      details: { error: 'Invalid agent ID' }
    };
  }
}

// Use mock client in development
const client =
  (globalThis as any).process?.env?.NODE_ENV === 'production'
    ? aportClient
    : new MockAPortClient();

export async function middleware(request: NextRequest) {
  // Skip middleware for static files and API routes that don't need verification
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/favicon.ico') ||
    request.nextUrl.pathname === '/' ||
    request.nextUrl.pathname.startsWith('/api/public')
  ) {
    return NextResponse.next();
  }

  // Extract agent ID from request
  const agentId = 
    request.headers.get('x-agent-id') ||
    request.headers.get('x-aport-agent-id') ||
    request.nextUrl.searchParams.get('agent_id');

  if (!agentId) {
    return NextResponse.json(
      { 
        error: 'Agent ID required',
        message: 'Please provide agent ID in X-Agent-ID header or agent_id query parameter'
      },
      { status: 400 }
    );
  }

  try {
    // Determine policy based on route
    let policy = 'default.access.v1';
    
    if (request.nextUrl.pathname.startsWith('/api/admin')) {
      policy = 'admin.access.v1';
    } else if (request.nextUrl.pathname.startsWith('/api/payments/refund')) {
      policy = 'payments.refund.v1';
    } else if (request.nextUrl.pathname.startsWith('/api/payments/transfer')) {
      policy = 'payments.transfer.v1';
    }

    // Verify agent against policy
    const result = await client.verify(policy, agentId, {
      context: {
        method: request.method,
        path: request.nextUrl.pathname,
        userAgent: request.headers.get('user-agent'),
        ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown'
      }
    });

    if (!result.verified) {
      return NextResponse.json(
        { 
          error: 'Verification failed',
          message: result.message || 'Agent verification failed',
          details: result.details
        },
        { status: 403 }
      );
    }

    // Add verification data to request headers for API routes to access
    const response = NextResponse.next();
    response.headers.set('x-aport-verified', 'true');
    response.headers.set('x-aport-agent-id', agentId);
    response.headers.set('x-aport-policy', policy);
    
    // Store passport data in a header (base64 encoded for complex data)
    if (result.passport) {
      // Use globalThis.Buffer if available (Node.js), otherwise use btoa (browser)
      const passportString = JSON.stringify(result.passport);
      let encodedPassport: string;
      // Use Buffer if available (Node.js), otherwise use btoa (browser)
      if (typeof (globalThis as any).Buffer !== 'undefined') {
        encodedPassport = (globalThis as any).Buffer.from(passportString).toString('base64');
      } else if (typeof btoa !== 'undefined') {
        encodedPassport = btoa(unescape(encodeURIComponent(passportString)));
      } else {
        // Fallback: do not set header if encoding is not possible
        encodedPassport = '';
      }
      if (encodedPassport) {
        response.headers.set('x-aport-passport', encodedPassport);
      }
    }

    return response;

  } catch (error) {
    console.error('APort verification error:', error);
    // In development, allow requests to continue with warning
    const isDev =
      typeof globalThis !== 'undefined' &&
      ((globalThis as any).process?.env?.NODE_ENV === 'development' ||
       (globalThis as any).NODE_ENV === 'development');

    if (isDev) {
      console.warn('APort verification failed, allowing request in development mode');
      return NextResponse.next();
    }

    return NextResponse.json(
      { 
        error: 'Verification error',
        message: 'Internal verification error'
      },
      { status: 500 }
    );
  }
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
