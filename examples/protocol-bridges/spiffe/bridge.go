package spiffebridge

import (
	"context"
	"fmt"

	"github.com/spiffe/go-spiffe/v2/spiffeid"
	"github.com/spiffe/go-spiffe/v2/svid/x509svid"
	"github.com/spiffe/go-spiffe/v2/workloadapi"
)

// X509SVIDSource is implemented by workloadapi.X509Source and by test fakes.
type X509SVIDSource interface {
	GetX509SVID() (*x509svid.SVID, error)
}

type closeableX509SVIDSource interface {
	X509SVIDSource
	Close() error
}

// Bridge federates the current SPIFFE workload identity into an APort policy check.
type Bridge struct {
	source          X509SVIDSource
	verifier        APortVerifier
	policyID        string
	trustDomainName string
}

// WorkloadVerificationRequest contains application context for a bridge decision.
type WorkloadVerificationRequest struct {
	PolicyID     string         `json:"policy_id,omitempty"`
	APortAgentID string         `json:"aport_agent_id,omitempty"`
	Action       string         `json:"action,omitempty"`
	Resource     string         `json:"resource,omitempty"`
	Context      map[string]any `json:"context,omitempty"`
}

// FederationDecision is returned after both SPIFFE identity and APort policy checks pass.
type FederationDecision struct {
	Authorized  bool               `json:"authorized"`
	SPIFFEID    string             `json:"spiffe_id"`
	TrustDomain string             `json:"trust_domain"`
	PolicyID    string             `json:"policy_id"`
	AgentID     string             `json:"agent_id"`
	Message     string             `json:"message,omitempty"`
	Passport    map[string]any     `json:"passport,omitempty"`
	Details     map[string]any     `json:"details,omitempty"`
	Context     map[string]any     `json:"context,omitempty"`
	Raw         VerificationResult `json:"raw"`
}

// NewBridge creates a bridge using supplied source and verifier dependencies.
func NewBridge(source X509SVIDSource, verifier APortVerifier, cfg Config) (*Bridge, error) {
	if source == nil {
		return nil, fmt.Errorf("SPIFFE X509 source is required")
	}
	if verifier == nil {
		return nil, fmt.Errorf("APort verifier is required")
	}
	if cfg.PolicyID == "" {
		cfg.PolicyID = defaultPolicyID
	}

	return &Bridge{
		source:          source,
		verifier:        verifier,
		policyID:        cfg.PolicyID,
		trustDomainName: cfg.AllowedTrustDomain,
	}, nil
}

// NewBridgeFromConfig connects to the SPIFFE Workload API and creates a bridge.
func NewBridgeFromConfig(ctx context.Context, cfg Config) (*Bridge, error) {
	client, err := NewHTTPAPortClient(cfg.APortBaseURL, cfg.APortAPIKey, cfg.Timeout)
	if err != nil {
		return nil, err
	}

	var options []workloadapi.X509SourceOption
	if cfg.WorkloadAPISocket != "" {
		options = append(options, workloadapi.WithClientOptions(workloadapi.WithAddr(cfg.WorkloadAPISocket)))
	}

	source, err := workloadapi.NewX509Source(ctx, options...)
	if err != nil {
		return nil, fmt.Errorf("connect to SPIFFE Workload API: %w", err)
	}

	bridge, err := NewBridge(source, client, cfg)
	if err != nil {
		source.Close()
		return nil, err
	}

	return bridge, nil
}

// Close releases the Workload API source if the bridge owns a closeable source.
func (b *Bridge) Close() error {
	source, ok := b.source.(closeableX509SVIDSource)
	if !ok {
		return nil
	}
	return source.Close()
}

// VerifyCurrentWorkload verifies the current SPIFFE workload against APort.
func (b *Bridge) VerifyCurrentWorkload(ctx context.Context, req WorkloadVerificationRequest) (FederationDecision, error) {
	svid, err := b.source.GetX509SVID()
	if err != nil {
		return FederationDecision{}, fmt.Errorf("read SPIFFE X509-SVID: %w", err)
	}
	if svid == nil || svid.ID.IsZero() {
		return FederationDecision{}, fmt.Errorf("SPIFFE X509-SVID is missing an ID")
	}

	if err := b.checkTrustDomain(svid.ID); err != nil {
		return FederationDecision{}, err
	}

	policyID := req.PolicyID
	if policyID == "" {
		policyID = b.policyID
	}

	agentID := req.APortAgentID
	if agentID == "" {
		agentID = svid.ID.String()
	}

	contextPayload := b.contextFor(svid.ID, req)
	result, err := b.verifier.Verify(ctx, VerificationRequest{
		PolicyID: policyID,
		AgentID:  agentID,
		Context:  contextPayload,
	})
	if err != nil {
		return FederationDecision{}, err
	}

	return FederationDecision{
		Authorized:  result.Verified,
		SPIFFEID:    svid.ID.String(),
		TrustDomain: svid.ID.TrustDomain().String(),
		PolicyID:    policyID,
		AgentID:     agentID,
		Message:     result.Message,
		Passport:    result.Passport,
		Details:     result.Details,
		Context:     contextPayload,
		Raw:         result,
	}, nil
}

func (b *Bridge) checkTrustDomain(id spiffeid.ID) error {
	if b.trustDomainName == "" {
		return nil
	}

	expected, err := spiffeid.TrustDomainFromString(b.trustDomainName)
	if err != nil {
		return fmt.Errorf("invalid allowed SPIFFE trust domain: %w", err)
	}
	if !id.MemberOf(expected) {
		return fmt.Errorf("SPIFFE ID %q is not a member of trust domain %q", id.String(), expected.String())
	}
	return nil
}

func (b *Bridge) contextFor(id spiffeid.ID, req WorkloadVerificationRequest) map[string]any {
	contextPayload := map[string]any{
		"spiffe_id":    id.String(),
		"trust_domain": id.TrustDomain().String(),
		"spiffe_path":  id.Path(),
	}

	if req.Action != "" {
		contextPayload["action"] = req.Action
	}
	if req.Resource != "" {
		contextPayload["resource"] = req.Resource
	}
	for key, value := range req.Context {
		contextPayload[key] = value
	}

	return contextPayload
}
