class RefundsController < ApplicationController
  require_aport_policy "finance.payment.refund.v1",
    context: { endpoint: "refunds#create", capability: "refund" }

  def create
    render json: {
      ok: true,
      agent_id: aport_agent_id,
      passport: aport_passport,
      amount: params[:amount]
    }
  end
end
