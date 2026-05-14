package nethttp

import (
	"context"
	"encoding/json"
	"net/http"

	aport "github.com/aporthq/aport-integrations/sdk/go"
)

type AgentIDResolver func(*http.Request) string

type Config struct {
	Client          *aport.Client
	PolicyID        string
	AgentIDResolver AgentIDResolver
	ContextBuilder  func(*http.Request) map[string]any
	OnDenied        func(http.ResponseWriter, *http.Request, *aport.VerifyResponse)
}

type contextKey string

const verifyResponseKey contextKey = "aportVerifyResponse"

func Middleware(config Config) func(http.Handler) http.Handler {
	resolver := config.AgentIDResolver
	if resolver == nil {
		resolver = func(request *http.Request) string {
			return request.Header.Get("X-Agent-ID")
		}
	}

	onDenied := config.OnDenied
	if onDenied == nil {
		onDenied = defaultDeniedHandler
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
			contextBody := map[string]any{
				"method": request.Method,
				"path":   request.URL.Path,
			}
			if config.ContextBuilder != nil {
				contextBody = config.ContextBuilder(request)
			}

			response, err := config.Client.RequirePolicy(request.Context(), config.PolicyID, aport.VerifyRequest{
				AgentID: resolver(request),
				Context: contextBody,
			})
			if err != nil {
				onDenied(writer, request, response)
				return
			}

			ctx := context.WithValue(request.Context(), verifyResponseKey, response)
			next.ServeHTTP(writer, request.WithContext(ctx))
		})
	}
}

func VerifyResponse(request *http.Request) (*aport.VerifyResponse, bool) {
	response, ok := request.Context().Value(verifyResponseKey).(*aport.VerifyResponse)
	return response, ok
}

func defaultDeniedHandler(writer http.ResponseWriter, _ *http.Request, response *aport.VerifyResponse) {
	writer.Header().Set("Content-Type", "application/json")
	writer.WriteHeader(http.StatusForbidden)
	_ = json.NewEncoder(writer).Encode(map[string]any{
		"error":    "aport_policy_denied",
		"decision": response,
	})
}
