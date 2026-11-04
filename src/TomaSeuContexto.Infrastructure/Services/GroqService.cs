namespace TomaSeuContexto.Infrastructure.Services;

using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
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

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public GroqService(
        HttpClient httpClient,
        IOptions<GroqOptions> options,
        ILogger<GroqService> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<WordLookupResponseDto?> QueryTermAsync(string term, CancellationToken cancellationToken = default)
    {
        var apiKey = !string.IsNullOrWhiteSpace(_options.ApiKey)
            ? _options.ApiKey
            : Environment.GetEnvironmentVariable("GROQ_API_KEY");

        if (string.IsNullOrWhiteSpace(apiKey))
        {
            _logger.LogWarning("Groq API key is not configured in appsettings ('Groq:ApiKey') or environment variable ('GROQ_API_KEY'). Skipping Groq query for term '{Term}'.", term);
            return null;
        }

        try
        {
            var requestPayload = new
            {
                model = string.IsNullOrWhiteSpace(_options.Model) ? "llama-3.3-70b-versatile" : _options.Model,
                messages = new object[]
                {
                    new { role = "system", content = _options.SystemPrompt },
                    new { role = "user", content = term }
                },
                response_format = new { type = "json_object" },
                temperature = 0.2
            };

            using var request = new HttpRequestMessage(HttpMethod.Post, _options.Endpoint)
            {
                Content = JsonContent.Create(requestPayload)
            };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

            var response = await _httpClient.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError("Groq API call returned HTTP {StatusCode}: {ErrorBody}", response.StatusCode, errorBody);
                return null;
            }

            var responseJson = await response.Content.ReadFromJsonAsync<GroqChatCompletionResponse>(
                cancellationToken: cancellationToken);

            var rawContent = responseJson?.Choices?.FirstOrDefault()?.Message?.Content;
            if (string.IsNullOrWhiteSpace(rawContent))
            {
                _logger.LogWarning("Groq API returned an empty completion content for term '{Term}'.", term);
                return null;
            }

            var groqWord = JsonSerializer.Deserialize<GroqWordResponse>(rawContent, JsonOptions);
            if (groqWord is null)
            {
                _logger.LogWarning("Failed to deserialize Groq response into GroqWordResponse for term '{Term}'.", term);
                return null;
            }

            var termToUse = string.IsNullOrWhiteSpace(groqWord.Term) ? term : groqWord.Term;
            var finalTerm = CleanWhitespace(termToUse).ToLowerInvariant();
            var inputTerm = CleanWhitespace(term).ToLowerInvariant();

            var translationsByPos = groqWord.Categories
                .Select(c => new TranslationGroupDto(
                    CleanWhitespace(c.PartOfSpeech),
                    FilterValidTranslations(c.Translations, inputTerm, finalTerm)
                ))
                .Where(c => c.Translations.Count > 0)
                .ToList();

            var sentences = groqWord.Sentences
                .Select(s => new SentencePairDto(CleanWhitespace(s.En), CleanWhitespace(s.Pt)))
                .Where(s => !string.IsNullOrWhiteSpace(s.En) && !string.IsNullOrWhiteSpace(s.Pt))
                .ToList();

            return new WordLookupResponseDto(
                finalTerm,
                CleanWhitespace(groqWord.Phonetic),
                translationsByPos,
                sentences
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception occurred while querying Groq API for term '{Term}': {Message}", term, ex.Message);
            return null;
        }
    }

    public static List<string> FilterValidTranslations(
        IEnumerable<string>? rawTranslations,
        string inputTerm,
        string finalTerm)
    {
        if (rawTranslations is null)
        {
            return new List<string>();
        }

        var cleaned = rawTranslations
            .Select(CleanWhitespace)
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        // Discard translations that are direct duplicates or English spelling variants of the searched term
        var filtered = cleaned
            .Where(t => !IsSpellingVariant(t, inputTerm) && !IsSpellingVariant(t, finalTerm))
            .ToList();

        // If filtering removed everything (e.g. cognates like 'banana' with no alternative), fall back to cleaned
        return filtered.Count > 0 ? filtered : cleaned;
    }

    public static bool IsSpellingVariant(string candidate, string target)
    {
        if (string.IsNullOrWhiteSpace(candidate) || string.IsNullOrWhiteSpace(target))
        {
            return false;
        }

        var c = candidate.Trim().ToLowerInvariant();
        var t = target.Trim().ToLowerInvariant();

        if (c == t)
        {
            return true;
        }

        // Pattern: -y vs -ie (e.g. hoody vs hoodie, cookie vs cooky)
        if (t.EndsWith('y') && c.EndsWith("ie") && t[..^1] == c[..^2])
        {
            return true;
        }
        if (t.EndsWith("ie") && c.EndsWith('y') && t[..^2] == c[..^1])
        {
            return true;
        }

        // Pattern: -y vs -ey (e.g. whisky vs whiskey)
        if (t.EndsWith('y') && c.EndsWith("ey") && t[..^1] == c[..^2])
        {
            return true;
        }
        if (t.EndsWith("ey") && c.EndsWith('y') && t[..^2] == c[..^1])
        {
            return true;
        }

        // Pattern: -y vs -ies (e.g. hoody vs hoodies)
        if (t.EndsWith('y') && c.EndsWith("ies") && t[..^1] == c[..^3])
        {
            return true;
        }
        if (t.EndsWith("ies") && c.EndsWith('y') && t[..^3] == c[..^1])
        {
            return true;
        }

        // Plural / singular English variants (e.g. hoodie vs hoodies, cat vs cats)
        if (c == t + "s" || c == t + "es" || t == c + "s" || t == c + "es")
        {
            return true;
        }

        return false;
    }

    public static string CleanWhitespace(string? input)
    {
        if (string.IsNullOrWhiteSpace(input))
        {
            return string.Empty;
        }

        return input
            .Replace('\u202F', ' ')  // Narrow no-break space
            .Replace('\u00A0', ' ')  // Non-breaking space
            .Replace('\u200B', ' ')  // Zero-width space
            .Replace('\uFEFF', ' ')  // Zero-width no-break space / BOM
            .Trim();
    }

    private sealed class GroqChatCompletionResponse
    {
        public List<GroqChoice>? Choices { get; set; }
    }

    private sealed class GroqChoice
    {
        public GroqMessage? Message { get; set; }
    }

    private sealed class GroqMessage
    {
        public string? Content { get; set; }
    }
}
