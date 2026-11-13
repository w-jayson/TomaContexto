namespace TomaSeuContexto.Infrastructure.Services;

using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using TomaSeuContexto.Application.Common;
using TomaSeuContexto.Application.DTOs;
using TomaSeuContexto.Application.Interfaces;

public class GeminiService : IGroqService
{
    private readonly HttpClient _httpClient;
    private readonly GeminiOptions _options;
    private readonly GroqOptions _groqOptions;
    private readonly ILogger<GeminiService> _logger;

    public GeminiService(
        HttpClient httpClient,
        IOptions<GeminiOptions> options,
        IOptions<GroqOptions> groqOptions,
        ILogger<GeminiService> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _groqOptions = groqOptions.Value;
        _logger = logger;
    }

    public bool HasApiKey =>
        !string.IsNullOrWhiteSpace(OpenAiCompatibleLlmClient.ResolveApiKey(_options.ApiKey, "GEMINI_API_KEY"));

    private OpenAiCompatibleLlmClient.ProviderConfig BuildConfig()
    {
        var systemPrompt = !string.IsNullOrWhiteSpace(_options.SystemPrompt)
            ? _options.SystemPrompt
            : _groqOptions.SystemPrompt;

        return new OpenAiCompatibleLlmClient.ProviderConfig(
            ProviderName: "Gemini",
            ApiKey: _options.ApiKey,
            EnvVarName: "GEMINI_API_KEY",
            Endpoint: _options.Endpoint,
            Model: _options.Model,
            DefaultModel: "gemini-3.5-flash",
            SystemPrompt: systemPrompt);
    }

    public Task<WordLookupResponseDto?> QueryTermAsync(string term, CancellationToken cancellationToken = default) =>
        OpenAiCompatibleLlmClient.QueryTermAsync(_httpClient, BuildConfig(), _logger, term, cancellationToken);

    public Task<List<SentencePairDto>> GenerateMoreSentencesAsync(
        string term,
        IEnumerable<string>? existingSentences = null,
        CancellationToken cancellationToken = default) =>
        OpenAiCompatibleLlmClient.GenerateMoreSentencesAsync(_httpClient, BuildConfig(), _logger, term, existingSentences, cancellationToken);

    public Task<List<string>> GetSynonymsAsync(string term, CancellationToken cancellationToken = default) =>
        OpenAiCompatibleLlmClient.GetSynonymsAsync(_httpClient, BuildConfig(), _logger, term, cancellationToken);
}
