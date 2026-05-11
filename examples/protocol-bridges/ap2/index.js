const { APortClient } = require("@aporthq/sdk-node");

class AP2BridgeError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "AP2BridgeError";
    this.details = details;
  }
}

class APortAuthorizationError extends AP2BridgeError {
  constructor(message, decision, details = {}) {
    super(message, details);
    this.name = "APortAuthorizationError";
    this.decision = decision;
  }
}

class AP2Client {
  constructor(options = {}) {
    this.baseUrl = trimTrailingSlash(
      options.baseUrl ||
        process.env.AP2_BASE_URL ||
        "http://localhost:8080/v1/ap2"
    );
    this.token = options.token || process.env.AP2_BEARER_TOKEN;
    this.fetchImpl = options.fetchImpl || globalThis.fetch;

    if (!this.fetchImpl) {
      throw new AP2BridgeError(
        "AP2Client requires Node.js 18+ fetch or a custom fetchImpl"
      );
    }
  }

  async createPaymentIntent(paymentIntent) {
    return this.request("POST", "/payment-intents", paymentIntent);
  }

  async getPaymentIntent(intentId) {
    return this.request("GET", `/payment-intents/${encodeURIComponent(intentId)}`);
  }

  async confirmPaymentIntent(intentId, confirmation) {
    return this.request(
      "POST",
      `/payment-intents/${encodeURIComponent(intentId)}/confirm`,
      confirmation
    );
  }

  async cancelPaymentIntent(intentId, cancellation = {}) {
    return this.request(
      "POST",
      `/payment-intents/${encodeURIComponent(intentId)}/cancel`,
      cancellation
    );
  }

  async request(method, path, body) {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

    const text = await response.text();
    const payload = text ? JSON.parse(text) : {};

    if (!response.ok) {
      throw new AP2BridgeError(`AP2 API error ${response.status}`, {
        status: response.status,
        payload,
      });
    }

    return payload;
  }
}

class APortAP2Bridge {
  constructor(options = {}) {
    this.policyId =
      options.policyId ||
      process.env.APORT_AP2_POLICY_ID ||
      "finance.payment.authorization.v1";
    this.aportClient =
      options.aportClient ||
      new APortClient({
        baseUrl:
          options.aportBaseUrl ||
          process.env.APORT_BASE_URL ||
          "https://api.aport.io",
        apiKey: options.aportApiKey || process.env.APORT_API_KEY,
        timeoutMs: options.timeoutMs,
      });
    this.ap2Client = options.ap2Client || new AP2Client(options.ap2 || {});
    this.now = options.now || (() => new Date());
  }

  async authorizePaymentIntent(paymentIntent, options = {}) {
    const normalizedIntent = normalizePaymentIntent(paymentIntent);
    const agentId = resolveAgentId(normalizedIntent, options.agentId);
    const context = buildAPortContext(normalizedIntent, options.context);
    const idempotencyKey =
      options.idempotencyKey || normalizedIntent.id || context.ap2.intentId;

    const decision = await this.aportClient.verifyPolicy(
      agentId,
      options.policyId || this.policyId,
      context,
      idempotencyKey
    );

    const tracedIntent = appendAPortPolicyTrace(
      normalizedIntent,
      decision,
      options.policyId || this.policyId,
      this.now()
    );

    if (!decision.allow) {
      if (options.throwOnDeny) {
        throw new APortAuthorizationError(
          "APort denied AP2 payment authorization",
          decision,
          { paymentIntent: tracedIntent }
        );
      }

      return {
        authorized: false,
        status: "denied",
        decision,
        paymentIntent: tracedIntent,
      };
    }

    return {
      authorized: true,
      status: "authorized",
      decision,
      paymentIntent: tracedIntent,
    };
  }

  async createAuthorizedPaymentIntent(paymentIntent, options = {}) {
    const authorization = await this.authorizePaymentIntent(paymentIntent, options);

    if (!authorization.authorized) {
      return authorization;
    }

    const ap2PaymentIntent = await this.ap2Client.createPaymentIntent(
      authorization.paymentIntent
    );

    return {
      ...authorization,
      status: ap2PaymentIntent.status || authorization.status,
      ap2PaymentIntent,
    };
  }

  async confirmAuthorizedPaymentIntent(paymentIntent, options = {}) {
    const authorization = await this.createAuthorizedPaymentIntent(
      paymentIntent,
      options
    );

    if (!authorization.authorized) {
      return authorization;
    }

    const intentId =
      authorization.ap2PaymentIntent.id || authorization.paymentIntent.id;
    const confirmation = await this.ap2Client.confirmPaymentIntent(intentId, {
      sellerAcceptance: options.sellerAcceptance || {},
      aportDecision: summarizeDecision(authorization.decision),
    });

    return {
      ...authorization,
      status: confirmation.status || "confirmed",
      confirmation,
    };
  }
}

function buildAPortContext(paymentIntent, extraContext = {}) {
  const amount = paymentIntent.amount || {};
  const terms = paymentIntent.terms || {};
  const participants = paymentIntent.participants || {};

  return {
    ...extraContext,
    ap2: {
      intentId: paymentIntent.id,
      amount: amount.value,
      amountMinor: toMinorUnits(amount.value),
      currency: amount.currency,
      buyerDid: participants.buyer,
      sellerDid: participants.seller,
      settlementRail: terms.settlementRail,
      captureType: terms.captureType,
      releaseCondition: terms.releaseCondition,
      disputeWindow: terms.disputeWindow,
      lineItems: paymentIntent.lineItems || [],
      evidence: paymentIntent.evidence || [],
      mandates: paymentIntent.mandates || {},
      status: paymentIntent.status || "pending",
    },
  };
}

function appendAPortPolicyTrace(paymentIntent, decision, policyId, timestamp) {
  const reasons = Array.isArray(decision.reasons) ? decision.reasons : [];
  const message =
    reasons.length > 0
      ? reasons
          .map((reason) => reason.message || reason.code || String(reason))
          .join("; ")
      : decision.allow
      ? "APort passport authorization passed"
      : "APort passport authorization denied";

  return {
    ...paymentIntent,
    policyTrace: [
      ...(paymentIntent.policyTrace || []),
      {
        verifier: "aport",
        ruleId: policyId,
        outcome: decision.allow ? "allow" : "deny",
        message,
        decisionId: decision.decision_id || decision.decisionId,
        assuranceLevel: decision.assurance_level || decision.assuranceLevel,
        evaluatedAt: timestamp.toISOString(),
      },
    ],
  };
}

function normalizePaymentIntent(paymentIntent) {
  if (!paymentIntent || typeof paymentIntent !== "object") {
    throw new AP2BridgeError("paymentIntent must be an object");
  }

  if (!paymentIntent.amount || typeof paymentIntent.amount !== "object") {
    throw new AP2BridgeError("paymentIntent.amount is required");
  }

  if (!paymentIntent.amount.value || !paymentIntent.amount.currency) {
    throw new AP2BridgeError(
      "paymentIntent.amount.value and paymentIntent.amount.currency are required"
    );
  }

  if (
    !paymentIntent.participants ||
    !paymentIntent.participants.buyer ||
    !paymentIntent.participants.seller
  ) {
    throw new AP2BridgeError(
      "paymentIntent.participants.buyer and paymentIntent.participants.seller are required"
    );
  }

  return {
    status: "pending",
    lineItems: [],
    evidence: [],
    ...paymentIntent,
  };
}

function resolveAgentId(paymentIntent, overrideAgentId) {
  const agentId =
    overrideAgentId ||
    paymentIntent.agentId ||
    paymentIntent.agent_id ||
    paymentIntent.participants.buyer;

  if (!agentId) {
    throw new AP2BridgeError(
      "APort agent id is required. Pass options.agentId or include paymentIntent.agentId."
    );
  }

  return agentId;
}

function summarizeDecision(decision) {
  return {
    allow: Boolean(decision.allow),
    decisionId: decision.decision_id || decision.decisionId,
    assuranceLevel: decision.assurance_level || decision.assuranceLevel,
    reasons: decision.reasons || [],
  };
}

function toMinorUnits(value) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return undefined;
  }

  return Math.round(numberValue * 100);
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

module.exports = {
  AP2Client,
  APortAP2Bridge,
  AP2BridgeError,
  APortAuthorizationError,
  appendAPortPolicyTrace,
  buildAPortContext,
};
