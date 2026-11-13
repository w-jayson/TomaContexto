namespace TomaSeuContexto.Infrastructure.Services;

using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using TomaSeuContexto.Application.Common;
using TomaSeuContexto.Application.DTOs;
using TomaSeuContexto.Application.Interfaces;

public class GroqService : IGroqService
{
    private readonly HttpClient _httpClient;
    private readonly GroqOptions _options;
    private readonly ILogger<GroqService> _logger;

    public GroqService(
        HttpClient httpClient,
        IOptions<GroqOptions> options,
        ILogger<GroqService> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    public bool HasApiKey =>
        !string.IsNullOrWhiteSpace(OpenAiCompatibleLlmClient.ResolveApiKey(_options.ApiKey, "GROQ_API_KEY"));

    private OpenAiCompatibleLlmClient.ProviderConfig BuildConfig() => new(
        ProviderName: "Groq",
        ApiKey: _options.ApiKey,
        EnvVarName: "GROQ_API_KEY",
        Endpoint: _options.Endpoint,
        Model: _options.Model,
        DefaultModel: "llama-3.3-70b-versatile",
        SystemPrompt: _options.SystemPrompt);

    public Task<WordLookupResponseDto?> QueryTermAsync(string term, CancellationToken cancellationToken = default) =>
        OpenAiCompatibleLlmClient.QueryTermAsync(_httpClient, BuildConfig(), _logger, term, cancellationToken);

    public Task<List<SentencePairDto>> GenerateMoreSentencesAsync(
        string term,
        IEnumerable<string>? existingSentences = null,
        CancellationToken cancellationToken = default) =>
        OpenAiCompatibleLlmClient.GenerateMoreSentencesAsync(_httpClient, BuildConfig(), _logger, term, existingSentences, cancellationToken);

    public Task<List<string>> GetSynonymsAsync(string term, CancellationToken cancellationToken = default) =>
        OpenAiCompatibleLlmClient.GetSynonymsAsync(_httpClient, BuildConfig(), _logger, term, cancellationToken);

    public static List<string> FilterValidTranslations(
        IEnumerable<string>? rawTranslations,
        string inputTerm,
        string finalTerm) =>
        OpenAiCompatibleLlmClient.FilterValidTranslations(rawTranslations, inputTerm, finalTerm);

    public static bool IsSpellingVariant(string candidate, string target) =>
        OpenAiCompatibleLlmClient.IsSpellingVariant(candidate, target);

    public static string CleanWhitespace(string? input) =>
        OpenAiCompatibleLlmClient.CleanWhitespace(input);
}
