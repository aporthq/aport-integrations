package aport

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const defaultBaseURL = "https://api.aport.io"

var ErrDenied = errors.New("aport: policy denied")

type Client struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client
}

type ClientOption func(*Client)

func NewClient(apiKey string, options ...ClientOption) *Client {
	client := &Client{
		apiKey:     apiKey,
		baseURL:    defaultBaseURL,
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}

	for _, option := range options {
		option(client)
	}

	return client
}

func WithBaseURL(baseURL string) ClientOption {
	return func(client *Client) {
		if strings.TrimSpace(baseURL) != "" {
			client.baseURL = strings.TrimRight(baseURL, "/")
		}
	}
}

func WithHTTPClient(httpClient *http.Client) ClientOption {
	return func(client *Client) {
		if httpClient != nil {
			client.httpClient = httpClient
		}
	}
}

type VerifyRequest struct {
	AgentID string         `json:"agent_id"`
	Context map[string]any `json:"context,omitempty"`
}

type VerifyResponse struct {
	Allow    bool           `json:"allow"`
	Reasons  []string       `json:"reasons,omitempty"`
	Decision string         `json:"decision,omitempty"`
	TraceID  string         `json:"trace_id,omitempty"`
	Raw      map[string]any `json:"-"`
}

func (client *Client) VerifyPolicy(ctx context.Context, policyID string, request VerifyRequest) (*VerifyResponse, error) {
	if client == nil {
		return nil, errors.New("aport: nil client")
	}
	if strings.TrimSpace(policyID) == "" {
		return nil, errors.New("aport: policy id is required")
	}
	if strings.TrimSpace(request.AgentID) == "" {
		return nil, errors.New("aport: agent id is required")
	}

	endpoint := fmt.Sprintf("%s/api/verify/policy/%s", client.baseURL, url.PathEscape(policyID))
	body, err := json.Marshal(request)
	if err != nil {
		return nil, fmt.Errorf("aport: encode verify request: %w", err)
	}

	httpRequest, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("aport: create verify request: %w", err)
	}

	httpRequest.Header.Set("Content-Type", "application/json")
	httpRequest.Header.Set("Accept", "application/json")
	if client.apiKey != "" {
		httpRequest.Header.Set("Authorization", "Bearer "+client.apiKey)
	}

	httpResponse, err := client.httpClient.Do(httpRequest)
	if err != nil {
		return nil, fmt.Errorf("aport: verify request failed: %w", err)
	}
	defer httpResponse.Body.Close()

	responseBody, err := io.ReadAll(io.LimitReader(httpResponse.Body, 1<<20))
	if err != nil {
		return nil, fmt.Errorf("aport: read verify response: %w", err)
	}

	if httpResponse.StatusCode < 200 || httpResponse.StatusCode >= 300 {
		return nil, &HTTPError{StatusCode: httpResponse.StatusCode, Body: string(responseBody)}
	}

	var decoded map[string]any
	if err := json.Unmarshal(responseBody, &decoded); err != nil {
		return nil, fmt.Errorf("aport: decode verify response: %w", err)
	}

	result := &VerifyResponse{Raw: decoded}
	result.Allow, _ = decoded["allow"].(bool)
	result.Decision, _ = decoded["decision"].(string)
	result.TraceID, _ = decoded["trace_id"].(string)
	result.Reasons = stringSlice(decoded["reasons"])

	return result, nil
}

func (client *Client) RequirePolicy(ctx context.Context, policyID string, request VerifyRequest) (*VerifyResponse, error) {
	response, err := client.VerifyPolicy(ctx, policyID, request)
	if err != nil {
		return nil, err
	}
	if !response.Allow {
		return response, ErrDenied
	}
	return response, nil
}

type HTTPError struct {
	StatusCode int
	Body       string
}

func (err *HTTPError) Error() string {
	return fmt.Sprintf("aport: api returned status %d: %s", err.StatusCode, err.Body)
}

func stringSlice(value any) []string {
	items, ok := value.([]any)
	if !ok {
		return nil
	}

	result := make([]string, 0, len(items))
	for _, item := range items {
		if text, ok := item.(string); ok {
			result = append(result, text)
		}
	}
	return result
}
