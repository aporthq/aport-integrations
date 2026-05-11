const crypto = require("crypto");

const DEFAULT_POLICY_PACK = "payments.transfer.v1";
const DEFAULT_ISSUER = "aport-ap2-bridge";

class AP2BridgeError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "AP2BridgeError";
    this.code = code;
    this.details = details;
  }
}

class FetchAPortClient {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.APORT_API_KEY;
    this.baseUrl =
      options.baseUrl || process.env.APORT_BASE_URL || "https://aport.io";
  }

  async verify(policy, agentId, context = {}) {
    const response = await fetch(
      `${this.baseUrl.replace(/\/$/, "")}/api/verify/policy/${encodeURIComponent(policy)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify({
          context: {
            agent_id: agentId,
            policy_id: policy,
            context,
          },
        }),
      }
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`APort verify failed: ${response.status} ${body}`);
    }

    return response.json();
  }
}

function createDefaultAPortClient(options = {}) {
  try {
    const sdk = require("@aporthq/sdk-node");
    const Client = sdk.APortClient || sdk.default || sdk;
    return new Client(options);
  } catch (_error) {
    return new FetchAPortClient(options);
  }
}

class AP2AuthorizationBridge {
  constructor(options = {}) {
    this.aportClient = options.aportClient || createDefaultAPortClient(options);
    this.policyPack = options.policyPack || DEFAULT_POLICY_PACK;
    this.receiptIssuer = options.receiptIssuer || DEFAULT_ISSUER;
    this.now = options.now || (() => new Date());
  }

  async authorizePaymentIntent(paymentIntent, options = {}) {
    const normalizedIntent = normalizePaymentIntent(paymentIntent);
    const policyPack = options.policyPack || this.policyPack;
    const agentId = options.agentId || normalizedIntent.payerAgentId;
    const context = this.createAPortPolicyContext(normalizedIntent, options);

    try {
      const verification = await this.aportClient.verify(
        policyPack,
        agentId,
        context
      );

      const verified = Boolean(
        verification.verified ?? verification.allowed ?? verification.success
      );

      return {
        authorized: verified,
        paymentIntent: normalizedIntent,
        aport: verification,
        ap2: {
          delegatePayload: this.createDelegatePayload(normalizedIntent),
          mandateReceipt: this.createMandateReceipt(normalizedIntent, {
            result: verified ? "success" : "error",
            error: verified ? undefined : "invalid_mandate",
            errorDescription: verified
              ? undefined
              : verification.message || "APort policy denied payment intent",
            policyPack,
            agentId,
            verificationId: verification.id || verification.verification_id,
          }),
        },
      };
    } catch (error) {
      return {
        authorized: false,
        paymentIntent: normalizedIntent,
        error,
        ap2: {
          delegatePayload: this.createDelegatePayload(normalizedIntent),
          mandateReceipt: this.createMandateReceipt(normalizedIntent, {
            result: "error",
            error: "unresolved_constraint",
            errorDescription: error.message,
            policyPack,
            agentId,
          }),
        },
      };
    }
  }

  createAPortPolicyContext(paymentIntent, options = {}) {
    const normalizedIntent = normalizePaymentIntent(paymentIntent);

    return {
      action: "ap2.payment.authorize",
      ap2_version: options.ap2Version || "0.2",
      payment_intent_id: normalizedIntent.id,
      transaction_id: normalizedIntent.id,
      amount: normalizedIntent.amount.amount,
      currency: normalizedIntent.amount.currency,
      payee: normalizedIntent.payee,
      payer_agent_id: normalizedIntent.payerAgentId,
      payment_instrument: normalizedIntent.paymentInstrument || null,
      mandate_reference: stableHash(normalizedIntent),
      metadata: normalizedIntent.metadata,
    };
  }

  createDelegatePayload(paymentIntent) {
    const normalizedIntent = normalizePaymentIntent(paymentIntent);

    return {
      type: "delegate",
      format: "dc+sd-jwt",
      delegate_payload: [
        {
          vct: "mandate.payment.1",
          transaction_id: normalizedIntent.id,
          payment_amount: normalizedIntent.amount,
          payee: normalizedIntent.payee,
          payment_instrument: normalizedIntent.paymentInstrument || null,
        },
      ],
    };
  }

  createMandateReceipt(paymentIntent, options = {}) {
    const normalizedIntent = normalizePaymentIntent(paymentIntent);
    const result = options.result || "success";
    const issuedAt = Math.floor(this.now().getTime() / 1000);
    const receipt = {
      iss: this.receiptIssuer,
      result,
      reference: stableHash(normalizedIntent),
      iat: issuedAt,
      payment_intent_id: normalizedIntent.id,
      policy_pack: options.policyPack || this.policyPack,
      aport_agent_id: options.agentId || normalizedIntent.payerAgentId,
    };

    if (options.verificationId) {
      receipt.aport_verification_id = options.verificationId;
    }

    if (result === "error") {
      receipt.error = options.error || "invalid_mandate";
      receipt.error_description =
        options.errorDescription || "Payment intent was not authorized";
    }

    return receipt;
  }
}

function normalizePaymentIntent(paymentIntent) {
  if (!paymentIntent || typeof paymentIntent !== "object") {
    throw new AP2BridgeError(
      "invalid_payment_intent",
      "paymentIntent must be an object"
    );
  }

  const id = requireString(paymentIntent.id, "id");
  const amount = normalizeAmount(paymentIntent.amount);
  const payee = normalizePayee(paymentIntent.payee);
  const payerAgentId = requireString(
    paymentIntent.payerAgentId || paymentIntent.payer_agent_id,
    "payerAgentId"
  );

  return {
    id,
    amount,
    payee,
    payerAgentId,
    paymentInstrument:
      paymentIntent.paymentInstrument || paymentIntent.payment_instrument,
    metadata: paymentIntent.metadata || {},
  };
}

function normalizeAmount(amount) {
  if (!amount || typeof amount !== "object") {
    throw new AP2BridgeError(
      "invalid_amount",
      "amount must include amount and currency"
    );
  }

  const value = Number(amount.amount ?? amount.value);
  if (!Number.isFinite(value) || value <= 0) {
    throw new AP2BridgeError(
      "invalid_amount",
      "amount.amount must be a positive number"
    );
  }

  return {
    amount: value,
    currency: requireString(amount.currency, "amount.currency").toUpperCase(),
  };
}

function normalizePayee(payee) {
  if (!payee || typeof payee !== "object") {
    throw new AP2BridgeError("invalid_payee", "payee must be an object");
  }

  return {
    id: requireString(payee.id, "payee.id"),
    name: requireString(payee.name, "payee.name"),
    ...(payee.website ? { website: payee.website } : {}),
  };
}

function requireString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new AP2BridgeError(
      "missing_required_field",
      `${field} must be a non-empty string`,
      { field }
    );
  }

  return value.trim();
}

function stableHash(value) {
  return crypto
    .createHash("sha256")
    .update(stableStringify(value))
    .digest("base64url");
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

module.exports = {
  AP2AuthorizationBridge,
  AP2BridgeError,
  createDefaultAPortClient,
};
