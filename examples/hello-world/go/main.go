package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

// APortVerifyRequest represents the request payload for APort verification.
type APortVerifyRequest struct {
	PassportID string `json:"passport_id"`
	AgentID    string `json:"agent_id"`
	Action     string `json:"action"`
	Resource   string `json:"resource"`
}

// APortVerifyResponse represents the response from APort's verify endpoint.
type APortVerifyResponse struct {
	Allow   bool     `json:"allow"`
	Reasons []string `json:"reasons,omitempty"`
}

func main() {
	// Get APort API key from environment variable
	apiKey := os.Getenv("APORT_API_KEY")
	if apiKey == "" {
		fmt.Println("Error: APORT_API_KEY environment variable is not set")
		fmt.Println("Set it with: export APORT_API_KEY=your_api_key_here")
		os.Exit(1)
	}

	// APort API endpoint (set via environment or use default)
	apiURL := os.Getenv("APORT_API_URL")
	if apiURL == "" {
		apiURL = "https://api.aport.io/v1/verify"
	}

	// Build the verification request
	reqBody := APortVerifyRequest{
		PassportID: "passport_abc123",
		AgentID:    "agent_demo_001",
		Action:     "code.deploy",
		Resource:   "github.com/my-org/my-repo",
	}

	// Serialize request to JSON
	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		fmt.Printf("Error marshaling request: %v\n", err)
		os.Exit(1)
	}

	// Create HTTP request
	req, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(jsonData))
	if err != nil {
		fmt.Printf("Error creating request: %v\n", err)
		os.Exit(1)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	// Execute the request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("Error making request: %v\n", err)
		os.Exit(1)
	}
	defer resp.Body.Close()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Printf("Error reading response: %v\n", err)
		os.Exit(1)
	}

	// Parse response
	var verifyResp APortVerifyResponse
	if err := json.Unmarshal(body, &verifyResp); err != nil {
		fmt.Printf("Error parsing response: %v\n", err)
		fmt.Printf("Raw response: %s\n", string(body))
		os.Exit(1)
	}

	// Print results
	fmt.Println("=== APort Verification Result ===")
	fmt.Printf("Allowed: %v\n", verifyResp.Allow)
	if !verifyResp.Allow && len(verifyResp.Reasons) > 0 {
		fmt.Println("Reasons denied:")
		for _, reason := range verifyResp.Reasons {
			fmt.Printf("  - %s\n", reason)
		}
	}
}
