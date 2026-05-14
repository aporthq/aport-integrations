package bridge

import "testing"

func TestParseSPIFFEID(t *testing.T) {
	identity, err := ParseSPIFFEID("spiffe://example.org/ns/payments/sa/refund-bot")
	if err != nil {
		t.Fatalf("ParseSPIFFEID returned error: %v", err)
	}

	if identity.TrustDomain != "example.org" {
		t.Fatalf("TrustDomain = %q, want example.org", identity.TrustDomain)
	}

	if identity.Selectors["ns"] != "payments" {
		t.Fatalf("namespace selector = %q, want payments", identity.Selectors["ns"])
	}

	if identity.Selectors["sa"] != "refund-bot" {
		t.Fatalf("service account selector = %q, want refund-bot", identity.Selectors["sa"])
	}
}

func TestParseSPIFFEIDRejectsInvalidInput(t *testing.T) {
	cases := []string{
		"https://example.org/ns/payments",
		"spiffe:///ns/payments",
		"spiffe://example.org",
	}

	for _, item := range cases {
		if _, err := ParseSPIFFEID(item); err == nil {
			t.Fatalf("ParseSPIFFEID(%q) expected error", item)
		}
	}
}
