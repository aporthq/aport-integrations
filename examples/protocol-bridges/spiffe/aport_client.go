package spiffebridge

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// VerificationRequest is the payload sent to APort for policy verification.
type VerificationRequest struct {
	PolicyID string         `json:"policy_id"`
	AgentID  string         `json:"agent_id"`
	Context  map[string]any `json:"context,omitempty"`
}

// VerificationResult is the normalized response returned by APort.
type VerificationResult struct {
	Verified bool           `json:"verified"`
	PolicyID string         `json:"policy_id"`
	AgentID  string         `json:"agent_id"`
	Passport map[string]any `json:"passport,omitempty"`
	Message  string         `json:"message,omitempty"`
	Details  map[string]any `json:"details,omitempty"`
	Raw      map[string]any `json:"raw,omitempty"`
}

// APortVerifier abstracts APort verification for tests and alternate SDKs.
type APortVerifier interface {
	Verify(context.Context, VerificationRequest) (VerificationResult, error)
}

// HTTPAPortClient is a minimal APort verification client for Go integrations.
type HTTPAPortClient struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client
	userAgent  string
}

// NewHTTPAPortClient returns a client that calls APort's policy verification endpoint.
func NewHTTPAPortClient(baseURL, apiKey string, timeout time.Duration) (*HTTPAPortClient, error) {
	parsed, err := url.Parse(strings.TrimRight(baseURL, "/"))
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return nil, fmt.Errorf("invalid APort base URL: %q", baseURL)
	}

	if timeout <= 0 {
		timeout = defaultTimeout
	}

	return &HTTPAPortClient{
		baseURL:    strings.TrimRight(baseURL, "/"),
		apiKey:     apiKey,
		httpClient: &http.Client{Timeout: timeout},
		userAgent:  "aport-spiffe-bridge/1.0",
	}, nil
}

// Verify verifies an APort agent against a policy pack.
func (c *HTTPAPortClient) Verify(ctx context.Context, req VerificationRequest) (VerificationResult, error) {
	if strings.TrimSpace(req.PolicyID) == "" {
		return VerificationResult{}, fmt.Errorf("APort policy ID is required")
	}
	if strings.TrimSpace(req.AgentID) == "" {
		return VerificationResult{}, fmt.Errorf("APort agent ID is required")
	}

	body, err := json.Marshal(req)
	if err != nil {
		return VerificationResult{}, fmt.Errorf("marshal verification request: %w", err)
	}

	endpoint := fmt.Sprintf("%s/api/verify/policy/%s", c.baseURL, url.PathEscape(req.PolicyID))
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return VerificationResult{}, fmt.Errorf("build verification request: %w", err)
	}

	httpReq.Header.Set("Accept", "application/json")
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("User-Agent", c.userAgent)
	if c.apiKey != "" {
		httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)
	}

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return VerificationResult{}, fmt.Errorf("call APort verification endpoint: %w", err)
	}
	defer resp.Body.Close()

	var payload map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return VerificationResult{}, fmt.Errorf("decode APort verification response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return VerificationResult{}, fmt.Errorf("APort verification failed with HTTP %d: %s", resp.StatusCode, messageFrom(payload))
	}

	return normalizeVerificationResult(payload, req), nil
}

func normalizeVerificationResult(payload map[string]any, req VerificationRequest) VerificationResult {
	verified := boolFrom(payload["verified"]) || boolFrom(payload["success"])

	return VerificationResult{
		Verified: verified,
		PolicyID: stringFromAny(payload["policy"], stringFromAny(payload["policy_id"], req.PolicyID)),
		AgentID:  stringFromAny(payload["agent_id"], req.AgentID),
		Passport: mapFromAny(payload["passport"]),
		Message:  stringFromAny(payload["message"], ""),
		Details:  mapFromAny(payload["details"]),
		Raw:      payload,
	}
}

func messageFrom(payload map[string]any) string {
	if message := stringFromAny(payload["message"], ""); message != "" {
		return message
	}
	if errorMessage := stringFromAny(payload["error"], ""); errorMessage != "" {
		return errorMessage
	}
	return "no error message returned"
}

func boolFrom(value any) bool {
	boolean, ok := value.(bool)
	return ok && boolean
}

func stringFromAny(value any, fallback string) string {
	text, ok := value.(string)
	if !ok || text == "" {
		return fallback
	}
	return text
}

func mapFromAny(value any) map[string]any {
	object, ok := value.(map[string]any)
	if !ok {
		return nil
	}
	return object
}
