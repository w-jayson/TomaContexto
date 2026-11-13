namespace TomaSeuContexto.UnitTests.Infrastructure;

using System.Net;
using System.Text.Json;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Shouldly;
using TomaSeuContexto.Application.Common;
using TomaSeuContexto.Infrastructure.Services;
using Xunit;

public class AiProviderServiceTests
{
    private static string BuildValidWordChatCompletion(string term, string translation)
    {
        var innerJson = JsonSerializer.Serialize(new
        {
            term,
            phonetic = "/hɜːrt/",
            categories = new[]
            {
                new { partOfSpeech = "Verbo", translations = new[] { translation } }
            },
            synonyms = new[] { "injure" },
            sentences = new[]
            {
                new { en = "It hurts.", pt = "Isso dói." }
            }
        });

        return JsonSerializer.Serialize(new
        {
            choices = new[]
            {
                new { message = new { content = innerJson } }
            }
        });
    }

    [Fact]
    public async Task AutoMode_WhenGeminiIsConfiguredAndSucceeds_ShouldUseGeminiWithoutCallingGroq()
    {
        var geminiHandler = new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(BuildValidWordChatCompletion("hurt", "prejudicar"))
        });
        var groqHandler = new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(BuildValidWordChatCompletion("hurt", "machucar"))
        });

        var groqOptions = Options.Create(new GroqOptions { ApiKey = "gsk_test", SystemPrompt = "sys" });
        var geminiOptions = Options.Create(new GeminiOptions { ApiKey = "gem_test" });
        var aiOptions = Options.Create(new AiOptions { Provider = "Auto" });

        var gemini = new GeminiService(new HttpClient(geminiHandler), geminiOptions, groqOptions, NullLogger<GeminiService>.Instance);
        var groq = new GroqService(new HttpClient(groqHandler), groqOptions, NullLogger<GroqService>.Instance);
        var provider = new AiProviderService(gemini, groq, aiOptions, NullLogger<AiProviderService>.Instance);

        var result = await provider.QueryTermAsync("hurt");

        result.ShouldNotBeNull();
        result.TranslationsByPos.First().Translations.ShouldContain("prejudicar");
        geminiHandler.CallCount.ShouldBe(1);
        groqHandler.CallCount.ShouldBe(0);
    }

    [Fact]
    public async Task AutoMode_WhenGeminiFails_ShouldFallbackToGroq()
    {
        var geminiHandler = new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.TooManyRequests)
        {
            Content = new StringContent("{\"error\":\"rate_limit\"}")
        });
        var groqHandler = new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(BuildValidWordChatCompletion("hurt", "machucar"))
        });

        var groqOptions = Options.Create(new GroqOptions { ApiKey = "gsk_test", SystemPrompt = "sys" });
        var geminiOptions = Options.Create(new GeminiOptions { ApiKey = "gem_test" });
        var aiOptions = Options.Create(new AiOptions { Provider = "Auto" });

        var gemini = new GeminiService(new HttpClient(geminiHandler), geminiOptions, groqOptions, NullLogger<GeminiService>.Instance);
        var groq = new GroqService(new HttpClient(groqHandler), groqOptions, NullLogger<GroqService>.Instance);
        var provider = new AiProviderService(gemini, groq, aiOptions, NullLogger<AiProviderService>.Instance);

        var result = await provider.QueryTermAsync("hurt");

        result.ShouldNotBeNull();
        result.TranslationsByPos.First().Translations.ShouldContain("machucar");
        geminiHandler.CallCount.ShouldBe(1);
        groqHandler.CallCount.ShouldBe(1);
    }

    [Fact]
    public async Task AutoMode_WhenGeminiHasNoApiKey_ShouldUseGroqDirectly()
    {
        var geminiHandler = new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK));
        var groqHandler = new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(BuildValidWordChatCompletion("hurt", "machucar"))
        });

        var prevGeminiEnv = Environment.GetEnvironmentVariable("GEMINI_API_KEY");
        try
        {
            Environment.SetEnvironmentVariable("GEMINI_API_KEY", null);

            var groqOptions = Options.Create(new GroqOptions { ApiKey = "gsk_test", SystemPrompt = "sys" });
            var geminiOptions = Options.Create(new GeminiOptions { ApiKey = "" });
            var aiOptions = Options.Create(new AiOptions { Provider = "Auto" });

            var gemini = new GeminiService(new HttpClient(geminiHandler), geminiOptions, groqOptions, NullLogger<GeminiService>.Instance);
            var groq = new GroqService(new HttpClient(groqHandler), groqOptions, NullLogger<GroqService>.Instance);
            var provider = new AiProviderService(gemini, groq, aiOptions, NullLogger<AiProviderService>.Instance);

            var result = await provider.QueryTermAsync("hurt");

            result.ShouldNotBeNull();
            geminiHandler.CallCount.ShouldBe(0);
            groqHandler.CallCount.ShouldBe(1);
        }
        finally
        {
            Environment.SetEnvironmentVariable("GEMINI_API_KEY", prevGeminiEnv);
        }
    }

    [Fact]
    public async Task GroqMode_ShouldAlwaysUseGroqEvenWhenGeminiIsConfigured()
    {
        var geminiHandler = new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK));
        var groqHandler = new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(BuildValidWordChatCompletion("hurt", "machucar"))
        });

        var groqOptions = Options.Create(new GroqOptions { ApiKey = "gsk_test", SystemPrompt = "sys" });
        var geminiOptions = Options.Create(new GeminiOptions { ApiKey = "gem_test" });
        var aiOptions = Options.Create(new AiOptions { Provider = "Groq" });

        var gemini = new GeminiService(new HttpClient(geminiHandler), geminiOptions, groqOptions, NullLogger<GeminiService>.Instance);
        var groq = new GroqService(new HttpClient(groqHandler), groqOptions, NullLogger<GroqService>.Instance);
        var provider = new AiProviderService(gemini, groq, aiOptions, NullLogger<AiProviderService>.Instance);

        var result = await provider.QueryTermAsync("hurt");

        result.ShouldNotBeNull();
        geminiHandler.CallCount.ShouldBe(0);
        groqHandler.CallCount.ShouldBe(1);
    }

    private sealed class StubHttpMessageHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _responder;
        public int CallCount { get; private set; }

        public StubHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> responder)
        {
            _responder = responder;
        }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            CallCount++;
            return Task.FromResult(_responder(request));
        }
    }
}
