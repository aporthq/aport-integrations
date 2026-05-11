<?php

namespace Aport\Laravel\Support;

use Aport\Laravel\Contracts\AportClient as AportClientContract;
use Aport\Laravel\DTO\VerificationResult;
use Aport\Laravel\Exceptions\AportException;
use Aport\Laravel\Exceptions\VerificationRequestException;
use GuzzleHttp\Client;
use GuzzleHttp\ClientInterface;
use GuzzleHttp\Exception\GuzzleException;
use GuzzleHttp\Exception\RequestException;

class AportClient implements AportClientContract
{
    private ClientInterface $http;

    /**
     * @param array<string, mixed> $config
     */
    public function __construct(private readonly array $config = [], ?ClientInterface $http = null)
    {
        $this->http = $http ?: new Client([
            'base_uri' => rtrim((string) ($this->config['base_url'] ?? 'https://aport.io'), '/'),
            'timeout' => (float) ($this->config['timeout'] ?? 5.0),
        ]);
    }

    /**
     * @param array<string, mixed> $context
     */
    public function verify(string $policy, string $agentId, array $context = []): VerificationResult
    {
        $policy = trim($policy);
        $agentId = trim($agentId);

        if ($policy === '') {
            throw new AportException('APort policy is required.');
        }

        if ($agentId === '') {
            throw new AportException('APort agent ID is required.');
        }

        try {
            $response = $this->http->request('POST', "/api/verify/policy/{$policy}", [
                'headers' => $this->headers(),
                'json' => [
                    'policy_id' => $policy,
                    'agent_id' => $agentId,
                    'context' => $context,
                ],
            ]);
        } catch (RequestException $exception) {
            throw $this->requestException($exception);
        } catch (GuzzleException $exception) {
            throw new VerificationRequestException(
                'Unable to reach APort verification service: ' . $exception->getMessage(),
                previous: $exception,
            );
        }

        $payload = json_decode((string) $response->getBody(), true);

        if (! is_array($payload)) {
            throw new VerificationRequestException('APort returned an invalid JSON response.');
        }

        return VerificationResult::fromArray($payload, $policy, $agentId);
    }

    /**
     * @return array<string, string>
     */
    private function headers(): array
    {
        $headers = [
            'Accept' => 'application/json',
            'Content-Type' => 'application/json',
            'User-Agent' => 'aporthq-laravel-aport/1.0',
        ];

        $apiKey = $this->config['api_key'] ?? null;

        if (is_string($apiKey) && $apiKey !== '') {
            $headers['Authorization'] = 'Bearer ' . $apiKey;
        }

        return $headers;
    }

    private function requestException(RequestException $exception): VerificationRequestException
    {
        $response = $exception->getResponse();
        $message = 'APort verification request failed.';

        if ($response !== null) {
            $body = json_decode((string) $response->getBody(), true);

            if (is_array($body) && isset($body['message'])) {
                $message = (string) $body['message'];
            } else {
                $message = sprintf(
                    'APort verification request failed with HTTP %s.',
                    $response->getStatusCode(),
                );
            }
        }

        return new VerificationRequestException($message, previous: $exception);
    }
}
