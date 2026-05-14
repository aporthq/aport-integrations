<?php

namespace Aport\Laravel\Http\Middleware;

use Aport\Laravel\AportClient;
use Aport\Laravel\Exceptions\AportVerificationException;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireAportPolicy
{
    public function __construct(private readonly AportClient $client)
    {
    }

    public function handle(Request $request, Closure $next, ?string $policy = null): Response
    {
        $policy ??= (string) config('aport.default_policy');
        $agentId = $this->extractAgentId($request);

        if ($agentId === null) {
            return $this->jsonError(
                'APort agent id is required.',
                'Provide X-Agent-ID, X-APort-Agent-ID, agent_id, or agentId.',
                400,
            );
        }

        try {
            $result = $this->client->verify($policy, $agentId, $this->contextFor($request));
        } catch (AportVerificationException $exception) {
            if ((bool) config('aport.fail_open', false)) {
                $request->attributes->set('aport', [
                    'verified' => false,
                    'agent_id' => $agentId,
                    'policy' => $policy,
                    'error' => $exception->getMessage(),
                ]);
                $request->attributes->set('aport.agent_id', $agentId);
                $request->attributes->set('aport.policy', $policy);

                return $next($request);
            }

            return $this->jsonError('APort verification failed.', $exception->getMessage(), 502);
        }

        if (! $result['verified']) {
            return $this->jsonError(
                'APort policy denied this request.',
                'The agent is not allowed to perform this action.',
                403,
                ['reasons' => $result['reasons']],
            );
        }

        $request->attributes->set('aport', $result);
        $request->attributes->set('aport.agent_id', $agentId);
        $request->attributes->set('aport.passport', $result['passport']);
        $request->attributes->set('aport.policy', $policy);

        return $next($request);
    }

    private function extractAgentId(Request $request): ?string
    {
        $candidates = [
            $request->header('X-Agent-ID'),
            $request->header('X-APort-Agent-ID'),
            $request->query('agent_id'),
            $request->input('agent_id'),
            $request->input('agentId'),
        ];

        foreach ($candidates as $candidate) {
            if (is_string($candidate) && trim($candidate) !== '') {
                return trim($candidate);
            }
        }

        return null;
    }

    private function contextFor(Request $request): array
    {
        $configuredContext = config('aport.context', []);
        $requestContext = $request->attributes->get('aport_context', []);

        if (! is_array($configuredContext)) {
            $configuredContext = [];
        }

        if (! is_array($requestContext)) {
            $requestContext = [];
        }

        return array_filter([
            ...$configuredContext,
            'method' => $request->method(),
            'path' => '/' . ltrim($request->path(), '/'),
            'route' => $request->route()?->getName(),
            'ip' => $request->ip(),
            ...$requestContext,
        ], static fn ($value): bool => $value !== null);
    }

    private function jsonError(
        string $message,
        string $detail,
        int $status,
        array $extra = [],
    ): JsonResponse {
        return response()->json([
            'message' => $message,
            'detail' => $detail,
            ...$extra,
        ], $status);
    }
}
