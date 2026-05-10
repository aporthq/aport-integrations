import { APortClient } from "@aporthq/sdk-node";
import type {
  APortClientOptions,
  PolicyVerificationResponse,
} from "@aporthq/sdk-node";
import type {
  GetServerSidePropsContext,
  GetServerSidePropsResult,
  NextApiHandler,
  NextApiRequest,
  NextApiResponse,
} from "next";
import { NextRequest, NextResponse } from "next/server";

type MaybePromise<T> = T | Promise<T>;
type HeadersRecord = Record<string, string | string[] | undefined>;
type QueryRecord = Record<string, string | string[] | undefined>;

export interface APortClientLike {
  verifyPolicy(
    agentId: string,
    policyId: string,
    context?: Record<string, unknown>,
    idempotencyKey?: string,
  ): Promise<PolicyVerificationResponse | LegacyVerificationResponse>;
}

export interface LegacyVerificationResponse {
  verified?: boolean;
  message?: string;
  details?: unknown;
  passport?: unknown;
  policy?: string;
}

export interface APortVerificationResult {
  allow: boolean;
  verified: boolean;
  policy: string;
  status: number;
  agentId?: string;
  decision?: PolicyVerificationResponse | LegacyVerificationResponse;
  error?: string;
  message?: string;
  reasons?: PolicyVerificationResponse["reasons"];
}

export interface APortBaseOptions<RequestT> extends APortClientOptions {
  client?: APortClientLike;
  strict?: boolean;
  agentId?: string | ((request: RequestT) => MaybePromise<string | null | undefined>);
  agentIdHeaders?: string[];
  agentIdQueryParams?: string[];
  agentIdCookies?: string[];
  context?:
    | Record<string, unknown>
    | ((request: RequestT) => MaybePromise<Record<string, unknown>>);
  idempotencyKey?:
    | string
    | ((request: RequestT) => MaybePromise<string | null | undefined>);
}

export interface APortMiddlewareOptions
  extends APortBaseOptions<NextRequest> {
  onMissingAgent?: (
    result: APortVerificationResult,
    request: NextRequest,
  ) => MaybePromise<Response>;
  onDenied?: (
    result: APortVerificationResult,
    request: NextRequest,
  ) => MaybePromise<Response>;
  onError?: (
    result: APortVerificationResult,
    request: NextRequest,
  ) => MaybePromise<Response>;
}

export interface APortRouteHandlerContext {
  params?: Record<string, string | string[]>;
}

export type APortRouteHandler<ContextT = APortRouteHandlerContext> = (
  request: NextRequest,
  context: ContextT,
  aport: APortVerificationResult,
) => MaybePromise<Response>;

export interface APortPagesOptions
  extends APortBaseOptions<NextApiRequest | GetServerSidePropsContext["req"]> {
  redirectTo?: string;
}

export type APortNextApiRequest = NextApiRequest & {
  aport?: APortVerificationResult;
};

export type APortNextApiHandler = (
  req: APortNextApiRequest,
  res: NextApiResponse,
) => unknown | Promise<unknown>;

export type APortGetServerSideProps<Props extends Record<string, unknown>> = (
  context: GetServerSidePropsContext,
  aport: APortVerificationResult,
) => MaybePromise<GetServerSidePropsResult<Props>>;

const DEFAULT_AGENT_ID_HEADERS = ["x-agent-id", "x-aport-agent-id"];
const DEFAULT_AGENT_ID_QUERY_PARAMS = ["agent_id", "agentId"];
const DEFAULT_AGENT_ID_COOKIES = ["aport_agent_id", "agent_id"];

export function createAPortMiddleware(
  policy: string,
  options: APortMiddlewareOptions = {},
) {
  return async function aportMiddleware(
    request: NextRequest,
  ): Promise<Response> {
    const result = await verifyAPortRequest(policy, request, options);

    if (result.allow) {
      return nextWithVerificationHeaders(request, result);
    }

    if (result.status === 400 && options.onMissingAgent) {
      return options.onMissingAgent(result, request);
    }

    if (result.status === 500 && options.onError) {
      return options.onError(result, request);
    }

    if (options.onDenied) {
      return options.onDenied(result, request);
    }

    return verificationJsonResponse(result);
  };
}

export function withAPortRouteHandler<ContextT = APortRouteHandlerContext>(
  policy: string,
  handler: APortRouteHandler<ContextT>,
  options: APortMiddlewareOptions = {},
) {
  return async function aportRouteHandler(
    request: NextRequest,
    context: ContextT,
  ): Promise<Response> {
    const result = await verifyAPortRequest(policy, request, options);

    if (!result.allow) {
      if (result.status === 400 && options.onMissingAgent) {
        return options.onMissingAgent(result, request);
      }

      if (result.status === 500 && options.onError) {
        return options.onError(result, request);
      }

      if (options.onDenied) {
        return options.onDenied(result, request);
      }

      return verificationJsonResponse(result);
    }

    return handler(request, context, result);
  };
}

export function withAPortApiRoute(
  policy: string,
  handler: APortNextApiHandler,
  options: APortPagesOptions = {},
): NextApiHandler {
  return async function aportApiRoute(req, res) {
    const aportReq = req as APortNextApiRequest;
    const result = await verifyAPortApiRequest(policy, aportReq, options);

    if (!result.allow) {
      return sendPagesJson(res, result);
    }

    aportReq.aport = result;
    return handler(aportReq, res);
  };
}

export function withAPortGetServerSideProps<
  Props extends Record<string, unknown> = Record<string, unknown>,
>(
  policy: string,
  getServerSideProps: APortGetServerSideProps<Props>,
  options: APortPagesOptions = {},
) {
  return async function aportGetServerSideProps(
    context: GetServerSidePropsContext,
  ): Promise<GetServerSidePropsResult<Props>> {
    const result = await verifyAPortApiRequest(policy, context.req, options);

    if (result.allow) {
      return getServerSideProps(context, result);
    }

    if (options.redirectTo) {
      return {
        redirect: {
          destination: options.redirectTo,
          permanent: false,
        },
      };
    }

    return { notFound: true };
  };
}

export async function verifyAPortRequest(
  policy: string,
  request: NextRequest,
  options: APortMiddlewareOptions = {},
): Promise<APortVerificationResult> {
  const agentId = await extractAgentIdFromNextRequest(request, options);

  if (!agentId) {
    return missingAgentResult(policy);
  }

  try {
    const client = createClient(options);
    const context = await buildNextContext(request, options);
    const idempotencyKey = await resolveNextIdempotencyKey(request, options);
    const decision = await client.verifyPolicy(
      agentId,
      policy,
      context,
      idempotencyKey,
    );

    return resultFromDecision(policy, agentId, decision);
  } catch (error) {
    return resultFromError(policy, agentId, error, options.strict !== false);
  }
}

export async function verifyAPortApiRequest(
  policy: string,
  request: NextApiRequest | GetServerSidePropsContext["req"],
  options: APortPagesOptions = {},
): Promise<APortVerificationResult> {
  const agentId = await extractAgentIdFromApiRequest(request, options);

  if (!agentId) {
    return missingAgentResult(policy);
  }

  try {
    const client = createClient(options);
    const context = await buildApiContext(request, options);
    const idempotencyKey = await resolveApiIdempotencyKey(request, options);
    const decision = await client.verifyPolicy(
      agentId,
      policy,
      context,
      idempotencyKey,
    );

    return resultFromDecision(policy, agentId, decision);
  } catch (error) {
    return resultFromError(policy, agentId, error, options.strict !== false);
  }
}

export async function extractAgentIdFromNextRequest(
  request: NextRequest,
  options: APortBaseOptions<NextRequest> = {},
): Promise<string | null> {
  const configured = await resolveValue(options.agentId, request);

  if (configured) {
    return configured;
  }

  for (const header of options.agentIdHeaders ?? DEFAULT_AGENT_ID_HEADERS) {
    const value = request.headers.get(header);

    if (value) {
      return value;
    }
  }

  for (const param of options.agentIdQueryParams ?? DEFAULT_AGENT_ID_QUERY_PARAMS) {
    const value = request.nextUrl.searchParams.get(param);

    if (value) {
      return value;
    }
  }

  for (const cookie of options.agentIdCookies ?? DEFAULT_AGENT_ID_COOKIES) {
    const value = request.cookies.get(cookie)?.value;

    if (value) {
      return value;
    }
  }

  return null;
}

export async function extractAgentIdFromApiRequest(
  request: NextApiRequest | GetServerSidePropsContext["req"],
  options: APortBaseOptions<NextApiRequest | GetServerSidePropsContext["req"]> = {},
): Promise<string | null> {
  const configured = await resolveValue(options.agentId, request);

  if (configured) {
    return configured;
  }

  const headers = request.headers as HeadersRecord;

  for (const header of options.agentIdHeaders ?? DEFAULT_AGENT_ID_HEADERS) {
    const value = firstValue(headers[header.toLowerCase()] ?? headers[header]);

    if (value) {
      return value;
    }
  }

  const query = "query" in request ? (request.query as QueryRecord) : {};

  for (const param of options.agentIdQueryParams ?? DEFAULT_AGENT_ID_QUERY_PARAMS) {
    const value = firstValue(query[param]);

    if (value) {
      return value;
    }
  }

  const cookies = "cookies" in request ? request.cookies : {};

  for (const cookie of options.agentIdCookies ?? DEFAULT_AGENT_ID_COOKIES) {
    const value = cookies?.[cookie];

    if (value) {
      return value;
    }
  }

  const body = "body" in request ? request.body : undefined;

  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    const value = record.agent_id ?? record.agentId;

    if (typeof value === "string" && value) {
      return value;
    }
  }

  return null;
}

function createClient(
  options: APortClientOptions & { client?: APortClientLike },
): APortClientLike {
  if (options.client) {
    return options.client;
  }

  return new APortClient({
    apiKey: options.apiKey ?? process.env.APORT_API_KEY,
    baseUrl: options.baseUrl ?? process.env.APORT_BASE_URL,
    timeoutMs: options.timeoutMs,
  });
}

async function buildNextContext(
  request: NextRequest,
  options: APortBaseOptions<NextRequest>,
): Promise<Record<string, unknown>> {
  const configuredContext = await resolveContext(options.context, request);
  const ip = (request as NextRequest & { ip?: string }).ip;

  return removeUndefined({
    framework: "nextjs",
    runtime: "middleware",
    method: request.method,
    path: request.nextUrl.pathname,
    url: request.nextUrl.href,
    userAgent: request.headers.get("user-agent") ?? undefined,
    ip,
    ...configuredContext,
  });
}

async function buildApiContext(
  request: NextApiRequest | GetServerSidePropsContext["req"],
  options: APortBaseOptions<NextApiRequest | GetServerSidePropsContext["req"]>,
): Promise<Record<string, unknown>> {
  const configuredContext = await resolveContext(options.context, request);

  return removeUndefined({
    framework: "nextjs",
    runtime: "node",
    method: request.method,
    path: request.url?.split("?")[0],
    url: request.url,
    userAgent: firstValue(request.headers["user-agent"]),
    ip: request.socket?.remoteAddress,
    ...configuredContext,
  });
}

async function resolveNextIdempotencyKey(
  request: NextRequest,
  options: APortBaseOptions<NextRequest>,
): Promise<string | undefined> {
  const configured = await resolveValue(options.idempotencyKey, request);

  return (
    configured ??
    request.headers.get("idempotency-key") ??
    request.nextUrl.searchParams.get("idempotency_key") ??
    undefined
  );
}

async function resolveApiIdempotencyKey(
  request: NextApiRequest | GetServerSidePropsContext["req"],
  options: APortBaseOptions<NextApiRequest | GetServerSidePropsContext["req"]>,
): Promise<string | undefined> {
  const configured = await resolveValue(options.idempotencyKey, request);

  if (configured) {
    return configured;
  }

  const headerValue = firstValue(request.headers["idempotency-key"]);

  if (headerValue) {
    return headerValue;
  }

  if ("query" in request) {
    return firstValue((request.query as QueryRecord).idempotency_key);
  }

  return undefined;
}

function resultFromDecision(
  policy: string,
  agentId: string,
  decision: PolicyVerificationResponse | LegacyVerificationResponse,
): APortVerificationResult {
  const verified = isDecisionAllowed(decision);

  return {
    allow: verified,
    verified,
    policy,
    agentId,
    decision,
    status: verified ? 200 : 403,
    error: verified ? undefined : "Verification failed",
    message: verified ? undefined : decisionMessage(decision),
    reasons: "reasons" in decision ? decision.reasons : undefined,
  };
}

function resultFromError(
  policy: string,
  agentId: string,
  error: unknown,
  strict: boolean,
): APortVerificationResult {
  const message = errorMessage(error);

  if (!strict) {
    return {
      allow: true,
      verified: false,
      policy,
      agentId,
      status: 200,
      error: "Verification bypassed",
      message,
    };
  }

  return {
    allow: false,
    verified: false,
    policy,
    agentId,
    status: 500,
    error: "Verification error",
    message,
    reasons: errorReasons(error),
  };
}

function missingAgentResult(policy: string): APortVerificationResult {
  return {
    allow: false,
    verified: false,
    policy,
    status: 400,
    error: "Agent ID required",
    message: "Agent ID must be provided in headers, query parameters, or cookies",
  };
}

function nextWithVerificationHeaders(
  request: NextRequest,
  result: APortVerificationResult,
): NextResponse {
  const requestHeaders = new Headers(request.headers);

  requestHeaders.set("x-aport-verified", String(result.verified));

  if (result.agentId) {
    requestHeaders.set("x-aport-agent-id", result.agentId);
  }

  const decisionId = result.decision && "decision_id" in result.decision
    ? result.decision.decision_id
    : undefined;

  if (decisionId) {
    requestHeaders.set("x-aport-decision-id", decisionId);
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set("x-aport-verified", String(result.verified));

  if (result.agentId) {
    response.headers.set("x-aport-agent-id", result.agentId);
  }

  if (decisionId) {
    response.headers.set("x-aport-decision-id", decisionId);
  }

  return response;
}

function verificationJsonResponse(result: APortVerificationResult): NextResponse {
  return NextResponse.json(publicResult(result), { status: result.status });
}

function sendPagesJson(
  res: NextApiResponse,
  result: APortVerificationResult,
): void {
  res.status(result.status).json(publicResult(result));
}

function publicResult(result: APortVerificationResult) {
  const decisionId = result.decision && "decision_id" in result.decision
    ? result.decision.decision_id
    : undefined;

  return removeUndefined({
    error: result.error,
    message: result.message,
    policy: result.policy,
    agentId: result.agentId,
    decisionId,
    reasons: result.reasons,
  });
}

function isDecisionAllowed(
  decision: PolicyVerificationResponse | LegacyVerificationResponse,
): boolean {
  if ("allow" in decision && typeof decision.allow === "boolean") {
    return decision.allow;
  }

  return (decision as LegacyVerificationResponse).verified === true;
}

function decisionMessage(
  decision: PolicyVerificationResponse | LegacyVerificationResponse,
): string {
  if ("message" in decision && typeof decision.message === "string") {
    return decision.message;
  }

  if ("reasons" in decision && decision.reasons?.[0]?.message) {
    return decision.reasons[0].message;
  }

  return "Agent verification failed";
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }

  return "Internal verification error";
}

function errorReasons(error: unknown): PolicyVerificationResponse["reasons"] {
  if (typeof error === "object" && error !== null && "reasons" in error) {
    return (error as { reasons?: PolicyVerificationResponse["reasons"] })
      .reasons;
  }

  return undefined;
}

async function resolveContext<RequestT>(
  context:
    | Record<string, unknown>
    | ((request: RequestT) => MaybePromise<Record<string, unknown>>)
    | undefined,
  request: RequestT,
): Promise<Record<string, unknown>> {
  if (!context) {
    return {};
  }

  if (typeof context === "function") {
    return context(request);
  }

  return context;
}

async function resolveValue<RequestT>(
  value:
    | string
    | ((request: RequestT) => MaybePromise<string | null | undefined>)
    | undefined,
  request: RequestT,
): Promise<string | null | undefined> {
  if (typeof value === "function") {
    return value(request);
  }

  return value;
}

function firstValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function removeUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T;
}
