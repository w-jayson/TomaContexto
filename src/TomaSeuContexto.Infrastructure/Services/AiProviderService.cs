namespace TomaSeuContexto.Infrastructure.Services;

using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using TomaSeuContexto.Application.Common;
using TomaSeuContexto.Application.DTOs;
using TomaSeuContexto.Application.Interfaces;

/// <summary>
/// Routes AI requests according to <see cref="AiOptions.Provider"/> ("Auto", "Gemini", or "Groq").
/// In "Auto" mode, uses Gemini Flash when configured and automatically falls back to Groq on failure.
/// </summary>
public class AiProviderService : IGroqService
{
    private readonly GeminiService _geminiService;
    private readonly GroqService _groqService;
    private readonly AiOptions _aiOptions;
    private readonly ILogger<AiProviderService> _logger;

    public AiProviderService(
        GeminiService geminiService,
        GroqService groqService,
        IOptions<AiOptions> aiOptions,
        ILogger<AiProviderService> logger)
    {
        _geminiService = geminiService;
        _groqService = groqService;
        _aiOptions = aiOptions.Value;
        _logger = logger;
    }

    public Task<WordLookupResponseDto?> QueryTermAsync(string term, CancellationToken cancellationToken = default) =>
        ExecuteWithFallbackAsync(
            provider => provider.QueryTermAsync(term, cancellationToken),
            $"QueryTermAsync('{term}')",
            cancellationToken);

    public Task<List<SentencePairDto>> GenerateMoreSentencesAsync(
        string term,
        IEnumerable<string>? existingSentences = null,
        CancellationToken cancellationToken = default) =>
        ExecuteWithFallbackAsync(
            provider => provider.GenerateMoreSentencesAsync(term, existingSentences, cancellationToken),
            $"GenerateMoreSentencesAsync('{term}')",
            cancellationToken);

    public async Task<List<string>> GetSynonymsAsync(string term, CancellationToken cancellationToken = default)
    {
        var mode = (_aiOptions.Provider ?? "Auto").Trim();

        if (mode.Equals("Groq", StringComparison.OrdinalIgnoreCase))
        {
            return await _groqService.GetSynonymsAsync(term, cancellationToken);
        }

        if (mode.Equals("Gemini", StringComparison.OrdinalIgnoreCase))
        {
            return await _geminiService.GetSynonymsAsync(term, cancellationToken);
        }

        if (_geminiService.HasApiKey)
        {
            var geminiResult = await _geminiService.GetSynonymsAsync(term, cancellationToken);
            if (geminiResult.Count > 0 || !_groqService.HasApiKey)
            {
                return geminiResult;
            }
        }

        return await _groqService.GetSynonymsAsync(term, cancellationToken);
    }

    private async Task<T> ExecuteWithFallbackAsync<T>(
        Func<IGroqService, Task<T>> operation,
        string operationName,
        CancellationToken cancellationToken)
    {
        var mode = (_aiOptions.Provider ?? "Auto").Trim();

        if (mode.Equals("Groq", StringComparison.OrdinalIgnoreCase))
        {
            return await operation(_groqService);
        }

        if (mode.Equals("Gemini", StringComparison.OrdinalIgnoreCase))
        {
            return await operation(_geminiService);
        }

        // Auto mode: prefer Gemini when configured, fall back to Groq if Gemini is unavailable or fails
        if (_geminiService.HasApiKey)
        {
            try
            {
                return await operation(_geminiService);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            catch (AiServiceUnavailableException ex) when (_groqService.HasApiKey)
            {
                _logger.LogWarning(ex, "Gemini failed during {Operation}. Falling back to Groq.", operationName);
                return await operation(_groqService);
            }
        }

        return await operation(_groqService);
    }
}
