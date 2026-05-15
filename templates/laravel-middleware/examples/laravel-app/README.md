# Minimal Laravel Usage Example

Copy the `routes/api.php` and `RefundController.php` files into an existing
Laravel application after installing the package:

```bash
composer require aporthq/laravel-middleware
php artisan vendor:publish --tag=aport-config
```

Configure `.env`:

```env
APORT_API_KEY=aport_test_key
APORT_DEFAULT_POLICY=finance.payment.refund.v1
```

Run the example request:

```bash
curl -X POST http://localhost/api/refunds \
  -H "Content-Type: application/json" \
  -H "X-Agent-ID: agt_refund_bot_123" \
  -d '{"order_id":"ord_123","amount":49.99}'
```

The route only reaches `RefundController@store` when APort returns an allowed
verification result.
