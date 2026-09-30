using Scalar.AspNetCore;
using TomaContexto.Api.Middlewares;
using TomaContexto.Application.Common;
using TomaContexto.Application.Interfaces;
using TomaContexto.Application.Services;
using TomaContexto.Infrastructure.Repositories;
using TomaContexto.Infrastructure.Services;

var builder = WebApplication.CreateBuilder(args);

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

// Dependency Injection Setup
builder.Services.AddSingleton<IWordRepository, InMemoryWordRepository>();
builder.Services.AddHttpClient<IGroqService, GroqService>();
builder.Services.AddScoped<IWordLookupService, WordLookupService>();

var app = builder.Build();

// Middlewares
app.UseMiddleware<GlobalExceptionHandlerMiddleware>();

app.MapOpenApi();
app.MapScalarApiReference();

app.UseCors("AllowAll");

// Redirect root and /swagger to Scalar API reference
app.MapGet("/", () => Results.Redirect("/scalar/v1"));
app.MapGet("/swagger", () => Results.Redirect("/scalar/v1"));

app.MapControllers();

app.Run();

public partial class Program { }
