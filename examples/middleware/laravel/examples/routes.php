<?php

use App\Http\Controllers\RefundController;
use Illuminate\Support\Facades\Route;

Route::post('/refunds', [RefundController::class, 'store'])
    ->middleware('aport.verify:finance.payment.refund.v1');
