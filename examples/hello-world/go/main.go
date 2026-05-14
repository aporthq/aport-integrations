package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

type verifyRequest struct {
	Context verifyContext `json:"context"`
}

type verifyContext struct {
	AgentID  string         `json:"agent_id"`
	PolicyID string         `json:"policy_id"`
	Context  map[string]any `json:"context"`
}

type verifyResponse struct {
	Data     *verifyData     `json:"data,omitempty"`
	Decision *verifyDecision `json:"decision,omitempty"`
	Raw      json.RawMessage `json:"-"`
}

type verifyData struct {
	Decision *verifyDecision `json:"decision,omitempty"`
}

type verifyDecision struct {
	Allow   bool           `json:"allow"`
	Reasons []verifyReason `json:"reasons,omitempty"`
}

type verifyReason struct {
	Message string `json:"message,omitempty"`
	Code    string `json:"code,omitempty"`
}

func main() {
	baseURL := getenv("APORT_BASE_URL", "https://aport.io")
	agentID := getenv("APORT_AGENT_ID", "ap_a2d10232c6534523812423eec8a1425c")
	policyID := getenv("APORT_POLICY_ID", "finance.payment.refund.v1")
	apiKey := os.Getenv("APORT_API_KEY")

	result, err := verify(baseURL, apiKey, agentID, policyID)
	if err != nil {
		fmt.Fprintf(os.Stderr, "APort verification failed: %v\n", err)
		os.Exit(1)
	}

	decision := result.Decision
	if decision == nil && result.Data != nil {
		decision = result.Data.Decision
	}
	if decision == nil {
		fmt.Println("allow: unknown")
		fmt.Printf("raw_response: %s\n", string(result.Raw))
		return
	}

	fmt.Printf("allow: %t\n", decision.Allow)
	if len(decision.Reasons) == 0 {
		fmt.Println("reasons: none")
		return
	}

	fmt.Println("reasons:")
	for _, reason := range decision.Reasons {
		message := reason.Message
		if message == "" {
			message = reason.Code
		}
		if message == "" {
			message = "unspecified"
		}
		fmt.Printf("- %s\n", message)
	}
}

func verify(baseURL, apiKey, agentID, policyID string) (*verifyResponse, error) {
	body := verifyRequest{
		Context: verifyContext{
			AgentID:  agentID,
			PolicyID: policyID,
			Context: map[string]any{
				"example": "hello-world-go",
			},
		},
	}

	payload, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}

	endpoint := strings.TrimRight(baseURL, "/") + "/api/verify/policy/" + policyID
	req, err := http.NewRequest(http.MethodPost, endpoint, bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	if apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+apiKey)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, strings.TrimSpace(string(responseBody)))
	}

	var result verifyResponse
	result.Raw = responseBody
	if err := json.Unmarshal(responseBody, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

func getenv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
