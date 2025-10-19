// Type definitions for APort integration
export interface APortPassport {
  agent_id: string;
  capabilities: string[];
  limits: {
    refund_amount_max_per_tx?: number;
    transfer_amount_max_per_tx?: number;
    [key: string]: any;
  };
  metadata: {
    verified_at: string;
    policy: string;
    [key: string]: any;
  };
}

export interface APortVerificationResult {
  verified: boolean;
  passport?: APortPassport;
  message: string;
  details?: Record<string, any>;
}

export interface APortClient {
  verify(
    policy: string, 
    agentId: string, 
    context?: Record<string, any>
  ): Promise<APortVerificationResult>;
}

// Extend NextRequest to include APort headers
declare module 'next/server' {
  interface NextRequest {
    aport?: {
      verified: boolean;
      passport?: APortPassport;
      policy?: string;
      agentId?: string;
      result?: APortVerificationResult;
    };
  }
}
