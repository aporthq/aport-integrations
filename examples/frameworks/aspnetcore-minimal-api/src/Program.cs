using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<AportOptions>(builder.Configuration.GetSection("APort"));
builder.Services.AddHttpClient<IAportVerificationClient, AportVerificationClient>();

var app = builder.Build();

var defaultPolicy = app.Configuration["APort:DefaultPolicy"] ?? "finance.payment.refund.v1";

app.MapGet("/health", () => Results.Ok(new
{
    status = "ok",
    service = "aport-aspnetcore-minimal-api-example"
}));

app.MapPost("/refunds", (RefundRequest request) => Results.Ok(new
{
    message = "Refund request passed APort verification and is ready for business processing.",
    request.OrderId,
    request.Amount
}))
.RequireAportVerification(defaultPolicy)
.WithName("CreateRefund")
.WithSummary("Create a refund after APort policy verification");

app.Run();

public sealed record RefundRequest(string OrderId, decimal Amount, string Currency = "USD");

public sealed class AportOptions
{
    public string BaseUrl { get; init; } = "https://api.aport.io";
    public string? ApiKey { get; init; }
    public string DefaultPolicy { get; init; } = "finance.payment.refund.v1";

    // Keeps the example runnable out of the box. Set APort__UseMock=false for the live API.
    public bool UseMock { get; init; } = true;
}

public sealed record AportVerificationResult(bool Allow, IReadOnlyList<string> Reasons, JsonElement? Passport);

public interface IAportVerificationClient
{
    Task<AportVerificationResult> VerifyAsync(
        string policy,
        string agentId,
        object? context,
        CancellationToken cancellationToken);
}

public sealed class AportVerificationClient(
    HttpClient httpClient,
    IOptions<AportOptions> options,
    ILogger<AportVerificationClient> logger) : IAportVerificationClient
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly AportOptions _options = options.Value;

    public async Task<AportVerificationResult> VerifyAsync(
        string policy,
        string agentId,
        object? context,
        CancellationToken cancellationToken)
    {
        if (_options.UseMock)
        {
            return MockVerification(agentId);
        }

        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            throw new InvalidOperationException("APort__ApiKey is required when APort__UseMock=false.");
        }

        var baseUri = new Uri(_options.BaseUrl.TrimEnd('/') + "/", UriKind.Absolute);
        using var request = new HttpRequestMessage(HttpMethod.Post, new Uri(baseUri, "verify"));
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey);
        request.Content = JsonContent.Create(new
        {
            policy,
            agentId,
            context
        }, options: JsonOptions);

        using var response = await httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning("APort verification returned {StatusCode}", response.StatusCode);
            return new AportVerificationResult(
                Allow: false,
                Reasons: [$"APort API returned HTTP {(int)response.StatusCode}."],
                Passport: null);
        }

        var verification = await response.Content.ReadFromJsonAsync<AportVerifyResponse>(JsonOptions, cancellationToken);
        var allow = verification?.Allow ?? verification?.Verified ?? false;
        var reasons = verification?.Reasons ?? [];

        return new AportVerificationResult(allow, reasons, verification?.Passport);
    }

    private static AportVerificationResult MockVerification(string agentId)
    {
        if (agentId.Equals("agt_denied", StringComparison.OrdinalIgnoreCase))
        {
            return new AportVerificationResult(false, ["Mock denial for demonstration."], null);
        }

        return new AportVerificationResult(true, ["Mock allow for local development."], null);
    }
}

public sealed class AportVerifyResponse
{
    [JsonPropertyName("allow")]
    public bool? Allow { get; init; }

    [JsonPropertyName("verified")]
    public bool? Verified { get; init; }

    [JsonPropertyName("reasons")]
    public string[] Reasons { get; init; } = [];

    [JsonPropertyName("passport")]
    public JsonElement? Passport { get; init; }
}

public static class AportEndpointFilterExtensions
{
    public static RouteHandlerBuilder RequireAportVerification(this RouteHandlerBuilder builder, string policy)
    {
        return builder.AddEndpointFilter(async (context, next) =>
        {
            var httpContext = context.HttpContext;
            var agentId = httpContext.Request.Headers["X-Agent-Id"].FirstOrDefault();

            if (string.IsNullOrWhiteSpace(agentId))
            {
                return Results.Problem(
                    title: "Missing APort agent identity",
                    detail: "Send the agent identifier in the X-Agent-Id header.",
                    statusCode: StatusCodes.Status400BadRequest);
            }

            var client = httpContext.RequestServices.GetRequiredService<IAportVerificationClient>();
            var result = await client.VerifyAsync(policy, agentId, new
            {
                path = httpContext.Request.Path.Value,
                method = httpContext.Request.Method
            }, httpContext.RequestAborted);

            if (!result.Allow)
            {
                return Results.Problem(
                    title: "APort verification denied",
                    detail: result.Reasons.Count > 0
                        ? string.Join(" ", result.Reasons)
                        : "The agent is not allowed to perform this action.",
                    statusCode: StatusCodes.Status403Forbidden);
            }

            httpContext.Items["APortPassport"] = result.Passport;
            return await next(context);
        });
    }
}
