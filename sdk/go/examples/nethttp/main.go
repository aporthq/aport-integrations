package main

import (
	"log"
	"net/http"
	"os"

	aport "github.com/aporthq/aport-integrations/sdk/go"
	aporthttp "github.com/aporthq/aport-integrations/sdk/go/middleware/nethttp"
)

func main() {
	client := aport.NewClient(os.Getenv("APORT_API_KEY"))

	guard := aporthttp.Middleware(aporthttp.Config{
		Client:   client,
		PolicyID: getenv("APORT_POLICY_ID", "payments.refund.v1"),
		ContextBuilder: func(request *http.Request) map[string]any {
			return map[string]any{
				"method": request.Method,
				"path":   request.URL.Path,
				"amount": request.URL.Query().Get("amount"),
			}
		},
	})

	refundHandler := http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		writer.WriteHeader(http.StatusAccepted)
		_, _ = writer.Write([]byte("refund accepted\n"))
	})

	http.Handle("/refund", guard(refundHandler))
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func getenv(key string, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
