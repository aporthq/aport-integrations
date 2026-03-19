import { NextRequest, NextResponse } from 'next/server';
import type { NextFetchEvent } from 'next/server';
import axios from 'axios';

// Configuration types
export interface APortConfig {
  apiKey: string;
  projectId?: string;
  enabled?: boolean;
  exemptPaths?: string[];
  timeout?: number;
}

// Default configuration
const defaultConfig: APortConfig = {
  projectId: 'default',
  enabled: true,
  exemptPaths: ['/_next', '/static', '/api/health'],
  timeout: 5000,
};

// Singleton config
let config: APortConfig = { ...defaultConfig };

/**
 * Configure APort middleware
 */
export function configureAPort(userConfig: Partial<APortConfig>) {
  config = { ...defaultConfig, ...userConfig };
}

/**
 * Verify request with APort
 */
async function verifyWithAPort(
  action: string,
  actor: { id: string; name: string; owner: string },
  context: Record<string, any>
): Promise<{ allow: boolean; reasons: string[] }> {
  if (!config.enabled) {
    return { allow: true, reasons: ['APort disabled'] };
  }

  if (!config.apiKey) {
    console.warn('APort API key not configured');
    return { allow: true, reasons: ['No API key'] };
  }

  try {
    const response = await axios.post(
      'https://api.aport.io/verify',
      {
        action,
        actor,
        context: { data: context },
        projectId: config.projectId,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        timeout: config.timeout || 5000,
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('APort verification error:', error.message);
    return {
      allow: true,
      reasons: ['Verification failed, allowing by default'],
    };
  }
}

/**
 * Get actor information from request
 */
function getActor(req: NextRequest): { id: string; name: string; owner: string } {
  // Try to get user from auth header
  const authHeader = req.headers.get('authorization');
  
  if (authHeader) {
    return {
      id: `user-${hashString(authHeader)}`,
      name: 'authenticated-user',
      owner: 'nextjs',
    };
  }

  // Get IP-based actor
  const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown';
  return {
    id: `anonymous-${hashString(ip)}`,
    name: 'anonymous',
    owner: 'nextjs',
  };
}

/**
 * Get context from request
 */
function getContext(req: NextRequest): Record<string, any> {
  return {
    method: req.method,
    path: req.nextUrl.pathname,
    ip: req.ip || req.headers.get('x-forwarded-for') || 'unknown',
    userAgent: req.headers.get('user-agent') || '',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Simple hash function
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Middleware for App Router (Next.js 13+)
 */
export async function aportMiddleware(req: NextRequest, event: NextFetchEvent) {
  const { pathname } = req.nextUrl;

  // Skip exempt paths
  if (config.exemptPaths?.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Get actor and context
  const actor = getActor(req);
  const context = getContext(req);

  // Verify with APort
  const result = await verifyWithAPort(
    `nextjs_${req.method.toLowerCase()}`,
    actor,
    context
  );

  if (!result.allow) {
    return NextResponse.json(
      {
        error: 'Access Denied',
        reasons: result.reasons,
      },
      { status: 403 }
    );
  }

  return NextResponse.next();
}

/**
 * Create middleware with custom config
 */
export function createAPortMiddleware(userConfig: Partial<APortConfig>) {
  return async function (req: NextRequest, event: NextFetchEvent) {
    // Merge configs
    const middlewareConfig = { ...config, ...userConfig };
    
    const { pathname } = req.nextUrl;

    // Skip exempt paths
    if (middlewareConfig.exemptPaths?.some((path) => pathname.startsWith(path))) {
      return NextResponse.next();
    }

    // Get actor and context
    const actor = getActor(req);
    const context = getContext(req);

    // Verify with APort
    const result = await verifyWithAPort(
      `nextjs_${req.method.toLowerCase()}`,
      actor,
      context
    );

    if (!result.allow) {
      return NextResponse.json(
        {
          error: 'Access Denied',
          reasons: result.reasons,
        },
        { status: 403 }
      );
    }

    return NextResponse.next();
  };
}

/**
 * Helper function for API routes
 */
export async function verifyAction(
  action: string,
  actorId: string,
  actorName: string,
  context: Record<string, any>
): Promise<{ allow: boolean; reasons: string[] }> {
  return verifyWithAPort(action, { id: actorId, name: actorName, owner: 'nextjs' }, context);
}

// Export for Pages Router
export { defaultConfig as config };
