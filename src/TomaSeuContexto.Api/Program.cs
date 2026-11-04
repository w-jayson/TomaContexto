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

builder.Services.AddHttpClient<IGroqService, GroqService>();
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
app.UseMiddleware<GlobalExceptionHandlerMiddleware>();

app.MapOpenApi();
app.MapScalarApiReference();

app.UseCors("AllowAll");

// Redirect root and /swagger to Scalar API reference
app.MapGet("/", () => Results.Redirect("/scalar/v1"));
app.MapGet("/swagger", () => Results.Redirect("/scalar/v1"));
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }));

app.MapControllers();

app.Run();

public partial class Program { }
