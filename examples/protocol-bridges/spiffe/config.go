package spiffebridge

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

const (
	defaultAPortBaseURL = "https://aport.io"
	defaultPolicyID     = "enterprise.identity.federation.v1"
	defaultTimeout      = 10 * time.Second
)

// Config contains the runtime settings for the APort SPIFFE/SPIRE bridge.
type Config struct {
	APortBaseURL       string
	APortAPIKey        string
	PolicyID           string
	AllowedTrustDomain string
	WorkloadAPISocket  string
	Timeout            time.Duration
}

// LoadConfigFromEnv reads bridge settings from environment variables.
func LoadConfigFromEnv() (Config, error) {
	cfg := Config{
		APortBaseURL:       envOrDefault("APORT_BASE_URL", defaultAPortBaseURL),
		APortAPIKey:        os.Getenv("APORT_API_KEY"),
		PolicyID:           envOrDefault("APORT_POLICY_ID", defaultPolicyID),
		AllowedTrustDomain: os.Getenv("SPIFFE_TRUST_DOMAIN"),
		WorkloadAPISocket:  os.Getenv("SPIFFE_ENDPOINT_SOCKET"),
		Timeout:            defaultTimeout,
	}

	if raw := os.Getenv("APORT_TIMEOUT_SECONDS"); raw != "" {
		seconds, err := strconv.Atoi(raw)
		if err != nil || seconds <= 0 {
			return Config{}, fmt.Errorf("APORT_TIMEOUT_SECONDS must be a positive integer")
		}
		cfg.Timeout = time.Duration(seconds) * time.Second
	}

	return cfg, nil
}

func envOrDefault(name, fallback string) string {
	if value := os.Getenv(name); value != "" {
		return value
	}
	return fallback
}
