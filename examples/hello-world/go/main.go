package main

import (
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

const (
	// Default APort API base URL
	defaultBaseURL = "https://aport.io"

	// Sample agent IDs for testing
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

	fmt.Printf("Fetching agent passport for: %s\n", agentID)
	fmt.Printf("From: %s\n", baseURL)
	fmt.Println()

	// Fetch the agent passport
	passport, err := getAgentPassport(baseURL, agentID)
	if err != nil {
		log.Fatalf("Failed to fetch agent passport: %v", err)
	}

	// Print the agent details
	printAgentPassport(passport)
}

// getAgentPassport fetches an agent's public passport from APort
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

// getEnvOrDefault returns the value of an environment variable or a default value
func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
