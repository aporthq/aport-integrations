import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { test } from 'node:test';
import { createApp } from '../src/app.js';
import { buildRefundVerificationPayload } from '../src/aport.js';

const config = {
  shopifyWebhookSecret: 'top-secret',
  shopifyShopDomain: 'demo.myshopify.com',
  shopifyAdminAccessToken: 'shpat_test',
  aportApiBaseUrl: 'https://aport.example',
  aportApiKey: 'aport_test',
  aportPolicyId: 'payments.refund.v1',
  aportAgentPassportId: 'shopify-refund-agent',
  refundHoldTag: 'aport-refund-review',
};

test('rejects webhooks with invalid Shopify HMAC', async () => {
  const app = createApp(config, { fetch: async () => assert.fail('fetch should not be called') });
  const server = app.listen(0);

  try {
    const response = await fetch(url(server), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-shopify-hmac-sha256': 'bad-signature',
      },
      body: JSON.stringify({ id: 1, order_id: 2 }),
    });

    assert.equal(response.status, 401);
  } finally {
    server.close();
  }
});

test('approves refund when APort allows the payments.refund.v1 action', async () => {
  const calls = [];
  const refund = { id: 1001, order_id: 2002, transactions: [{ kind: 'refund', amount: '42.50', currency: 'USD' }] };
  const app = createApp(config, { fetch: mockFetch(calls, { allowed: true, reason: 'within policy' }) });
  const server = app.listen(0);

  try {
    const response = await fetch(url(server), signedRequest(refund));
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.status, 'approved');
    assert.equal(calls.length, 2);
    assert.equal(JSON.parse(calls[1].body).action, 'payments.refund.v1');
  } finally {
    server.close();
  }
});

test('holds refund and tags order when APort denies the request', async () => {
  const calls = [];
  const refund = { id: 1001, order_id: 2002, transactions: [{ kind: 'refund', amount: '125.00', currency: 'USD' }] };
  const app = createApp(config, { fetch: mockFetch(calls, { allowed: false, reason: 'amount above limit' }) });
  const server = app.listen(0);

  try {
    const response = await fetch(url(server), signedRequest(refund));
    const body = await response.json();

    assert.equal(response.status, 202);
    assert.equal(body.status, 'held_for_review');
    assert.equal(calls.length, 4);
    assert.equal(JSON.parse(calls[3].body).order.tags, 'existing, aport-refund-review');
  } finally {
    server.close();
  }
});

test('buildRefundVerificationPayload includes refund amount and policy metadata', () => {
  const payload = buildRefundVerificationPayload(
    { id: 10, order_id: 20, transactions: [{ kind: 'refund', amount: '12.34', currency: 'USD' }] },
    { id: 20 },
    config,
  );

  assert.equal(payload.policyId, 'payments.refund.v1');
  assert.equal(payload.passportId, 'shopify-refund-agent');
  assert.equal(payload.context.amount, 12.34);
  assert.equal(payload.resource.type, 'shopify_refund');
});

function signedRequest(payload) {
  const body = JSON.stringify(payload);
  const hmac = crypto
    .createHmac('sha256', config.shopifyWebhookSecret)
    .update(Buffer.from(body))
    .digest('base64');

  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-shopify-hmac-sha256': hmac,
    },
    body,
  };
}

function mockFetch(calls, aportDecision) {
  return async (requestUrl, options = {}) => {
    calls.push({ requestUrl: String(requestUrl), ...options });

    if (String(requestUrl).includes('/admin/api/')) {
      if (options.method === 'PUT') {
        return jsonResponse({ order: { id: 2002 } });
      }
      return jsonResponse({ order: { id: 2002, tags: 'existing' } });
    }

    return jsonResponse(aportDecision);
  };
}

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    },
  };
}

function url(server) {
  const { port } = server.address();
  return `http://127.0.0.1:${port}/webhooks/refunds/create`;
}
