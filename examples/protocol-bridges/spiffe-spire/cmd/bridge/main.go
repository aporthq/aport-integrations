package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"time"

	bridge "github.com/aporthq/aport-integrations/examples/protocol-bridges/spiffe-spire/internal/bridge"
)

func main() {
	var (
		spiffeID = flag.String("spiffe-id", "", "SPIFFE ID to federate, for example spiffe://example.org/ns/payments/sa/refund-bot")
		agentID  = flag.String("agent-id", "", "APort agent id")
		policy   = flag.String("policy", "enterprise.identity.federation.v1", "APort policy pack")
		baseURL  = flag.String("aport-base-url", getenv("APORT_BASE_URL", "https://aport.io"), "APort base URL")
		apiKey   = flag.String("aport-api-key", os.Getenv("APORT_API_KEY"), "APort API key")
	)
	flag.Parse()

	if *spiffeID == "" || *agentID == "" {
		log.Fatal("-spiffe-id and -agent-id are required")
	}

	federator := bridge.Federator{
		Verifier: bridge.NewHTTPVerifier(*baseURL, *apiKey),
		Policy:   *policy,
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	result, err := federator.Federate(ctx, bridge.FederationRequest{
		SPIFFEID: *spiffeID,
		AgentID:  *agentID,
		Context: map[string]any{
			"source": "cli",
		},
	})
	if err != nil {
		log.Fatal(err)
	}

	payload, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println(string(payload))
}

func getenv(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}
