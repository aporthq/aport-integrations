package ginaport

import (
	"net/http"

	"github.com/gin-gonic/gin"

	aport "github.com/aporthq/aport-integrations/sdk/go"
)

type Config struct {
	Client         *aport.Client
	PolicyID       string
	AgentIDHeader  string
	ContextBuilder func(*gin.Context) map[string]any
}

func Middleware(config Config) gin.HandlerFunc {
	agentIDHeader := config.AgentIDHeader
	if agentIDHeader == "" {
		agentIDHeader = "X-Agent-ID"
	}

	return func(ctx *gin.Context) {
		contextBody := map[string]any{"method": ctx.Request.Method, "path": ctx.FullPath()}
		if config.ContextBuilder != nil {
			contextBody = config.ContextBuilder(ctx)
		}

		response, err := config.Client.RequirePolicy(ctx.Request.Context(), config.PolicyID, aport.VerifyRequest{
			AgentID: ctx.GetHeader(agentIDHeader),
			Context: contextBody,
		})
		if err != nil {
			ctx.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error":    "aport_policy_denied",
				"decision": response,
			})
			return
		}

		ctx.Set("aport.verify_response", response)
		ctx.Next()
	}
}
