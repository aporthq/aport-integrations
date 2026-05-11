class RefundsController < ApplicationController
  require_aport_policy "finance.payment.refund.v1", context: { resource: "refund" }

  def create
    render json: {
      ok: true,
      agent_id: aport_verification.agent_id,
      passport: aport_verification.passport
    }
  end
end
