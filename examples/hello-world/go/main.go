package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

// Request represents the APort verify request
type Request struct {
	Action       string   `json:"action"`
	Actor        Actor    `json:"actor"`
	Context      Context  `json:"context"`
	ProjectID    string   `json:"projectId"`
}

// Actor represents the actor making the request
type Actor struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Owner string `json:"owner"`
}

// Context represents the context of the request
type Context struct {
	Data map[string]string `json:"data"`
}

// Response represents the APort verify response
type Response struct {
	Allow   bool     `json:"allow"`
	Reasons []string `json:"reasons"`
}

func main() {
	// Get API key from environment variable
	apiKey := os.Getenv("APORT_API_KEY")
	if apiKey == "" {
		fmt.Println("Error: APORT_API_KEY environment variable is not set")
		fmt.Println("Get your API key from: https://aport.io/dashboard")
		os.Exit(1)
	}

	// Create request payload
	reqBody := Request{
		Action: "verify",
		Actor: Actor{
			ID:    "user-123",
			Name:  "test-user",
			Owner: "test-owner",
		},
		Context: Context{
			Data: map[string]string{
				"ip": "192.168.1.1",
			},
		},
		ProjectID: "your-project-id",
	}

	// Convert to JSON
	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		fmt.Printf("Error creating request: %v\n", err)
		os.Exit(1)
	}

	// Create HTTP request
	req, err := http.NewRequest("POST", "https://api.aport.io/verify", bytes.NewBuffer(jsonBody))
	if err != nil {
		fmt.Printf("Error creating request: %v\n", err)
		os.Exit(1)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	// Send request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("Error sending request: %v\n", err)
		os.Exit(1)
	}
	defer resp.Body.Close()

	// Read response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Printf("Error reading response: %v\n", err)
		os.Exit(1)
	}

	// Parse response
	var result Response
	err = json.Unmarshal(body, &result)
	if err != nil {
		fmt.Printf("Error parsing response: %v\n", err)
		fmt.Printf("Raw response: %s\n", string(body))
		os.Exit(1)
	}

	// Print results
	fmt.Println("=== APort Verification Result ===")
	fmt.Printf("Allow: %v\n", result.Allow)
	
	if len(result.Reasons) > 0 {
		fmt.Println("Reasons:")
		for i, reason := range result.Reasons {
			fmt.Printf("  %d. %s\n", i+1, reason)
		}
	} else {
		fmt.Println("Reasons: None")
	}
}
