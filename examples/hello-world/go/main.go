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

const defaultBaseURL = "https://aport.io"

type verifyRequest struct {
	Context verifyContext `json:"context"`
}

type verifyContext struct {
	AgentID  string         `json:"agent_id"`
	PolicyID string         `json:"policy_id"`
	Context  map[string]any `json:"context"`
}

type verifyResponse struct {
	Allow   bool     `json:"allow"`
	Reasons []string `json:"reasons"`
}

func main() {
	baseURL := envOrDefault("APORT_BASE_URL", defaultBaseURL)
	apiKey := os.Getenv("APORT_API_KEY")
	policyID := envOrDefault("APORT_POLICY_ID", "code.repository.merge.v1")
	agentID := envOrDefault("APORT_AGENT_ID", "hello-go-agent")

	result, err := verify(baseURL, apiKey, policyID, agentID)
	if err != nil {
		fmt.Fprintf(os.Stderr, "verification failed: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("allow: %t\n", result.Allow)
	if len(result.Reasons) == 0 {
		fmt.Println("reasons: none")
		return
	}

	fmt.Println("reasons:")
	for _, reason := range result.Reasons {
		fmt.Printf("- %s\n", reason)
	}
}

func verify(baseURL, apiKey, policyID, agentID string) (*verifyResponse, error) {
	body := verifyRequest{
		Context: verifyContext{
			AgentID:  agentID,
			PolicyID: policyID,
			Context: map[string]any{
				"example":  "hello-world-go",
				"language": "go",
			},
		},
	}

	payload, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("encode request: %w", err)
	}

	url := strings.TrimRight(baseURL, "/") + "/api/verify/policy/" + policyID
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(payload))
	if err != nil {
		return nil, fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	if apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+apiKey)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("send request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return nil, fmt.Errorf("APort returned %s: %s", resp.Status, strings.TrimSpace(string(respBody)))
	}

	var result verifyResponse
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}
	return &result, nil
}

func envOrDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
