namespace TomaSeuContexto.Api.Middlewares;

using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using TomaSeuContexto.Application.Common;

public class GlobalExceptionHandlerMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionHandlerMiddleware> _logger;

    public GlobalExceptionHandlerMiddleware(RequestDelegate next, ILogger<GlobalExceptionHandlerMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (AiServiceUnavailableException ex)
        {
            _logger.LogError(ex, "AI service unavailable: {Message}", ex.Message);
            await HandleExceptionAsync(
                context,
                StatusCodes.Status503ServiceUnavailable,
                "AI Service Unavailable",
                ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An unhandled exception occurred: {Message}", ex.Message);
            await HandleExceptionAsync(
                context,
                StatusCodes.Status500InternalServerError,
                "An error occurred while processing your request.",
                ex.Message);
        }
    }

    private static Task HandleExceptionAsync(HttpContext context, int statusCode, string title, string detail)
    {
        context.Response.ContentType = "application/problem+json";
        context.Response.StatusCode = statusCode;

        var problemDetails = new ProblemDetails
        {
            Status = statusCode,
            Title = title,
            Detail = detail,
            Instance = context.Request.Path
        };

        var json = JsonSerializer.Serialize(problemDetails);
        return context.Response.WriteAsync(json);
    }
}
