<?php

namespace Aport\Laravel\Exceptions;

use Illuminate\Http\Client\Response;
use RuntimeException;

class AportVerificationException extends RuntimeException
{
    public static function fromResponse(Response $response): self
    {
        $payload = $response->json() ?? [];
        $message = $payload['message']
            ?? $payload['error']
            ?? 'APort verification request failed.';

        return new self($message, $response->status());
    }
}
