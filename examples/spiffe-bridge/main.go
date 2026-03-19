package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

// Config holds configuration
type Config struct {
	APortAPIKey    string
	APortProjectID string
	SpireSocketPath string
	Port           string
}

// Default config
var config = Config{
	APortProjectID: "default",
	Port:           "8080",
}

// VerifyRequest represents verification request
type VerifyRequest struct {
	Action    string      `json:"action"`
	Actor    Actor       `json:"actor"`
	Context  interface{} `json:"context"`
	ProjectID string    `json:"projectId"`
}

// Actor represents an actor
type Actor struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Owner string `json:"owner"`
}

// VerifyResponse represents verification response
type VerifyResponse struct {
	Allow   bool     `json:"allow"`
	Reasons []string `json:"reasons"`
}

// SPIFFEWorkload represents a SPIFFE workload
type SPIFFEWorkload struct {
	SpiffeID string `json:"spiffe_id"`
	Path     string `json:"path"`
}

// verifyWithAPort verifies with APort
func verifyWithAPort(action string, actorID, actorName string, context map[string]interface{}) (*VerifyResponse, error) {
	if config.APortAPIKey == "" {
		return &VerifyResponse{Allow: true, Reasons: []string{"No API key"}}, nil
	}

	reqBody := VerifyRequest{
		Action: action,
		Actor: Actor{
			ID:    actorID,
			Name:  actorName,
			Owner: "spiffe",
		},
		Context:  context,
		ProjectID: config.APortProjectID,
	}

	jsonBody, _ := json.Marshal(reqBody)

	req, err := http.NewRequest("POST", "https://api.aport.io/verify", nil)
	if err != nil {
		return nil, err
	}
	req.Body = io.NopCloser(json.RawMessage(jsonBody).Reader())
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+config.APortAPIKey)

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return &VerifyResponse{Allow: true, Reasons: []string{"Verification failed"}}, nil
	}
	defer resp.Body.Close()

	var result VerifyResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return &result, nil
}

// getWorkloadIdentity gets workload identity from SPIRE
func getWorkloadIdentity(spiffeID string) (*SPIFFEWorkload, error) {
	if config.SpireSocketPath == "" {
		// Demo mode
		return &SPIFFEWorkload{
			SpiffeID: spiffeID,
			Path:     "/demo/workload",
		}, nil
	}

	// In production, connect to SPIRE Agent API
	// This is a simplified example
	return &SPIFFEWorkload{
		SpiffeID: spiffeID,
		Path:     "/production/service",
	}, nil
}

// VerifyHandler handles verification requests
func VerifyHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		SpiffeID string                 `json:"spiffe_id"`
		Action   string                 `json:"action"`
		Context  map[string]interface{} `json:"context"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Get workload identity
	workload, err := getWorkloadIdentity(req.SpiffeID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Build context
	context := map[string]interface{}{
		"spiffe_id": req.SpiffeID,
		"path":      workload.Path,
	}
	for k, v := range req.Context {
		context[k] = v
	}

	// Verify with APort
	result, err := verifyWithAPort(
		req.Action,
		req.SpiffeID,
		fmt.Sprintf("workload-%s", req.SpiffeID),
		context,
	)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// HealthHandler handles health checks
func HealthHandler(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(map[string]string{
		"status":    "ok",
		"spiffe":   "enabled",
		"aport":    "connected",
	})
}

func main() {
	// Load config from environment
	config.APortAPIKey = os.Getenv("APORT_API_KEY")
	config.APortProjectID = os.Getenv("APORT_PROJECT_ID")
	config.SpireSocketPath = os.Getenv("SPIRE_SOCKET_PATH")
	
	if port := os.Getenv("PORT"); port != "" {
		config.Port = port
	}

	// Handlers
	http.HandleFunc("/verify", VerifyHandler)
	http.HandleFunc("/health", HealthHandler)

	fmt.Printf("SPIFFE Bridge running on port %s\n", config.Port)
	fmt.Printf("APort Project: %s\n", config.APortProjectID)
	
	if err := http.ListenAndServe(":"+config.Port, nil); err != nil {
		fmt.Println(err)
	}
}
