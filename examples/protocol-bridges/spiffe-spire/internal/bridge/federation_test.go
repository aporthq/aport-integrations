package bridge

import (
	"context"
	"testing"
)

type fakeVerifier struct {
	request VerificationRequest
	result  VerificationResult
}

func (verifier *fakeVerifier) Verify(ctx context.Context, request VerificationRequest) (VerificationResult, error) {
	verifier.request = request
	return verifier.result, nil
}

func TestFederator(t *testing.T) {
	verifier := &fakeVerifier{
		result: VerificationResult{
			Allowed: true,
		},
	}
	federator := Federator{
		Verifier: verifier,
		Policy:   "enterprise.identity.federation.v1",
	}

	result, err := federator.Federate(context.Background(), FederationRequest{
		SPIFFEID: "spiffe://example.org/ns/payments/sa/refund-bot",
		AgentID:  "ap_agent",
		Context: map[string]any{
			"workload": "refund-service",
		},
	})
	if err != nil {
		t.Fatalf("Federate returned error: %v", err)
	}

	if !result.Allowed {
		t.Fatal("Allowed = false, want true")
	}

	if verifier.request.Policy != "enterprise.identity.federation.v1" {
		t.Fatalf("Policy = %q", verifier.request.Policy)
	}

	if verifier.request.Context["workload"] != "refund-service" {
		t.Fatalf("workload context = %v", verifier.request.Context["workload"])
	}

	spiffe, ok := verifier.request.Context["spiffe"].(SPIFFEIdentity)
	if !ok {
		t.Fatalf("spiffe context type = %T", verifier.request.Context["spiffe"])
	}

	if spiffe.TrustDomain != "example.org" {
		t.Fatalf("TrustDomain = %q", spiffe.TrustDomain)
	}
}

func TestFederatorRequiresVerifier(t *testing.T) {
	_, err := Federator{}.Federate(context.Background(), FederationRequest{
		SPIFFEID: "spiffe://example.org/ns/payments/sa/refund-bot",
		AgentID:  "ap_agent",
	})
	if err == nil {
		t.Fatal("expected error")
	}
}
