package bridge

import (
	"context"
	"fmt"
)

type FederationRequest struct {
	SPIFFEID string         `json:"spiffe_id"`
	AgentID  string         `json:"agent_id"`
	Context  map[string]any `json:"context,omitempty"`
}

type FederationResult struct {
	Allowed bool               `json:"allowed"`
	Reason  string             `json:"reason,omitempty"`
	SPIFFE  SPIFFEIdentity     `json:"spiffe"`
	APort   VerificationResult `json:"aport"`
}

type Federator struct {
	Verifier Verifier
	Policy   string
}

func (federator Federator) Federate(ctx context.Context, request FederationRequest) (FederationResult, error) {
	if federator.Verifier == nil {
		return FederationResult{}, fmt.Errorf("verifier is required")
	}

	policy := federator.Policy
	if policy == "" {
		policy = "enterprise.identity.federation.v1"
	}

	spiffeIdentity, err := ParseSPIFFEID(request.SPIFFEID)
	if err != nil {
		return FederationResult{}, err
	}

	contextPayload := map[string]any{
		"spiffe": spiffeIdentity,
	}

	for key, value := range request.Context {
		contextPayload[key] = value
	}

	verification, err := federator.Verifier.Verify(ctx, VerificationRequest{
		Policy:  policy,
		AgentID: request.AgentID,
		Context: contextPayload,
	})
	if err != nil {
		return FederationResult{}, err
	}

	return FederationResult{
		Allowed: verification.Allowed,
		Reason:  verification.Reason,
		SPIFFE:  spiffeIdentity,
		APort:   verification,
	}, nil
}
