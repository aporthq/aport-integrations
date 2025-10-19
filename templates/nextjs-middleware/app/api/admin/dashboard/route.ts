import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
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

    // Simulate admin dashboard data
    const dashboardData = {
      agent_id: agentId,
      capabilities: passport?.capabilities || [],
      limits: passport?.limits || {},
      metadata: passport?.metadata || {},
      system_stats: {
        total_users: 1250,
        active_sessions: 45,
        pending_transactions: 12,
        system_health: 'healthy'
      },
      recent_activity: [
        {
          id: 1,
          action: 'user_login',
          timestamp: new Date(Date.now() - 300000).toISOString(),
          details: 'User logged in successfully'
        },
        {
          id: 2,
          action: 'payment_processed',
          timestamp: new Date(Date.now() - 600000).toISOString(),
          details: 'Payment of $150 processed'
        },
        {
          id: 3,
          action: 'admin_access',
          timestamp: new Date(Date.now() - 900000).toISOString(),
          details: 'Admin dashboard accessed'
        }
      ]
    };

    return NextResponse.json({
      success: true,
      data: dashboardData,
      accessed_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Admin dashboard error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
