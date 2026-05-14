package fiberaport

import (
	"github.com/gofiber/fiber/v2"

	aport "github.com/aporthq/aport-integrations/sdk/go"
)

type Config struct {
	Client         *aport.Client
	PolicyID       string
	AgentIDHeader  string
	ContextBuilder func(*fiber.Ctx) map[string]any
}

func Middleware(config Config) fiber.Handler {
	agentIDHeader := config.AgentIDHeader
	if agentIDHeader == "" {
		agentIDHeader = "X-Agent-ID"
	}

	return func(ctx *fiber.Ctx) error {
		contextBody := map[string]any{"method": ctx.Method(), "path": ctx.Path()}
		if config.ContextBuilder != nil {
			contextBody = config.ContextBuilder(ctx)
		}

		response, err := config.Client.RequirePolicy(ctx.UserContext(), config.PolicyID, aport.VerifyRequest{
			AgentID: ctx.Get(agentIDHeader),
			Context: contextBody,
		})
		if err != nil {
			return ctx.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error":    "aport_policy_denied",
				"decision": response,
			})
		}

		ctx.Locals("aport.verify_response", response)
		return ctx.Next()
	}
}
