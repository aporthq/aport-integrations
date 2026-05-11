package spiffebridge

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHTTPAPortClientVerifyPostsPolicyRequest(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/verify/policy/enterprise.identity.federation.v1" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		if r.Header.Get("Authorization") != "Bearer test-key" {
			t.Fatalf("missing authorization header")
		}

		var req VerificationRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			t.Fatalf("decode request: %v", err)
		}
		if req.AgentID != "spiffe://example.org/ns/payments/sa/refund-bot" {
			t.Fatalf("unexpected agent ID: %s", req.AgentID)
		}
		if req.Context["trust_domain"] != "example.org" {
			t.Fatalf("expected SPIFFE context to be forwarded")
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"verified":true,"passport":{"assurance":"domain"},"details":{"limit":100}}`))
	}))
	defer server.Close()

	client, err := NewHTTPAPortClient(server.URL, "test-key", 0)
	if err != nil {
		t.Fatalf("new client: %v", err)
	}

	result, err := client.Verify(context.Background(), VerificationRequest{
		PolicyID: "enterprise.identity.federation.v1",
		AgentID:  "spiffe://example.org/ns/payments/sa/refund-bot",
		Context: map[string]any{
			"trust_domain": "example.org",
		},
	})
	if err != nil {
		t.Fatalf("verify: %v", err)
	}
	if !result.Verified {
		t.Fatalf("expected verified result")
	}
	if result.Passport["assurance"] != "domain" {
		t.Fatalf("unexpected passport payload: %#v", result.Passport)
	}
}

func TestHTTPAPortClientVerifyReturnsAPIErrorMessage(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusForbidden)
		_, _ = w.Write([]byte(`{"message":"policy denied"}`))
	}))
	defer server.Close()

	client, err := NewHTTPAPortClient(server.URL, "", 0)
	if err != nil {
		t.Fatalf("new client: %v", err)
	}

	_, err = client.Verify(context.Background(), VerificationRequest{
		PolicyID: "enterprise.identity.federation.v1",
		AgentID:  "spiffe://example.org/ns/payments/sa/refund-bot",
	})
	if err == nil {
		t.Fatalf("expected error")
	}
	if got := err.Error(); got != "APort verification failed with HTTP 403: policy denied" {
		t.Fatalf("unexpected error: %s", got)
	}
}
