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

// AgentPassport represents the APort agent passport response
type AgentPassport struct {
	AgentID      string       `json:"agent_id"`
	Name         string       `json:"name"`
	Role         string       `json:"role"`
	Description  string       `json:"description"`
	Status       string       `json:"status"`
	Capabilities []Capability `json:"capabilities"`
	Limits       Limits       `json:"limits"`
}

// Capability represents an agent capability
type Capability struct {
	ID     string                 `json:"id"`
	Params map[string]interface{} `json:"params,omitempty"`
}

// Limits represents agent operational limits
type Limits struct {
	MaxActionsPerMin int  `json:"max_actions_per_min"`
	MaxExportRows    int  `json:"max_export_rows"`
	AllowPII         bool `json:"allow_pii"`
}

// PolicyVerifyRequest represents the request payload for policy verification
type PolicyVerifyRequest struct {
	Context PolicyVerifyContext `json:"context"`
}

// PolicyVerifyContext contains the policy verification context
type PolicyVerifyContext struct {
	AgentID  string `json:"agent_id"`
	PolicyID string `json:"policy_id"`
	// Flatten the context fields directly into this struct
	Amount         *float64                 `json:"amount,omitempty"`
	Currency       string                   `json:"currency,omitempty"`
	OrderID        string                   `json:"order_id,omitempty"`
	CustomerID     string                   `json:"customer_id,omitempty"`
	ReasonCode     string                   `json:"reason_code,omitempty"`
	IdempotencyKey string                   `json:"idempotency_key,omitempty"`
	MerchantID     string                   `json:"merchant_id,omitempty"`
	Region         string                   `json:"region,omitempty"`
	Items          []map[string]interface{} `json:"items,omitempty"`
	ExportType     string                   `json:"export_type,omitempty"`
	Format         string                   `json:"format,omitempty"`
	Filters        map[string]interface{}   `json:"filters,omitempty"`
	Action         string                   `json:"action,omitempty"`
	Repository     string                   `json:"repository,omitempty"`
	Branch         string                   `json:"branch,omitempty"`
}

// PolicyVerifyResponse represents the response from policy verification
type PolicyVerifyResponse struct {
	Data     *DecisionData `json:"data,omitempty"`
	Decision *Decision     `json:"decision,omitempty"`
}

// DecisionData wraps the decision object
type DecisionData struct {
	Decision *Decision `json:"decision,omitempty"`
}

// Decision represents the verification decision
type Decision struct {
	Allow      bool     `json:"allow"`
	DecisionID string   `json:"decision_id"`
	ExpiresIn  int      `json:"expires_in"`
	Reasons    []Reason `json:"reasons,omitempty"`
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
	fmt.Println()

	// Get configuration from environment or use defaults
	baseURL := getEnvOrDefault("APORT_BASE_URL", defaultBaseURL)
	agentID := getEnvOrDefault("APORT_AGENT_ID", sampleRefundBot)
	policy := getEnvOrDefault("APORT_POLICY", "payments.refund.v1")

	fmt.Printf("Base URL: %s\n", baseURL)
	fmt.Printf("Agent ID: %s\n", agentID)
	fmt.Printf("Policy: %s\n", policy)
	fmt.Println()

	// Example 1: Get Agent Passport (Hello World - Simple GET)
	fmt.Println("=== Example 1: Agent Passport (Hello World) ===")
	passport, err := getAgentPassport(baseURL, agentID)
	if err != nil {
		log.Printf("Failed to get agent passport: %v", err)
	} else {
		printAgentPassport(passport)
	}

	fmt.Println()

	// Example 2: Policy Verification (Advanced - POST with context)
	fmt.Println("=== Example 2: Policy Verification (Advanced) ===")
	policyResult, err := verifyPolicy(baseURL, policy, agentID)
	if err != nil {
		log.Printf("Policy verification failed: %v", err)
	} else {
		printPolicyVerificationResult(policyResult, agentID, policy)
	}
}

// getAgentPassport fetches an agent's public passport from APort (Hello World example)
func getAgentPassport(baseURL, agentID string) (*AgentPassport, error) {
	// Construct the URL - simple GET request, no auth required
	url := fmt.Sprintf("%s/api/verify/%s", baseURL, agentID)

	// Make the GET request
	resp, err := http.Get(url)
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
	var passport AgentPassport
	if err := json.Unmarshal(body, &passport); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &passport, nil
}

// verifyPolicy makes a POST request to the APort policy verification endpoint
func verifyPolicy(baseURL, policy, agentID string) (*PolicyVerifyResponse, error) {
	// Construct the URL
	url := fmt.Sprintf("%s/api/verify/policy/%s", baseURL, policy)

	// Create verification request with appropriate context based on policy
	context := getPolicyContext(policy)
	context.AgentID = agentID
	context.PolicyID = policy
	verifyReq := PolicyVerifyRequest{
		Context: context,
	}

	// Marshal the request to JSON
	jsonData, err := json.Marshal(verifyReq)
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
	var result PolicyVerifyResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &result, nil
}

// getPolicyContext returns appropriate context based on the policy type
func getPolicyContext(policy string) PolicyVerifyContext {
	amount := 50.0
	switch policy {
	case "payments.refund.v1":
		return PolicyVerifyContext{
			Amount:         &amount,
			Currency:       "USD",
			OrderID:        "order_12345",
			CustomerID:     "cust_67890",
			ReasonCode:     "customer_request",
			IdempotencyKey: "refund_12345",
			MerchantID:     "merchant_123",
			Region:         "US",
			Items: []map[string]interface{}{
				{
					"sku":   "item_001",
					"qty":   1,
					"price": 50,
				},
			},
		}
	case "data.export.v1":
		return PolicyVerifyContext{
			ExportType: "user_data",
			Format:     "json",
			Filters: map[string]interface{}{
				"date_range":  "last_30_days",
				"include_pii": false,
			},
		}
	case "repo.v1":
		return PolicyVerifyContext{
			Action:     "merge",
			Repository: "myorg/myrepo",
			Branch:     "feature-branch",
		}
	default:
		return PolicyVerifyContext{}
	}
}

// printAgentPassport prints agent details in a user-friendly format
func printAgentPassport(passport *AgentPassport) {
	fmt.Println("Agent Passport:")
	fmt.Println("===============")
	fmt.Printf("Agent ID:    %s\n", passport.AgentID)
	fmt.Printf("Name:        %s\n", passport.Name)
	fmt.Printf("Role:        %s\n", passport.Role)
	fmt.Printf("Status:      %s\n", passport.Status)
	fmt.Println()

	fmt.Println("Description:")
	fmt.Printf("  %s\n", passport.Description)
	fmt.Println()

	// Print capabilities
	if len(passport.Capabilities) > 0 {
		fmt.Println("Capabilities:")
		for _, cap := range passport.Capabilities {
			fmt.Printf("  - %s", cap.ID)
			if len(cap.Params) > 0 {
				fmt.Printf(" (")
				first := true
				for k, v := range cap.Params {
					if !first {
						fmt.Printf(", ")
					}
					fmt.Printf("%s: %v", k, v)
					first = false
				}
				fmt.Printf(")")
			}
			fmt.Println()
		}
		fmt.Println()
	}

	// Print limits
	fmt.Println("Limits:")
	fmt.Printf("  Max actions/min: %d\n", passport.Limits.MaxActionsPerMin)
	fmt.Printf("  Max export rows: %d\n", passport.Limits.MaxExportRows)
	fmt.Printf("  Allow PII:       %v\n", passport.Limits.AllowPII)
	fmt.Println()

	fmt.Println("Success! Agent passport retrieved.")
}

// printPolicyVerificationResult prints the policy verification result
func printPolicyVerificationResult(result *PolicyVerifyResponse, agentID, policy string) {
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

	fmt.Println("Policy Verification Result:")
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
		fmt.Println("Success! Policy verification passed.")
	} else {
		fmt.Println("Policy verification failed.")
	}
}

// getEnvOrDefault returns the value of an environment variable or a default value
func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
