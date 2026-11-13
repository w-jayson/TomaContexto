using System.Globalization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;
using TomaSeuContexto.Api.Middlewares;
using TomaSeuContexto.Application.Common;
using TomaSeuContexto.Application.Interfaces;
using TomaSeuContexto.Application.Services;
using TomaSeuContexto.Infrastructure.Persistence;
using TomaSeuContexto.Infrastructure.Repositories;
using TomaSeuContexto.Infrastructure.Services;

var builder = WebApplication.CreateBuilder(args);

// Load local overrides if present (appsettings.local.json is ignored by git)
builder.Configuration.AddJsonFile("appsettings.local.json", optional: true, reloadOnChange: true);

// Options configuration
builder.Services.Configure<GroqOptions>(builder.Configuration.GetSection(GroqOptions.SectionName));
builder.Services.Configure<GeminiOptions>(builder.Configuration.GetSection(GeminiOptions.SectionName));

var aiProviderEnv = Environment.GetEnvironmentVariable("AI_PROVIDER");
builder.Services.Configure<AiOptions>(options =>
{
    builder.Configuration.GetSection(AiOptions.SectionName).Bind(options);
    if (!string.IsNullOrWhiteSpace(aiProviderEnv))
    {
        options.Provider = aiProviderEnv;
    }
});

var googleTtsApiKey = Environment.GetEnvironmentVariable("GOOGLE_TTS_API_KEY");
builder.Services.Configure<GoogleTtsOptions>(options =>
{
    builder.Configuration.GetSection(GoogleTtsOptions.SectionName).Bind(options);
    if (!string.IsNullOrWhiteSpace(googleTtsApiKey))
    {
        options.ApiKey = googleTtsApiKey;
    }
});

// Forwarded headers so rate limiting identifies real client IP behind Caddy / reverse proxies
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

// Rate limiting configuration for search endpoints
var permitLimit = builder.Configuration.GetValue("RateLimiting:PermitLimit", 15);
var windowSeconds = builder.Configuration.GetValue("RateLimiting:WindowSeconds", 60);

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.OnRejected = async (context, cancellationToken) =>
    {
        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
        {
            context.HttpContext.Response.Headers.RetryAfter =
                ((int)Math.Ceiling(retryAfter.TotalSeconds)).ToString(CultureInfo.InvariantCulture);
        }

        context.HttpContext.Response.ContentType = "application/problem+json";
        var problemDetails = new ProblemDetails
        {
            Status = StatusCodes.Status429TooManyRequests,
            Title = "Too Many Requests",
            Detail = "Search rate limit exceeded. Please wait a moment before trying again.",
            Instance = context.HttpContext.Request.Path
        };

        await context.HttpContext.Response.WriteAsJsonAsync(problemDetails, cancellationToken: cancellationToken);
    };

    options.AddPolicy("SearchPolicy", httpContext =>
    {
        var clientIp = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: clientIp,
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = permitLimit,
                Window = TimeSpan.FromSeconds(windowSeconds),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            });
    });
});

// Presentation services
builder.Services.AddControllers();
builder.Services.AddOpenApi();

// CORS configuration for frontend development
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Database & Persistence Configuration (Neon Postgres with In-Memory Fallback)
var rawConnectionString = builder.Configuration.GetConnectionString("DefaultConnection")
                          ?? Environment.GetEnvironmentVariable("DATABASE_URL");
var connectionString = NpgsqlConnectionHelper.NormalizeConnectionString(rawConnectionString ?? string.Empty);

if (!string.IsNullOrWhiteSpace(connectionString))
{
    builder.Services.AddDbContext<TomaSeuContextoDbContext>(options =>
        options.UseNpgsql(connectionString));

    builder.Services.AddScoped<IWordRepository, PostgresWordRepository>();
}
else
{
    builder.Services.AddSingleton<IWordRepository, InMemoryWordRepository>();
}

builder.Services.AddHttpClient<GroqService>();
builder.Services.AddHttpClient<GeminiService>();
builder.Services.AddScoped<IGroqService, AiProviderService>();
builder.Services.AddHttpClient<ITtsService, GoogleTtsService>();
builder.Services.AddScoped<IWordLookupService, WordLookupService>();

var app = builder.Build();

// Automatically apply pending EF Core migrations when DB is configured
if (!string.IsNullOrWhiteSpace(connectionString))
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<TomaSeuContextoDbContext>();
    await dbContext.Database.MigrateAsync();
}

// Middlewares
app.UseForwardedHeaders();
app.UseMiddleware<GlobalExceptionHandlerMiddleware>();

app.MapOpenApi();
app.MapScalarApiReference();

app.UseCors("AllowAll");
app.UseRateLimiter();

// Redirect root and /swagger to Scalar API reference
app.MapGet("/", () => Results.Redirect("/scalar/v1"));
app.MapGet("/swagger", () => Results.Redirect("/scalar/v1"));
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }));

app.MapControllers();

app.Run();

public partial class Program { }
