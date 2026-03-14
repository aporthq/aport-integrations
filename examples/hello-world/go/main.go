package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

func main() {
	// Get API key from environment variable
	apiKey := os.Getenv("APORT_API_KEY")
	if apiKey == "" {
		fmt.Println("Error: APORT_API_KEY environment variable is not set")
		fmt.Println("Please set it with your APort API key:")
		fmt.Println("  export APORT_API_KEY=your_api_key_here")
		os.Exit(1)
	}

	// APort API endpoint
	apiURL := "https://api.aport.io/v1/verify"

	// Request body - using a demo agent ID for the hello world example
	// In production, you would use the actual agent ID from the passport
	requestBody := map[string]string{
		"agent_id":    "demo_agent_123",
		"policy_pack": "hello.world.v1",
	}

	// Convert request body to JSON
	jsonBody, err := json.Marshal(requestBody)
	if err != nil {
		fmt.Printf("Error marshaling request: %v\n", err)
		os.Exit(1)
	}

	// Create HTTP request
	req, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(jsonBody))
	if err != nil {
		fmt.Printf("Error creating request: %v\n", err)
		os.Exit(1)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-API-Key", apiKey)

	// Make the HTTP request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("Error making request: %v\n", err)
		os.Exit(1)
	}
	defer resp.Body.Close()

	// Check response status
	if resp.StatusCode != http.StatusOK {
		fmt.Printf("Error: API returned status %d\n", resp.StatusCode)
		os.Exit(1)
	}

	// Parse response JSON
	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		fmt.Printf("Error parsing response: %v\n", err)
		os.Exit(1)
	}

	// Print results
	fmt.Println("=== APort Verification Result ===")
	
	// Print allow status
	if allow, ok := result["allow"].(bool); ok {
		fmt.Printf("Allow: %v\n", allow)
	} else {
		fmt.Println("Allow: unknown")
	}

	// Print reasons
	if reasons, ok := result["reasons"].([]interface{}); ok {
		fmt.Println("Reasons:")
		if len(reasons) == 0 {
			fmt.Println("  (none)")
		}
		for i, reason := range reasons {
			fmt.Printf("  %d. %v\n", i+1, reason)
		}
	} else {
		fmt.Println("Reasons: (none)")
	}
}
