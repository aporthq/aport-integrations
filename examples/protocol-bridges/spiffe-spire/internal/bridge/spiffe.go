package bridge

import (
	"fmt"
	"net/url"
	"strings"
)

type SPIFFEIdentity struct {
	ID          string            `json:"id"`
	TrustDomain string            `json:"trust_domain"`
	Path        string            `json:"path"`
	Segments    []string          `json:"segments"`
	Selectors   map[string]string `json:"selectors"`
}

func ParseSPIFFEID(raw string) (SPIFFEIdentity, error) {
	parsed, err := url.Parse(raw)
	if err != nil {
		return SPIFFEIdentity{}, err
	}

	if parsed.Scheme != "spiffe" {
		return SPIFFEIdentity{}, fmt.Errorf("SPIFFE ID must use spiffe scheme")
	}

	if parsed.Host == "" {
		return SPIFFEIdentity{}, fmt.Errorf("SPIFFE ID must include a trust domain")
	}

	path := strings.Trim(parsed.Path, "/")
	if path == "" {
		return SPIFFEIdentity{}, fmt.Errorf("SPIFFE ID must include a workload path")
	}

	segments := strings.Split(path, "/")
	selectors := mapSegments(segments)

	return SPIFFEIdentity{
		ID:          raw,
		TrustDomain: parsed.Host,
		Path:        path,
		Segments:    segments,
		Selectors:   selectors,
	}, nil
}

func mapSegments(segments []string) map[string]string {
	selectors := make(map[string]string)

	for index := 0; index+1 < len(segments); index += 2 {
		selectors[segments[index]] = segments[index+1]
	}

	return selectors
}
