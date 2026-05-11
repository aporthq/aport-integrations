<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RefundController
{
    public function store(Request $request): JsonResponse
    {
        $aport = $request->attributes->get('aport');
        $passport = $aport['passport'] ?? [];
        $limit = $passport['limits']['refund_amount_max_per_tx'] ?? 0;
        $amount = (int) $request->input('amount');

        if ($limit > 0 && $amount > $limit) {
            return response()->json([
                'error' => 'refund_limit_exceeded',
                'limit' => $limit,
            ], 403);
        }

        return response()->json([
            'status' => 'approved',
            'agent_id' => $aport['agent_id'] ?? null,
            'policy' => $aport['policy'] ?? null,
        ]);
    }
}
