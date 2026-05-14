export class APortVerificationError extends Error {
  constructor(message, details = undefined) {
    super(message);
    this.name = 'APortVerificationError';
    this.details = details;
  }
}

export function buildRefundVerificationPayload(refund, order, config) {
  const refundTotal = calculateRefundTotal(refund);

  return {
    policyId: config.aportPolicyId,
    passportId: config.aportAgentPassportId,
    action: 'payments.refund.v1',
    resource: {
      type: 'shopify_refund',
      shop: config.shopifyShopDomain,
      orderId: String(refund.order_id || order?.id || ''),
      refundId: String(refund.id || ''),
    },
    context: {
      refund,
      order,
      amount: refundTotal.amount,
      currency: refundTotal.currency,
      createdAt: refund.created_at,
    },
  };
}

export async function verifyRefundWithAPort(refund, order, config, fetchImpl = globalThis.fetch) {
  if (!fetchImpl) {
    throw new APortVerificationError('No fetch implementation is available');
  }

  const response = await fetchImpl(`${config.aportApiBaseUrl}/v1/verify`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.aportApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildRefundVerificationPayload(refund, order, config)),
  });

  let body;
  try {
    body = await response.json();
  } catch {
    body = {};
  }

  if (!response.ok) {
    throw new APortVerificationError('APort verification request failed', {
      status: response.status,
      body,
    });
  }

  return {
    allowed: body.allowed === true || body.decision === 'allow',
    decision: body.decision || (body.allowed ? 'allow' : 'deny'),
    reason: body.reason || body.message || 'No reason provided',
    raw: body,
  };
}

function calculateRefundTotal(refund) {
  const transactions = Array.isArray(refund.transactions) ? refund.transactions : [];
  const refundLineItems = Array.isArray(refund.refund_line_items) ? refund.refund_line_items : [];

  const transactionTotal = transactions
    .filter((transaction) => ['refund', 'suggested_refund'].includes(transaction.kind))
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

  const lineItemTotal = refundLineItems
    .reduce((sum, item) => sum + Number(item.subtotal || item.total_tax || 0), 0);

  const amount = transactionTotal || lineItemTotal;
  const currency = transactions.find((transaction) => transaction.currency)?.currency
    || refund.currency
    || 'USD';

  return { amount, currency };
}
