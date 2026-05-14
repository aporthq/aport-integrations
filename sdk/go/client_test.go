package aport

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestVerifyPolicyAllowsRequest(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		if request.URL.Path != "/api/verify/policy/payments.refund.v1" {
			t.Fatalf("unexpected path %s", request.URL.Path)
		}
		if request.Header.Get("Authorization") != "Bearer test-key" {
			t.Fatalf("missing authorization header")
		}

		var body VerifyRequest
		if err := json.NewDecoder(request.Body).Decode(&body); err != nil {
			t.Fatal(err)
		}
		if body.AgentID != "agent-123" || body.Context["amount"].(float64) != 25 {
			t.Fatalf("unexpected request body %#v", body)
		}

		_ = json.NewEncoder(writer).Encode(map[string]any{
			"allow":    true,
			"decision": "allow",
			"reasons":  []string{"within_limit"},
			"trace_id": "trace-1",
		})
	}))
	defer server.Close()

	client := NewClient("test-key", WithBaseURL(server.URL))
	response, err := client.RequirePolicy(context.Background(), "payments.refund.v1", VerifyRequest{
		AgentID: "agent-123",
		Context: map[string]any{"amount": 25},
	})
	if err != nil {
		t.Fatal(err)
	}
	if !response.Allow || response.Decision != "allow" || response.TraceID != "trace-1" {
		t.Fatalf("unexpected response %#v", response)
	}
}

func TestRequirePolicyReturnsDeniedError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		_ = json.NewEncoder(writer).Encode(map[string]any{
			"allow":   false,
			"reasons": []string{"limit_exceeded"},
		})
	}))
	defer server.Close()

	client := NewClient("", WithBaseURL(server.URL))
	response, err := client.RequirePolicy(context.Background(), "payments.refund.v1", VerifyRequest{AgentID: "agent-123"})
	if !errors.Is(err, ErrDenied) {
		t.Fatalf("expected ErrDenied, got %v", err)
	}
	if response == nil || response.Allow {
		t.Fatalf("expected denied response")
	}
}
