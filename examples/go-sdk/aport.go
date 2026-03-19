package aport

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// Config holds APort configuration
type Config struct {
	APIKey    string
	ProjectID string
	Timeout   time.Duration
}

// Default timeout
const defaultTimeout = 5 * time.Second

// Client represents an APort client
type Client struct {
	config    Config
	httpClient *http.Client
}

// NewClient creates a new APort client
func NewClient(apiKey string, projectID string) *Client {
	return &Client{
		config: Config{
			APIKey:    apiKey,
			ProjectID: projectID,
			Timeout:   defaultTimeout,
		},
		httpClient: &http.Client{
			Timeout: defaultTimeout,
		},
	}
}

// Actor represents an actor in a verification request
type Actor struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Owner string `json:"owner"`
}

// Context represents the context of a verification request
type Context struct {
	Data map[string]string `json:"data"`
}

// VerifyRequest represents a verification request
type VerifyRequest struct {
	Action    string  `json:"action"`
	Actor     Actor   `json:"actor"`
	Context   Context `json:"context"`
	ProjectID string  `json:"projectId"`
}

// VerifyResponse represents a verification response
type VerifyResponse struct {
	Allow   bool     `json:"allow"`
	Reasons []string `json:"reasons"`
}

// Verify verifies an action with APort
func (c *Client) Verify(action string, actorID, actorName string, context map[string]string) (*VerifyResponse, error) {
	if c.config.APIKey == "" {
		return &VerifyResponse{Allow: true, Reasons: []string{"No API key"}}, nil
	}

	projectID := c.config.ProjectID
	if projectID == "" {
		projectID = "default"
	}

	reqBody := VerifyRequest{
		Action: action,
		Actor: Actor{
			ID:    actorID,
			Name:  actorName,
			Owner: "go",
		},
		Context: Context{
			Data: context,
		},
		ProjectID: projectID,
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequest("POST", "https://api.aport.io/verify", bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.config.APIKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return &VerifyResponse{Allow: true, Reasons: []string{"Verification failed"}}, nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return &VerifyResponse{Allow: true, Reasons: []string{f"API error: {resp.StatusCode}"}}, nil
	}

	var result VerifyResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &result, nil
}

// Middleware for Gin
func GinMiddleware(apiKey, projectID string) gin.HandlerFunc {
	client := NewClient(apiKey, projectID)
	
	return func(c *gin.Context) {
		actorID := c.GetHeader("X-User-ID")
		actorName := c.GetHeader("X-User-Name")
		
		if actorID == "" {
			actorID = "anonymous"
		}
		if actorName == "" {
			actorName = "anonymous"
		}

		result, err := client.Verify(
			fmt.Sprintf("gin_%s", c.Request.Method),
			actorID,
			actorName,
			map[string]string{
				"path":   c.Request.URL.Path,
				"method": c.Request.Method,
			},
		)

		if err != nil || !result.Allow {
			c.JSON(403, gin.H{
				"error":   "Access Denied",
				"reasons": result.Reasons,
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// Middleware for Echo
func EchoMiddleware(apiKey, projectID string) echo.MiddlewareFunc {
	client := NewClient(apiKey, projectID)
	
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			actorID := c.Request.Header.Get("X-User-ID")
			actorName := c.Request.Header.Get("X-User-Name")
			
			if actorID == "" {
				actorID = "anonymous"
			}
			if actorName == "" {
				actorName = "anonymous"
			}

			result, err := client.Verify(
				fmt.Sprintf("echo_%s", c.Request.Method),
				actorID,
				actorName,
				map[string]string{
					"path":   c.Request.URL.Path,
					"method": c.Request.Method,
				},
			)

			if err != nil || !result.Allow {
				return c.JSON(403, map[string]interface{}{
					"error":   "Access Denied",
					"reasons": result.Reasons,
				})
			}

			return next(c)
		}
	}
}

// Middleware for Fiber
func FiberMiddleware(apiKey, projectID string) fiber.Handler {
	client := NewClient(apiKey, projectID)
	
	return func(c *fiber.Ctx) error {
		actorID := c.Get("X-User-ID")
		actorName := c.Get("X-User-Name")
		
		if actorID == "" {
			actorID = "anonymous"
		}
		if actorName == "" {
			actorName = "anonymous"
		}

		result, err := client.Verify(
			fmt.Sprintf("fiber_%s", c.Method()),
			actorID,
			actorName,
			map[string]string{
				"path":   c.Path(),
				"method": c.Method(),
			},
		)

		if err != nil || !result.Allow {
			return c.Status(403).JSON(fiber.Map{
				"error":   "Access Denied",
				"reasons": result.Reasons,
			})
		}

		return c.Next()
	}
}
