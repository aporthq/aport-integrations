# AP2 Bridge - Payment Authorization with APort

Proof-of-concept for using APort Passport to authorize AP2 payment intents.

## What It Does

- Verifies payments with APort before creation
- Blocks suspicious transactions
- Supports payment capture and refund

## Installation

```bash
npm install
```

## Configuration

```env
APORT_API_KEY=your-aport-key
APORT_PROJECT_ID=default
AP2_API_KEY=your-ap2-key
AP2_API_URL=https://api.ap2.io
PORT=3000
```

## Usage

### Create Payment Intent

```bash
POST /api/payment/intent
{
  "amount": 1000,
  "currency": "USD",
  "customer_id": "cus_123",
  "metadata": {"order_id": "ord_456"}
}
```

### Capture Payment

```bash
POST /api/payment/capture
{
  "payment_intent_id": "pi_xxx",
  "customer_id": "cus_123"
}
```

### Refund

```bash
POST /api/payment/refund
{
  "payment_intent_id": "pi_xxx",
  "amount": 500,
  "customer_id": "cus_123",
  "reason": "requested_by_customer"
}
```

## How It Works

1. Client requests payment
2. Bridge verifies with APort
3. If allowed: create payment with AP2
4. If denied: return blocked response

## Example Use Cases

- Block high-risk transactions
- Require additional verification for large amounts
- Rate limit payment attempts
- Block flagged customers

## API Reference

### createPaymentIntent

Creates payment after APort verification.

### capturePayment

Captures authorized payment.

### refundPayment

Processes refund after verification.

## License

MIT
