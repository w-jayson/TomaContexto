namespace TomaSeuContexto.Infrastructure.Services;

using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using TomaSeuContexto.Application.Common;
using TomaSeuContexto.Application.DTOs;

/// <summary>
/// Shared client for OpenAI-compatible Chat Completions providers (e.g., Groq and Gemini).
/// </summary>
internal static class OpenAiCompatibleLlmClient
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public sealed record ProviderConfig(
        string ProviderName,
        string? ApiKey,
        string? EnvVarName,
        string Endpoint,
        string Model,
        string DefaultModel,
        string SystemPrompt);

    public static string? ResolveApiKey(string? configuredKey, string? envVarName)
    {
        if (!string.IsNullOrWhiteSpace(configuredKey))
        {
            return configuredKey;
        }

        return string.IsNullOrWhiteSpace(envVarName)
            ? null
            : Environment.GetEnvironmentVariable(envVarName);
    }

    public static async Task<WordLookupResponseDto?> QueryTermAsync(
        HttpClient httpClient,
        ProviderConfig config,
        ILogger logger,
        string term,
        CancellationToken cancellationToken = default)
    {
        var apiKey = ResolveApiKey(config.ApiKey, config.EnvVarName);
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            logger.LogError("{Provider} API key is not configured. Cannot query term '{Term}'.", config.ProviderName, term);
            throw new AiServiceUnavailableException($"{config.ProviderName} API key is not configured.");
        }

        try
        {
            var model = string.IsNullOrWhiteSpace(config.Model) ? config.DefaultModel : config.Model;
            var rawContent = await SendChatCompletionAsync(
                httpClient,
                config.Endpoint,
                apiKey,
                model,
                config.SystemPrompt,
                term,
                temperature: 0.2,
                config.ProviderName,
                logger,
                cancellationToken);

            var parsed = JsonSerializer.Deserialize<GroqWordResponse>(rawContent, JsonOptions);
            if (parsed is null)
            {
                logger.LogWarning("Failed to deserialize {Provider} response into GroqWordResponse for term '{Term}'.", config.ProviderName, term);
                throw new AiServiceUnavailableException("Failed to parse the response from the AI provider.");
            }

            var termToUse = string.IsNullOrWhiteSpace(parsed.Term) ? term : parsed.Term;
            var finalTerm = CleanWhitespace(termToUse).ToLowerInvariant();
            var inputTerm = CleanWhitespace(term).ToLowerInvariant();

            var translationsByPos = parsed.Categories
                .Select(c => new TranslationGroupDto(
                    CleanWhitespace(c.PartOfSpeech),
                    FilterValidTranslations(c.Translations, inputTerm, finalTerm)
                ))
                .Where(c => c.Translations.Count > 0)
                .ToList();

            if (translationsByPos.Count == 0)
            {
                logger.LogInformation("{Provider} API returned no valid translations for term '{Term}'. Treating as word not found.", config.ProviderName, term);
                return null;
            }

            var sentences = parsed.Sentences
                .Select(s => new SentencePairDto(CleanWhitespace(s.En), CleanWhitespace(s.Pt)))
                .Where(s => !string.IsNullOrWhiteSpace(s.En) && !string.IsNullOrWhiteSpace(s.Pt))
                .ToList();

            var synonyms = (parsed.Synonyms ?? new List<string>())
                .Select(CleanWhitespace)
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Where(s => !s.Equals(finalTerm, StringComparison.OrdinalIgnoreCase))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Take(8)
                .ToList();

            return new WordLookupResponseDto(
                finalTerm,
                CleanWhitespace(parsed.Phonetic),
                translationsByPos,
                sentences,
                synonyms
            );
        }
        catch (AiServiceUnavailableException)
        {
            throw;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Exception occurred while querying {Provider} API for term '{Term}': {Message}", config.ProviderName, term, ex.Message);
            throw new AiServiceUnavailableException("An unexpected error occurred while communicating with the AI provider.", ex);
        }
    }

    public static async Task<List<SentencePairDto>> GenerateMoreSentencesAsync(
        HttpClient httpClient,
        ProviderConfig config,
        ILogger logger,
        string term,
        IEnumerable<string>? existingSentences = null,
        CancellationToken cancellationToken = default)
    {
        var apiKey = ResolveApiKey(config.ApiKey, config.EnvVarName);
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            logger.LogError("{Provider} API key is not configured. Cannot generate sentences for term '{Term}'.", config.ProviderName, term);
            throw new AiServiceUnavailableException($"{config.ProviderName} API key is not configured.");
        }

        try
        {
            var systemPrompt = @"Você é um motor lexicográfico especializado no aprendizado de inglês pelo método i+1 sentence mining para falantes de português do Brasil.
O usuário enviará uma palavra ou expressão em inglês juntamente com frases já existentes que NÃO devem ser repetidas.
Você DEVE responder ESTRITAMENTE com um objeto JSON válido, sem qualquer texto adicional ou Markdown fora do JSON, seguindo este formato:
{
  ""sentences"": [
    {
      ""en"": ""Frase natural em inglês, estrutura clara (i+1), contendo o termo."",
      ""pt"": ""Tradução contextualizada para português do Brasil.""
    }
  ]
}
Regras obrigatórias:
1. Forneça exatamente 4 frases de exemplo novas, autênticas e naturais demonstrando o uso real do termo em contexto (i+1).
2. Para diminuir drasticamente as chances de ter frases repetidas e enriquecer o repertório do estudante, cada uma das 4 frases DEVE focar em um contexto/cenário temático diferente:
   - Frase 1: Dia a dia / rotina pessoal (família, amigos, casa, hábitos).
   - Frase 2: Trabalho / ambiente profissional (reuniões, escritório, projetos, negócios, tecnologia).
   - Frase 3: Viagens / situações sociais (hotéis, restaurantes, aeroportos, lazer, cultura, eventos).
   - Frase 4: Acadêmico / leitura / notícias (estudos, ciência, debates ou literatura).
3. É EXPRESSAMENTE PROIBIDO repetir ou parafrasear frases fornecidas na lista de frases já existentes. Varie sujeito, tempo verbal e estrutura sintática.
4. Revise rigorosamente a ortografia e acentuação do português do Brasil (pt-BR) nas traduções (ex.: 'sofá', 'magoar', 'machuquei'), sem erros de digitação. Use apenas espaços comuns (U+0020), nunca espaços insecáveis (\u202F ou \u00A0).";

            var userContent = new StringBuilder();
            userContent.AppendLine($"Palavra ou expressão em inglês: {term}");

            var existingList = (existingSentences ?? Enumerable.Empty<string>())
                .Select(CleanWhitespace)
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (existingList.Count > 0)
            {
                userContent.AppendLine("Frases já existentes que NÃO devem ser repetidas de forma alguma:");
                foreach (var s in existingList.Take(15))
                {
                    userContent.AppendLine($"- {s}");
                }
            }

            userContent.AppendLine("Gere 4 novas frases inéditas, cada uma em um dos contextos especificados (dia a dia, trabalho, viagens/social, acadêmico).");

            var model = string.IsNullOrWhiteSpace(config.Model) ? config.DefaultModel : config.Model;
            var rawContent = await SendChatCompletionAsync(
                httpClient,
                config.Endpoint,
                apiKey,
                model,
                systemPrompt,
                userContent.ToString(),
                temperature: 0.2,
                config.ProviderName,
                logger,
                cancellationToken);

            var parsed = JsonSerializer.Deserialize<GroqMoreSentencesResponse>(rawContent, JsonOptions);
            if (parsed?.Sentences is null)
            {
                logger.LogWarning("Failed to deserialize {Provider} response into GroqMoreSentencesResponse for term '{Term}'.", config.ProviderName, term);
                throw new AiServiceUnavailableException("Failed to parse the response from the AI provider.");
            }

            var existingSet = new HashSet<string>(existingList, StringComparer.OrdinalIgnoreCase);

            return parsed.Sentences
                .Select(s => new SentencePairDto(CleanWhitespace(s.En), CleanWhitespace(s.Pt)))
                .Where(s => !string.IsNullOrWhiteSpace(s.En) && !string.IsNullOrWhiteSpace(s.Pt))
                .Where(s => !existingSet.Contains(s.En))
                .DistinctBy(s => s.En, StringComparer.OrdinalIgnoreCase)
                .ToList();
        }
        catch (AiServiceUnavailableException)
        {
            throw;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Exception occurred while generating sentences with {Provider} API for term '{Term}': {Message}", config.ProviderName, term, ex.Message);
            throw new AiServiceUnavailableException("An unexpected error occurred while communicating with the AI provider.", ex);
        }
    }

    public static async Task<List<string>> GetSynonymsAsync(
        HttpClient httpClient,
        ProviderConfig config,
        ILogger logger,
        string term,
        CancellationToken cancellationToken = default)
    {
        var apiKey = ResolveApiKey(config.ApiKey, config.EnvVarName);
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            logger.LogWarning("{Provider} API key is not configured. Cannot fetch synonyms for term '{Term}'.", config.ProviderName, term);
            return new List<string>();
        }

        try
        {
            var systemPrompt = @"Você é um motor lexicográfico especializado em língua inglesa.
O usuário enviará uma palavra ou expressão idiomática em inglês.
Você DEVE responder ESTRITAMENTE com um objeto JSON válido, sem texto ou Markdown adicional, no formato:
{
  ""synonyms"": [""sinônimo 1"", ""sinônimo 2"", ""sinônimo 3"", ""sinônimo 4""]
}
Regras:
1. Forneça de 3 a 6 sinônimos ou termos semanticamente próximos em inglês, em minúsculas.
2. É EXPRESSAMENTE PROIBIDO retornar o próprio termo buscado ou apenas variações de maiúsculas/minúsculas.
3. Se não houver sinônimos diretos ou for uma expressão sem equivalentes, retorne [].";

            var model = string.IsNullOrWhiteSpace(config.Model) ? config.DefaultModel : config.Model;
            var rawContent = await SendChatCompletionAsync(
                httpClient,
                config.Endpoint,
                apiKey,
                model,
                systemPrompt,
                term,
                temperature: 0.2,
                config.ProviderName,
                logger,
                cancellationToken);

            var parsed = JsonSerializer.Deserialize<GroqSynonymsResponse>(rawContent, JsonOptions);
            var cleanTerm = CleanWhitespace(term).ToLowerInvariant();

            return (parsed?.Synonyms ?? new List<string>())
                .Select(CleanWhitespace)
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Where(s => !s.Equals(cleanTerm, StringComparison.OrdinalIgnoreCase))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Take(8)
                .ToList();
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to get synonyms from {Provider} for '{Term}': {Message}", config.ProviderName, term, ex.Message);
            return new List<string>();
        }
    }

    private static async Task<string> SendChatCompletionAsync(
        HttpClient httpClient,
        string endpoint,
        string apiKey,
        string model,
        string systemPrompt,
        string userPrompt,
        double temperature,
        string providerName,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        var requestPayload = new
        {
            model,
            messages = new object[]
            {
                new { role = "system", content = systemPrompt },
                new { role = "user", content = userPrompt }
            },
            response_format = new { type = "json_object" },
            temperature
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, endpoint)
        {
            Content = JsonContent.Create(requestPayload)
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

        var response = await httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
            logger.LogError("{Provider} API call returned HTTP {StatusCode}: {ErrorBody}", providerName, response.StatusCode, errorBody);
            throw new AiServiceUnavailableException($"Failed to communicate with the AI provider (HTTP {(int)response.StatusCode}).");
        }

        var responseJson = await response.Content.ReadFromJsonAsync<ChatCompletionResponse>(cancellationToken: cancellationToken);
        var rawContent = responseJson?.Choices?.FirstOrDefault()?.Message?.Content;
        if (string.IsNullOrWhiteSpace(rawContent))
        {
            logger.LogWarning("{Provider} API returned an empty completion content.", providerName);
            throw new AiServiceUnavailableException("The AI provider returned an empty response.");
        }

        return StripMarkdownCodeFences(rawContent);
    }

    private static string StripMarkdownCodeFences(string content)
    {
        var trimmed = content.Trim();
        if (!trimmed.StartsWith("```", StringComparison.Ordinal))
        {
            return trimmed;
        }

        var firstNewLine = trimmed.IndexOf('\n');
        if (firstNewLine < 0)
        {
            return trimmed;
        }

        var withoutOpening = trimmed[(firstNewLine + 1)..];
        var lastFence = withoutOpening.LastIndexOf("```", StringComparison.Ordinal);
        return lastFence >= 0 ? withoutOpening[..lastFence].Trim() : withoutOpening.Trim();
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

        var filtered = cleaned
            .Where(t => !IsSpellingVariant(t, inputTerm) && !IsSpellingVariant(t, finalTerm))
            .ToList();

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

        if (t.EndsWith('y') && c.EndsWith("ie") && t[..^1] == c[..^2]) return true;
        if (t.EndsWith("ie") && c.EndsWith('y') && t[..^2] == c[..^1]) return true;
        if (t.EndsWith('y') && c.EndsWith("ey") && t[..^1] == c[..^2]) return true;
        if (t.EndsWith("ey") && c.EndsWith('y') && t[..^2] == c[..^1]) return true;
        if (t.EndsWith('y') && c.EndsWith("ies") && t[..^1] == c[..^3]) return true;
        if (t.EndsWith("ies") && c.EndsWith('y') && t[..^3] == c[..^1]) return true;
        if (c == t + "s" || c == t + "es" || t == c + "s" || t == c + "es") return true;

        return false;
    }

    public static string CleanWhitespace(string? input)
    {
        if (string.IsNullOrWhiteSpace(input))
        {
            return string.Empty;
        }

        return input
            .Replace('\u202F', ' ')
            .Replace('\u00A0', ' ')
            .Replace('\u200B', ' ')
            .Replace('\uFEFF', ' ')
            .Trim();
    }

    private sealed class ChatCompletionResponse
    {
        public List<ChatChoice>? Choices { get; set; }
    }

    private sealed class ChatChoice
    {
        public ChatMessage? Message { get; set; }
    }

    private sealed class ChatMessage
    {
        public string? Content { get; set; }
    }
}
