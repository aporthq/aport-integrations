package bridge

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestNormalizeAPortDecision(t *testing.T) {
	result, err := NormalizeAPortDecision([]byte(`{"decision":{"allow":false,"reasons":[{"message":"missing capability"}]}}`))
	if err != nil {
		t.Fatalf("NormalizeAPortDecision returned error: %v", err)
	}

	if result.Allowed {
		t.Fatal("Allowed = true, want false")
	}

	if result.Reason != "missing capability" {
		t.Fatalf("Reason = %q, want missing capability", result.Reason)
	}
}

func TestHTTPVerifier(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		if request.URL.Path != "/api/verify/policy/enterprise.identity.federation.v1" {
			t.Fatalf("path = %q", request.URL.Path)
		}

		if request.Header.Get("Authorization") != "Bearer test-key" {
			t.Fatalf("Authorization header = %q", request.Header.Get("Authorization"))
		}

		var payload map[string]map[string]any
		if err := json.NewDecoder(request.Body).Decode(&payload); err != nil {
			t.Fatalf("decode request: %v", err)
		}

		if payload["context"]["agent_id"] != "ap_agent" {
			t.Fatalf("agent_id = %v", payload["context"]["agent_id"])
		}

		writer.Header().Set("Content-Type", "application/json")
		_, _ = writer.Write([]byte(`{"decision":{"allow":true}}`))
	}))
	defer server.Close()

	verifier := NewHTTPVerifier(server.URL, "test-key")
	result, err := verifier.Verify(context.Background(), VerificationRequest{
		Policy:  "enterprise.identity.federation.v1",
		AgentID: "ap_agent",
		Context: map[string]any{"source": "test"},
	})
	if err != nil {
		t.Fatalf("Verify returned error: %v", err)
	}

	if !result.Allowed {
		t.Fatalf("Allowed = false, want true")
	}
}

func TestHTTPVerifierHandlesErrorStatus(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		http.Error(writer, "denied", http.StatusForbidden)
	}))
	defer server.Close()

	verifier := NewHTTPVerifier(server.URL, "")
	result, err := verifier.Verify(context.Background(), VerificationRequest{
		Policy:  "enterprise.identity.federation.v1",
		AgentID: "ap_agent",
		Context: map[string]any{},
	})
	if err != nil {
		t.Fatalf("Verify returned error: %v", err)
	}

	if result.Allowed {
		t.Fatal("Allowed = true, want false")
	}

	if !strings.Contains(result.Reason, "403") {
		t.Fatalf("Reason = %q, want status code", result.Reason)
	}
}
