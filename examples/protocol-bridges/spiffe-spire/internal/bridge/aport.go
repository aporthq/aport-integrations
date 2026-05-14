package bridge

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type VerificationRequest struct {
	Policy  string         `json:"policy"`
	AgentID string         `json:"agent_id"`
	Context map[string]any `json:"context"`
}

type VerificationResult struct {
	Allowed bool            `json:"allowed"`
	Reason  string          `json:"reason,omitempty"`
	Raw     json.RawMessage `json:"raw,omitempty"`
}

type Verifier interface {
	Verify(ctx context.Context, request VerificationRequest) (VerificationResult, error)
}

type HTTPVerifier struct {
	BaseURL string
	APIKey  string
	Client  *http.Client
}

func NewHTTPVerifier(baseURL, apiKey string) HTTPVerifier {
	if baseURL == "" {
		baseURL = "https://aport.io"
	}

	return HTTPVerifier{
		BaseURL: strings.TrimRight(baseURL, "/"),
		APIKey:  apiKey,
		Client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (verifier HTTPVerifier) Verify(ctx context.Context, request VerificationRequest) (VerificationResult, error) {
	payload := map[string]any{
		"context": map[string]any{
			"agent_id":  request.AgentID,
			"policy_id": request.Policy,
			"context":   request.Context,
		},
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return VerificationResult{}, err
	}

	httpRequest, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		verifier.BaseURL+"/api/verify/policy/"+request.Policy,
		bytes.NewReader(body),
	)
	if err != nil {
		return VerificationResult{}, err
	}

	httpRequest.Header.Set("Content-Type", "application/json")
	if verifier.APIKey != "" {
		httpRequest.Header.Set("Authorization", "Bearer "+verifier.APIKey)
	}

	client := verifier.Client
	if client == nil {
		client = http.DefaultClient
	}

	response, err := client.Do(httpRequest)
	if err != nil {
		return VerificationResult{}, err
	}
	defer response.Body.Close()

	responseBody, err := io.ReadAll(response.Body)
	if err != nil {
		return VerificationResult{}, err
	}

	if response.StatusCode >= 400 {
		return VerificationResult{
			Allowed: false,
			Reason:  fmt.Sprintf("APort returned status %d", response.StatusCode),
			Raw:     responseBody,
		}, nil
	}

	return NormalizeAPortDecision(responseBody)
}

func NormalizeAPortDecision(body []byte) (VerificationResult, error) {
	var response map[string]any
	if err := json.Unmarshal(body, &response); err != nil {
		return VerificationResult{}, err
	}

	if decision, ok := response["decision"].(map[string]any); ok {
		return normalizeDecisionMap(decision, body), nil
	}

	if data, ok := response["data"].(map[string]any); ok {
		if decision, ok := data["decision"].(map[string]any); ok {
			return normalizeDecisionMap(decision, body), nil
		}
	}

	for _, key := range []string{"verified", "allowed", "allow"} {
		if value, ok := response[key].(bool); ok {
			return VerificationResult{
				Allowed: value,
				Reason:  stringValue(response["reason"], response["message"]),
				Raw:     body,
			}, nil
		}
	}

	return VerificationResult{
		Allowed: false,
		Reason:  "APort response did not include a decision",
		Raw:     body,
	}, nil
}

func normalizeDecisionMap(decision map[string]any, raw []byte) VerificationResult {
	allowed, _ := decision["allow"].(bool)
	return VerificationResult{
		Allowed: allowed,
		Reason:  reasonFromDecision(decision),
		Raw:     raw,
	}
}

func reasonFromDecision(decision map[string]any) string {
	if reason, ok := decision["reason"].(string); ok {
		return reason
	}

	reasons, ok := decision["reasons"].([]any)
	if !ok {
		return ""
	}

	parts := make([]string, 0, len(reasons))
	for _, reason := range reasons {
		switch value := reason.(type) {
		case string:
			parts = append(parts, value)
		case map[string]any:
			parts = append(parts, stringValue(value["message"], value["code"]))
		}
	}

	return strings.Join(compact(parts), ", ")
}

func stringValue(values ...any) string {
	for _, value := range values {
		if text, ok := value.(string); ok {
			return text
		}
	}
	return ""
}

func compact(values []string) []string {
	out := make([]string, 0, len(values))
	for _, value := range values {
		if value != "" {
			out = append(out, value)
		}
	}
	return out
}
