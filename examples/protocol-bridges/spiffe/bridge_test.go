package spiffebridge

import (
	"context"
	"errors"
	"testing"

	"github.com/spiffe/go-spiffe/v2/spiffeid"
	"github.com/spiffe/go-spiffe/v2/svid/x509svid"
)

func TestBridgeVerifiesCurrentWorkload(t *testing.T) {
	spiffeID := mustSPIFFEID(t, "spiffe://example.org/ns/payments/sa/refund-bot")
	verifier := &fakeVerifier{
		result: VerificationResult{
			Verified: true,
			Message:  "allowed",
			Passport: map[string]any{
				"agent": "refund-bot",
			},
		},
	}

	bridge, err := NewBridge(
		fakeSource{svid: &x509svid.SVID{ID: spiffeID}},
		verifier,
		Config{
			PolicyID:           "enterprise.identity.federation.v1",
			AllowedTrustDomain: "example.org",
		},
	)
	if err != nil {
		t.Fatalf("new bridge: %v", err)
	}

	decision, err := bridge.VerifyCurrentWorkload(context.Background(), WorkloadVerificationRequest{
		Action:   "refund.approve",
		Resource: "order-1001",
		Context: map[string]any{
			"amount": float64(50),
		},
	})
	if err != nil {
		t.Fatalf("verify workload: %v", err)
	}

	if !decision.Authorized {
		t.Fatalf("expected authorized decision")
	}
	if decision.AgentID != spiffeID.String() {
		t.Fatalf("expected SPIFFE ID as agent ID, got %s", decision.AgentID)
	}
	if verifier.request.Context["spiffe_path"] != "/ns/payments/sa/refund-bot" {
		t.Fatalf("missing SPIFFE path in context: %#v", verifier.request.Context)
	}
	if verifier.request.Context["amount"] != float64(50) {
		t.Fatalf("custom context was not preserved: %#v", verifier.request.Context)
	}
}

func TestBridgeRejectsUnexpectedTrustDomain(t *testing.T) {
	bridge, err := NewBridge(
		fakeSource{svid: &x509svid.SVID{ID: mustSPIFFEID(t, "spiffe://other.example/ns/payments/sa/refund-bot")}},
		&fakeVerifier{},
		Config{
			AllowedTrustDomain: "example.org",
		},
	)
	if err != nil {
		t.Fatalf("new bridge: %v", err)
	}

	_, err = bridge.VerifyCurrentWorkload(context.Background(), WorkloadVerificationRequest{})
	if err == nil {
		t.Fatalf("expected trust domain error")
	}
}

func TestBridgePropagatesSourceErrors(t *testing.T) {
	bridge, err := NewBridge(
		fakeSource{err: errors.New("workload api unavailable")},
		&fakeVerifier{},
		Config{},
	)
	if err != nil {
		t.Fatalf("new bridge: %v", err)
	}

	_, err = bridge.VerifyCurrentWorkload(context.Background(), WorkloadVerificationRequest{})
	if err == nil {
		t.Fatalf("expected source error")
	}
}

type fakeSource struct {
	svid *x509svid.SVID
	err  error
}

func (f fakeSource) GetX509SVID() (*x509svid.SVID, error) {
	if f.err != nil {
		return nil, f.err
	}
	return f.svid, nil
}

type fakeVerifier struct {
	request VerificationRequest
	result  VerificationResult
	err     error
}

func (f *fakeVerifier) Verify(_ context.Context, req VerificationRequest) (VerificationResult, error) {
	f.request = req
	if f.err != nil {
		return VerificationResult{}, f.err
	}
	return f.result, nil
}

func mustSPIFFEID(t *testing.T, raw string) spiffeid.ID {
	t.Helper()

	id, err := spiffeid.FromString(raw)
	if err != nil {
		t.Fatalf("parse SPIFFE ID: %v", err)
	}
	return id
}
