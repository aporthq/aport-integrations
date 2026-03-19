# APort Go SDK

Official Go SDK for APort verification with middleware support for popular frameworks.

## Installation

```bash
go get github.com/aporthq/aport-sdk-go
```

## Quick Start

```go
package main

import (
    "fmt"
    aport "github.com/aporthq/aport-sdk-go"
)

func main() {
    client := aport.NewClient("your-api-key", "your-project-id")
    
    result, err := client.Verify(
        "custom_action",
        "user-123",
        "john",
        map[string]string{"key": "value"},
    )
    
    if err != nil {
        fmt.Println("Error:", err)
        return
    }
    
    if result.Allow {
        fmt.Println("Allowed!")
    } else {
        fmt.Println("Denied:", result.Reasons)
    }
}
```

## Middleware

### Gin

```go
import (
    "github.com/aporthq/aport-sdk-go"
    "github.com/gin-gonic/gin"
)

func main() {
    r := gin.Default()
    r.Use(aport.GinMiddleware("your-api-key", "your-project-id"))
    
    r.GET("/protected", func(c *gin.Context) {
        c.JSON(200, gin.H{"message": "Hello!"})
    })
    
    r.Run(":3000")
}
```

### Echo

```go
import (
    "github.com/aporthq/aport-sdk-go"
    "github.com/labstack/echo/v4"
)

func main() {
    e := echo.New()
    e.Use(aport.EchoMiddleware("your-api-key", "your-project-id"))
    
    e.GET("/protected", func(c echo.Context) error {
        return c.JSON(200, map[string]string{"message": "Hello!"})
    })
    
    e.Start(":3000")
}
```

### Fiber

```go
import (
    "github.com/aporthq/aport-sdk-go"
    "github.com/gofiber/fiber/v2"
)

func main() {
    app := fiber.New()
    app.Use(aport.FiberMiddleware("your-api-key", "your-project-id"))
    
    app.Get("/protected", func(c *fiber.Ctx) error {
        return c.JSON(fiber.Map{"message": "Hello!"})
    })
    
    app.Listen(":3000")
}
```

## API Reference

### NewClient(apiKey, projectID)

Create a new APort client.

### client.Verify(action, actorID, actorName, context)

Verify an action. Returns `*VerifyResponse`.

### GinMiddleware(apiKey, projectID)

Gin middleware function.

### EchoMiddleware(apiKey, projectID)

Echo middleware function.

### FiberMiddleware(apiKey, projectID)

Fiber middleware function.

## License

MIT
