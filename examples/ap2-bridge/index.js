/**
 * AP2 Bridge - Payment Authorization with APort
 * 
 * Demonstrates using APort Passport to authorize AP2 payment intents.
 */

const axios = require('axios');

// Configuration
const CONFIG = {
  aportApiKey: process.env.APORT_API_KEY,
  aportProjectId: process.env.APORT_PROJECT_ID || 'default',
  ap2ApiKey: process.env.AP2_API_KEY,
  ap2ApiUrl: process.env.AP2_API_URL || 'https://api.ap2.io',
};

/**
 * Verify with APort
 */
async function verifyWithAPort(action, actor, context) {
  if (!CONFIG.aportApiKey) {
    return { allow: true, reasons: ['No APort API key'] };
  }

  try {
    const response = await axios.post('https://api.aport.io/verify', {
      action,
      actor,
      context: { data: context },
      projectId: CONFIG.aportProjectId
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.aportApiKey}`
      },
      timeout: 5000
    });
    return response.data;
  } catch (error) {
    return { allow: true, reasons: ['Verification failed'] };
  }
}

/**
 * Create AP2 payment intent with APort authorization
 */
async function createPaymentIntent(amount, currency, customerId, metadata = {}) {
  // First verify with APort
  const verifyResult = await verifyWithAPort(
    'payment_intent_create',
    {
      id: customerId,
      name: `customer-${customerId}`,
      owner: 'ap2'
    },
    {
      amount,
      currency,
      ...metadata
    }
  );

  // If blocked, don't create payment
  if (!verifyResult.allow) {
    return {
      success: false,
      blocked: true,
      reasons: verifyResult.reasons,
      authorized: false
    };
  }

  // Create payment intent with AP2
  try {
    const response = await axios.post(`${CONFIG.ap2ApiUrl}/payment/intents`, {
      amount,
      currency,
      customer: customerId,
      metadata: {
        ...metadata,
        aport_verified: true
      }
    }, {
      headers: {
        'Authorization': `Bearer ${CONFIG.ap2ApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return {
      success: true,
      paymentIntent: response.data,
      authorized: true,
      verification: verifyResult
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      authorized: false
    };
  }
}

/**
 * Capture payment with APort verification
 */
async function capturePayment(paymentIntentId, customerId) {
  const verifyResult = await verifyWithAPort(
    'payment_capture',
    {
      id: customerId,
      name: `customer-${customerId}`,
      owner: 'ap2'
    },
    {
      payment_intent_id: paymentIntentId
    }
  );

  if (!verifyResult.allow) {
    return {
      success: false,
      blocked: true,
      reasons: verifyResult.reasons
    };
  }

  try {
    const response = await axios.post(
      `${CONFIG.ap2ApiUrl}/payment/intents/${paymentIntentId}/capture`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${CONFIG.ap2ApiKey}`
        }
      }
    );

    return {
      success: true,
      captured: true,
      payment: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Refund with APort verification
 */
async function refundPayment(paymentIntentId, amount, customerId, reason) {
  const verifyResult = await verifyWithAPort(
    'payment_refund',
    {
      id: customerId,
      name: `customer-${customerId}`,
      owner: 'ap2'
    },
    {
      payment_intent_id: paymentIntentId,
      refund_amount: amount,
      reason
    }
  );

  if (!verifyResult.allow) {
    return {
      success: false,
      blocked: true,
      reasons: verifyResult.reasons
    };
  }

  try {
    const response = await axios.post(
      `${CONFIG.ap2ApiUrl}/refunds`,
      {
        payment_intent: paymentIntentId,
        amount,
        reason
      },
      {
        headers: {
          'Authorization': `Bearer ${CONFIG.ap2ApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      refund: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Express server for webhook/API
const express = require('express');
const app = express();
app.use(express.json());

// Create payment intent endpoint
app.post('/api/payment/intent', async (req, res) => {
  const { amount, currency, customer_id, metadata } = req.body;
  
  const result = await createPaymentIntent(
    amount,
    currency || 'USD',
    customer_id,
    metadata
  );
  
  res.json(result);
});

// Capture endpoint
app.post('/api/payment/capture', async (req, res) => {
  const { payment_intent_id, customer_id } = req.body;
  
  const result = await capturePayment(payment_intent_id, customer_id);
  
  res.json(result);
});

// Refund endpoint
app.post('/api/payment/refund', async (req, res) => {
  const { payment_intent_id, amount, customer_id, reason } = req.body;
  
  const result = await refundPayment(
    payment_intent_id,
    amount,
    customer_id,
    reason
  );
  
  res.json(result);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`AP2 Bridge running on port ${PORT}`);
  });
}

module.exports = {
  createPaymentIntent,
  capturePayment,
  refundPayment,
  verifyWithAPort,
  CONFIG
};
