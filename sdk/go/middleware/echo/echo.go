package echoaport

import (
	"net/http"

	"github.com/labstack/echo/v4"

	aport "github.com/aporthq/aport-integrations/sdk/go"
)

type Config struct {
	Client         *aport.Client
	PolicyID       string
	AgentIDHeader  string
	ContextBuilder func(echo.Context) map[string]any
}

func Middleware(config Config) echo.MiddlewareFunc {
	agentIDHeader := config.AgentIDHeader
	if agentIDHeader == "" {
		agentIDHeader = "X-Agent-ID"
	}

	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(ctx echo.Context) error {
			contextBody := map[string]any{"method": ctx.Request().Method, "path": ctx.Path()}
			if config.ContextBuilder != nil {
				contextBody = config.ContextBuilder(ctx)
			}

			response, err := config.Client.RequirePolicy(ctx.Request().Context(), config.PolicyID, aport.VerifyRequest{
				AgentID: ctx.Request().Header.Get(agentIDHeader),
				Context: contextBody,
			})
			if err != nil {
				return ctx.JSON(http.StatusForbidden, map[string]any{
					"error":    "aport_policy_denied",
					"decision": response,
				})
			}

			ctx.Set("aport.verify_response", response)
			return next(ctx)
		}
	}
}
