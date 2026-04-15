# Creating an Official Go SDK for APort API with Middleware for Popular Go Frameworks

## Introduction

In this tutorial, you will learn how to create an official Go (Golang) SDK for the APort API, including middleware support for popular Go web frameworks: Gin, Echo, and Fiber. By following these steps, you will be able to integrate APort services into your Go applications seamlessly.

By the end of this guide, you will have:

- A well-documented Go module with an official SDK
- Middleware implementations for Gin, Echo, and Fiber
- Comprehensive tests to ensure reliability
- Example applications showcasing usage

## Prerequisites

Before diving into the tutorial, make sure you have the following installed and set up on your development environment:

1. **Go**: Ensure Go is installed and properly configured.
2. **Gin, Echo, Fiber**: Install these frameworks using `go get`.
3. **Git**: For version control.

## Step 1: Setting Up Your Project

### Create a New Go Module

First, initialize a new Go module in your project directory:

```sh
mkdir go-sdk-aport
cd go-sdk-aport
go mod init github.com/your-username/aport-sdk-go
```

Replace `github.com/your-username/aport-sdk-go` with the actual GitHub username and repository path.

### Add Dependencies

Install the required dependencies for APort SDK:

```sh
go get github.com/aporthq/aporthq-sdk-go
go get gin-gonic/gin
go get echo.labstack/echo/v4
go get gofiber/fiber
```

## Step 2: Creating the Go SDK and Middleware

### Basic SDK Structure

Create a basic directory structure for your SDK:

```sh
mkdir -p cmd/aport-sdk-go
mkdir pkg/aport
```

Within `pkg/aport`, create the following files to start building your SDK:

- `aport.go`
- `client.go`

### APort Client Implementation (`client.go`)

Start by implementing a basic client for interacting with the APort API. This will handle HTTP requests and responses.

```go
package aport

import (
	"net/http"
	"io/ioutil"
	"encoding/json"
)

type APORTResponse struct {
	Status  string `json:"status"`
	Message string `json:"message"`
	Data    interface{} `json:"data"`
}

func NewAPortClient(baseURL string) *APortClient {
	return &APortClient{
		baseURL: baseURL,
	}
}

type APortClient struct {
	baseURL string
}

func (c *APortClient) Get(path string, params map[string]string) (*APORTResponse, error) {
	url := c.baseURL + path

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	for k, v := range params {
		req.URL.RawQuery = k + "=" + v
	}

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var result APORTResponse
	err = json.Unmarshal(body, &result)
	if err != nil {
		return nil, err
	}

	return &result, nil
}
```

### Middleware Implementation

Create middleware functions for each framework.

#### Gin Middleware (`middleware_gin.go`)

```go
package aport

import (
	"github.com/gin-gonic/gin"
)

func APortMiddleware(clients map[string]*APortClient) gin.HandlerFunc {
	return func(c *gin.Context) {
		apiKey := c.Query("api_key")
		if apiKey == "" {
			c.AbortWithStatus(http.StatusBadRequest)
			return
		}

		client, ok := clients[apiKey]
		if !ok {
			c.AbortWithStatus(http.StatusUnauthorized)
			return
		}

		path := c.Request.URL.Path
		params := c.Request.URL.Query()

		result, err := client.Get(path, params)
		if err != nil {
			c.Error(err)
			c.Abort()
			return
		}

		c.JSON(result.StatusCode, result.Data)
	}
}
```

#### Echo Middleware (`middleware_echo.go`)

```go
package aport

import (
	"github.com/labstack/echo/v4"
)

func APortMiddleware(clients map[string]*APortClient) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			apiKey := c.QueryParam("api_key")
			if apiKey == "" {
				return c.String(http.StatusBadRequest, "Invalid API key")
			}

			client, ok := clients[apiKey]
			if !ok {
				return c.String(http.StatusUnauthorized, "API key not found")
			}

			path := c.Request().URI.Path
			params := c.Request().URI.Query()

			result, err := client.Get(path, params)
			if err != nil {
				return c.Next()
			}

			c.JSON(result.StatusCode, result.Data)

			return nil
		}
	}
}
```

#### Fiber Middleware (`middleware_fiber.go`)

```go
package aport

import (
	"github.com/gofiber/fiber/v2"
)

func APortMiddleware(clients map[string]*APortClient) fiber.Handler {
	return func(c *fiber.Ctx) error {
		apiKey := c.Query("api_key")
		if apiKey == "" {
			return c.Status(fiber.StatusBadRequest).SendString("Invalid API key")
		}

		client, ok := clients[apiKey]
		if !ok {
			return c.Status(fiber.StatusUnauthorized).SendString("API key not found")
		}

		path := c.Path()
		params := c.QueryArgs()

		result, err := client.Get(path, params.StringMap())
		if err != nil {
			c.Next()
			return nil
		}

		return c.JSON(result.Data)
	}
}
```

## Step 3: Writing Tests

Create test files for your SDK and middleware to ensure they work as expected.

### Test Client (`client_test.go`)

```go
package aport

import (
	"testing"
	"net/http/httptest"
	"encoding/json"
)

func TestAPortClient(t *testing.T) {
	client := NewAPortClient("http://example.com/api")
	result, err := client.Get("/users", map[string]string{"api_key": "test_api_key"})
	if err != nil {
		t.Errorf("Failed to get users: %v", err)
	}

	expectedResult := APORTResponse{
		Status:  "success",
		Message: "Users fetched successfully",
		Data:    []interface{}{},
	}
	if !reflect.DeepEqual(result, expectedResult) {
		t.Errorf("Expected result: %v, got: %v", expectedResult, result)
	}
}
```

### Test Middleware (`middleware_test.go`)

For each middleware, create a test file to validate its functionality.

#### Gin Middleware Test

```go
package aport

import (
	"testing"
	"github.com/gin-gonic/gin"
	"net/http/httptest"
	"reflect"
)

func TestAPortMiddleware(t *testing.T) {
	router := gin.New()
	clients := map[string]*APortClient{
		"test_api_key": NewAPortClient("http://example.com/api"),
	}

	router.Use(APortMiddleware(clients))

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/users?api_key=test_api_key", nil)

	router.ServeHTTP(w, req)

	if w.Code != 200 {
		t.Errorf("Expected status code: 200, got: %d", w.Code)
	}

	var result APORTResponse
	json.Unmarshal([]byte(w.Body.String()), &result)
	if !reflect.DeepEqual(result, expectedResult) {
		t.Errorf("Expected result: %v, got: %v", expectedResult, result)
	}
}
```

## Step 4: Example Applications

Create example applications using Gin, Echo, and Fiber to demonstrate the SDK in action.

### Gin Example Application (`cmd/aport-sdk-go/main_gin.go`)

```go
package main

import (
	"github.com/gin-gonic/gin"
	"aport-sdk-go/pkg/aport"
	"net/http"
)

func main() {
	gin.SetMode(gin.ReleaseMode)
	router := gin.Default()

	aportClient := aport.NewAPortClient("http://example.com/api")
	middleware := aport.APortMiddleware(map[string]*aport.Client{
		"test_api_key": aportClient,
	})

	router.Use(middleware)

	router.GET("/users", func(c *gin.Context) {
		apiKey := c.Query("api_key")

		aportClient := aport.NewAPortClient("http://example.com/api")
		result, err := aportClient.Get("/users", map[string]string{"api_key": apiKey})
		if err != nil {
			c.Error(err)
			return
		}

		c.JSON(result.StatusCode, result.Data)
	})

	router.Run(":8081")
}
```

### Echo Example Application (`cmd/aport-sdk-go/main_echo.go`)

```go
package main

import (
	"github.com/labstack/echo/v4"
	"aport-sdk-go/pkg/aport"
)

func main() {
	echo := echo.New()

	aportClient := aport.NewAPortClient("http://example.com/api")
	middleware := aport.APortMiddleware(map[string]*aport.Client{
		"test_api_key": aportClient,
	})

	echo.Use(middleware)

	echo.GET("/users", func(c echo.Context) error {
		apiKey := c.QueryParam("api_key")

		if apiKey == "" {
			return c.String(http.StatusBadRequest, "Invalid API key")
		}

		aportClient := aport.NewAPortClient("http://example.com/api")
		result, err := aportClient.Get("/users", map[string]string{"api_key": apiKey})
		if err != nil {
			return c.Next()
		}

		c.JSON(result.StatusCode, result.Data)
		return nil
	})

	echo.Start(":8081")
}
```

### Fiber Example Application (`cmd/aport-sdk-go/main_fiber.go`)

```go
package main

import (
	"github.com/gofiber/fiber/v2"
	"aport-sdk-go/pkg/aport"
)

func main() {
	fiberApp := fiber.New()

	aportClient := aport.NewAPortClient("http://example.com/api")
	middleware := aport.APortMiddleware(map[string]*aport.Client{
		"test_api_key": aportClient,
	})

	fiberApp.Use(middleware)

	fiberApp.Get("/users", func(c *fiber.Ctx) error {
		apiKey := c.Query("api_key")

		if apiKey == "" {
			return c.Status(fiber.StatusBadRequest).SendString("Invalid API key")
		}

		aportClient := aport.NewAPortClient("http://example.com/api")
		result, err := aportClient.Get("/users", map[string]string{"api_key": apiKey})
		if err != nil {
			return c.Next()
		}

		return c.JSON(result.Data)
	})

	fiberApp.Listen(":8081")
}
```

## Step 5: Documentation

Document your SDK and middleware usage to help others integrate it into their projects.

### README.md

```markdown
# APort Go SDK

## Overview

This repository contains an official Go (Golang) SDK for the APort API, with middleware support for popular web frameworks such as Gin, Echo, and Fiber. This documentation will guide you through setting up and using the SDK in your applications.

## Installation

### Dependencies

- Go 1.16+
- aporthq-sdk-go
- Gin, Echo, Fiber

You can install dependencies via:

```sh
go get github.com/aporthq/aporthq-sdk-go
go get gin-gonic/gin
go get echo.labstack/echo/v4
go get gofiber/fiber
```

### Usage

#### Basic Client Example

Create a new instance of the APort client and use it to make API calls.

```go
aportClient := aport.NewAPortClient("http://example.com/api")
result, err := aportClient.Get("/users", map[string]string{"api_key": "test_api_key"})
if err != nil {
	// Handle error
}
```

#### Middleware Integration

Integrate the middleware into your web framework of choice.

##### Gin Example

```go
aportClient := aport.NewAPortClient("http://example.com/api")
middleware := aport.APortMiddleware(map[string]*aport.Client{
	"test_api_key": aportClient,
})

router := gin.Default()
router.Use(middleware)

// Define routes...
```

##### Echo Example

```go
aportClient := aport.NewAPortClient("http://example.com/api")
middleware := aport.APortMiddleware(map[string]*aport.Client{
	"test_api_key": aportClient,
})

echo := echo.New()
echo.Use(middleware)

// Define routes...
```

##### Fiber Example

```go
aportClient := aport.NewAPortClient("http://example.com/api")
middleware := aport.APortMiddleware(map[string]*aport.Client{
	"test_api_key": aportClient,
})

fiberApp := fiber.New()
fiberApp.Use(middleware)

// Define routes...
```

## Contributing

Feel free to submit pull requests and issues for any improvements or bug fixes.

---

This tutorial provides a comprehensive guide to creating an official Go SDK for the APort API with middleware support. Follow these steps to set up your development environment, create and test the SDK, and integrate it into various web frameworks.
```

## Conclusion

Congratulations! You have successfully created an official Go SDK for the APort API with middleware support for popular web frameworks: Gin, Echo, and Fiber. This guide provides a solid foundation for integrating APort services into your applications.

If you encounter any issues during development or have further questions, feel free to reach out in the GitHub issue tracker. Happy coding!