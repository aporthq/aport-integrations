package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"time"

	spiffebridge "github.com/aporthq/aport-integrations/examples/protocol-bridges/spiffe"
)

func main() {
	cfg, err := spiffebridge.LoadConfigFromEnv()
	if err != nil {
		fail(err)
	}

	var contextJSON string
	req := spiffebridge.WorkloadVerificationRequest{}

	flag.StringVar(&cfg.APortBaseURL, "aport-base-url", cfg.APortBaseURL, "APort API base URL")
	flag.StringVar(&cfg.APortAPIKey, "aport-api-key", cfg.APortAPIKey, "APort API key")
	flag.StringVar(&cfg.PolicyID, "policy", cfg.PolicyID, "APort policy ID")
	flag.StringVar(&cfg.AllowedTrustDomain, "trust-domain", cfg.AllowedTrustDomain, "Required SPIFFE trust domain")
	flag.StringVar(&cfg.WorkloadAPISocket, "spiffe-socket", cfg.WorkloadAPISocket, "SPIFFE Workload API socket address")
	flag.StringVar(&req.APortAgentID, "agent-id", "", "APort agent ID override; defaults to the SPIFFE ID")
	flag.StringVar(&req.Action, "action", "", "Action name to include in APort context")
	flag.StringVar(&req.Resource, "resource", "", "Resource identifier to include in APort context")
	flag.StringVar(&contextJSON, "context", "{}", "Additional JSON object to include in APort context")
	flag.DurationVar(&cfg.Timeout, "timeout", cfg.Timeout, "APort and Workload API timeout")
	flag.Parse()

	if err := json.Unmarshal([]byte(contextJSON), &req.Context); err != nil {
		fail(fmt.Errorf("context must be a JSON object: %w", err))
	}
	if req.Context == nil {
		req.Context = map[string]any{}
	}

	ctx, cancel := context.WithTimeout(context.Background(), cfg.Timeout)
	defer cancel()

	bridge, err := spiffebridge.NewBridgeFromConfig(ctx, cfg)
	if err != nil {
		fail(err)
	}
	defer bridge.Close()

	decision, err := bridge.VerifyCurrentWorkload(ctx, req)
	if err != nil {
		fail(err)
	}

	encoder := json.NewEncoder(os.Stdout)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(decision); err != nil {
		fail(err)
	}

	if !decision.Authorized {
		os.Exit(2)
	}
}

func fail(err error) {
	fmt.Fprintf(os.Stderr, "aport-spiffe-bridge: %v\n", err)
	time.Sleep(10 * time.Millisecond)
	os.Exit(1)
}
