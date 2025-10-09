package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
)

// VerifyRequest represents the request payload for APort verification
type VerifyRequest struct {
	Context VerifyContext `json:"context"`
}

// VerifyContext contains the verification context
type VerifyContext struct {
	AgentID   string                 `json:"agent_id"`
	PolicyID  string                 `json:"policy_id"`
	Context   map[string]interface{} `json:"context"`
}

// VerifyResponse represents the response from APort verification
type VerifyResponse struct {
	Data     *DecisionData `json:"data,omitempty"`
	Decision *Decision     `json:"decision,omitempty"`
}

// DecisionData wraps the decision object
type DecisionData struct {
	Decision *Decision `json:"decision,omitempty"`
}

// Decision represents the verification decision
type Decision struct {
	Allow       bool     `json:"allow"`
	DecisionID  string   `json:"decision_id"`
	ExpiresIn   int      `json:"expires_in"`
	Reasons     []Reason `json:"reasons,omitempty"`
}

// Reason represents a decision reason
type Reason struct {
	Message string `json:"message"`
}

const (
	// Default APort API base URL
	defaultBaseURL = "https://aport.io"
	
	// Sample agent IDs for testing (from the CLI tool)
	sampleRefundBot    = "ap_128094d3"
	sampleDataExporter = "agt_tmpl_mg8jr8l1_geckvz"
	samplePRMerger     = "agt_tmpl_mg8jtzzk_rl0diw"
)

func main() {
	fmt.Println("APort Go Hello World Example")
	fmt.Println("==============================")

	// Get configuration from environment or use defaults
	baseURL := getEnvOrDefault("APORT_BASE_URL", defaultBaseURL)
	agentID := getEnvOrDefault("APORT_AGENT_ID", sampleRefundBot)
	policy := getEnvOrDefault("APORT_POLICY", "payments.refund.v1")

	fmt.Printf("Base URL: %s\n", baseURL)
	fmt.Printf("Agent ID: %s\n", agentID)
	fmt.Printf("Policy: %s\n", policy)
	fmt.Println()

	// Create verification request
	verifyReq := VerifyRequest{
		Context: VerifyContext{
			AgentID:  agentID,
			PolicyID: policy,
			Context: map[string]interface{}{
				"amount":   50,
				"currency": "USD",
				"demo":     true,
			},
		},
	}

	// Make the verification request
	result, err := verifyAgent(baseURL, policy, verifyReq)
	if err != nil {
		log.Fatalf("Verification failed: %v", err)
	}

	// Print results
	printVerificationResult(result, agentID, policy)
}

// verifyAgent makes a POST request to the APort /verify endpoint
func verifyAgent(baseURL, policy string, request VerifyRequest) (*VerifyResponse, error) {
	// Construct the URL
	url := fmt.Sprintf("%s/api/verify/policy/%s", baseURL, policy)

	// Marshal the request to JSON
	jsonData, err := json.Marshal(request)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Create HTTP request
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "APort-Go-HelloWorld/1.0")

	// Make the request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// Check for HTTP errors
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API returned status %d: %s", resp.StatusCode, string(body))
	}

	// Parse JSON response
	var result VerifyResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &result, nil
}

// printVerificationResult prints the verification result in a user-friendly format
func printVerificationResult(result *VerifyResponse, agentID, policy string) {
	// Extract decision from nested structure
	var decision *Decision
	if result.Data != nil && result.Data.Decision != nil {
		decision = result.Data.Decision
	} else if result.Decision != nil {
		decision = result.Decision
	}

	if decision == nil {
		fmt.Println("No decision found in response")
		return
	}

	fmt.Println("Verification Result:")
	fmt.Printf("   Agent ID: %s\n", agentID)
	fmt.Printf("   Policy: %s\n", policy)
	fmt.Printf("   Decision ID: %s\n", decision.DecisionID)
	
	if decision.Allow {
		fmt.Println("   Status: ALLOWED")
	} else {
		fmt.Println("   Status: DENIED")
	}

	fmt.Printf("   Expires In: %d seconds\n", decision.ExpiresIn)

	// Print reasons if available
	if len(decision.Reasons) > 0 {
		fmt.Println("   Reasons:")
		for _, reason := range decision.Reasons {
			fmt.Printf("     - %s\n", reason.Message)
		}
	}

	fmt.Println()
	if decision.Allow {
		fmt.Println("Success! Agent verification passed.")
	} else {
		fmt.Println("Agent verification failed.")
	}
}

// getEnvOrDefault returns the value of an environment variable or a default value
func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
