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
    const { amount, to_account, description } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid amount is required' },
        { status: 400 }
      );
    }

    if (!to_account) {
      return NextResponse.json(
        { error: 'Destination account is required' },
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
    if (passport?.limits?.transfer_amount_max_per_tx && amount > passport.limits.transfer_amount_max_per_tx) {
      return NextResponse.json(
        { 
          error: 'Amount exceeds limit',
          max_amount: passport.limits.transfer_amount_max_per_tx,
          requested_amount: amount
        },
        { status: 403 }
      );
    }

    // Simulate transfer processing
    const transferId = `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return NextResponse.json({
      success: true,
      transfer_id: transferId,
      amount: amount,
      to_account: to_account,
      description: description || 'No description provided',
      agent_id: agentId,
      processed_at: new Date().toISOString(),
      passport_limits: passport?.limits || null
    });

  } catch (error) {
    console.error('Transfer processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Transfer endpoint - POST requests only',
    method: 'POST',
    required_headers: ['X-Agent-ID'],
    example_payload: {
      amount: 500,
      to_account: 'account_123',
      description: 'Payment for services'
    }
  });
}
