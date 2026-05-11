<?php

namespace Aport\Laravel\Http\Middleware;

use Aport\Laravel\Contracts\AportClient;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class VerifyAport
{
    public function __construct(private readonly AportClient $client)
    {
    }

    public function handle(Request $request, Closure $next, ?string $policy = null): Response
    {
        $policy = $policy ?: (string) config('aport.default_policy');

        if ($policy === '') {
            return $this->reject('APort policy is required.', 500);
        }

        $agentId = $this->agentId($request);

        if ($agentId === null) {
            return $this->reject('APort agent ID is required.', 400);
        }

        try {
            $result = $this->client->verify($policy, $agentId, $this->context($request));
        } catch (Throwable $exception) {
            if ((bool) config('aport.fail_open', false)) {
                $request->attributes->set('aport', [
                    'verified' => false,
                    'agent_id' => $agentId,
                    'policy' => $policy,
                    'error' => $exception->getMessage(),
                ]);

                return $next($request);
            }

            return $this->reject('APort verification service error.', 502, [
                'details' => $exception->getMessage(),
            ]);
        }

        if (! $result->verified()) {
            return $this->reject($result->message() ?: 'APort verification failed.', 403, [
                'details' => $result->details(),
            ]);
        }

        $request->attributes->set('aport', $result->toArray());
        $request->attributes->set('aport.passport', $result->passport());

        return $next($request);
    }

    private function agentId(Request $request): ?string
    {
        foreach ((array) config('aport.agent_headers', []) as $header) {
            $value = $request->headers->get((string) $header);

            if (is_string($value) && trim($value) !== '') {
                return trim($value);
            }
        }

        foreach (['agent_id', 'agentId'] as $key) {
            $value = $request->query($key) ?? $request->input($key);

            if (is_string($value) && trim($value) !== '') {
                return trim($value);
            }
        }

        return null;
    }

    /**
     * @return array<string, mixed>
     */
    private function context(Request $request): array
    {
        return [
            'method' => $request->method(),
            'path' => '/' . ltrim($request->path(), '/'),
            'route' => optional($request->route())->getName(),
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ];
    }

    /**
     * @param array<string, mixed> $extra
     */
    private function reject(string $message, int $status, array $extra = []): JsonResponse
    {
        return response()->json(array_merge([
            'error' => 'aport_verification_failed',
            'message' => $message,
        ], $extra), $status);
    }
}
