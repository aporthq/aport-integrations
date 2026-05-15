<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RefundController
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'order_id' => ['required', 'string'],
            'amount' => ['required', 'numeric', 'min:0.01'],
        ]);

        return response()->json([
            'status' => 'refund queued',
            'order_id' => $validated['order_id'],
            'amount' => $validated['amount'],
            'aport' => [
                'agent_id' => $request->attributes->get('aport.agent_id'),
                'policy' => $request->attributes->get('aport.policy'),
            ],
        ]);
    }
}
