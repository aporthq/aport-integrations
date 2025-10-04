import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Get APort verification data from middleware
    const verified = request.headers.get('x-aport-verified');
    const agentId = request.headers.get('x-aport-agent-id');
    const passportData = request.headers.get('x-aport-passport');

    if (!verified || verified !== 'true') {
      return NextResponse.json(
        { error: 'Agent verification required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { amount, reason } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid amount is required' },
        { status: 400 }
      );
    }

    // Parse passport data
    let passport;
    try {
      passport = passportData ? JSON.parse(Buffer.from(passportData, 'base64').toString()) : null;
    } catch (error) {
      console.error('Error parsing passport data:', error);
      return NextResponse.json(
        { error: 'Invalid passport data' },
        { status: 500 }
      );
    }

    // Check amount against passport limits
    if (passport?.limits?.refund_amount_max_per_tx && amount > passport.limits.refund_amount_max_per_tx) {
      return NextResponse.json(
        { 
          error: 'Amount exceeds limit',
          max_amount: passport.limits.refund_amount_max_per_tx,
          requested_amount: amount
        },
        { status: 403 }
      );
    }

    // Simulate refund processing
    const refundId = `refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return NextResponse.json({
      success: true,
      refund_id: refundId,
      amount: amount,
      reason: reason || 'No reason provided',
      agent_id: agentId,
      processed_at: new Date().toISOString(),
      passport_limits: passport?.limits || null
    });

  } catch (error) {
    console.error('Refund processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Refund endpoint - POST requests only',
    method: 'POST',
    required_headers: ['X-Agent-ID'],
    example_payload: {
      amount: 100,
      reason: 'Customer requested refund'
    }
  });
}
