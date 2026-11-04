namespace TomaSeuContexto.UnitTests.Infrastructure;

using System.Net;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Shouldly;
using TomaSeuContexto.Application.Common;
using TomaSeuContexto.Infrastructure.Services;
using Xunit;

public class GroqServiceTests
{
    [Fact]
    public async Task QueryTermAsync_WhenApiKeyIsEmpty_ShouldReturnNullWithoutCallingHttp()
    {
        // Arrange
        var handler = new TestHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK));
        var httpClient = new HttpClient(handler);
        var options = Options.Create(new GroqOptions
        {
            ApiKey = "" // Empty API key
        });

        var service = new GroqService(httpClient, options, NullLogger<GroqService>.Instance);

        // Act
        var result = await service.QueryTermAsync("strangeness");

        // Assert
        result.ShouldBeNull();
        handler.CallCount.ShouldBe(0);
    }

    [Fact]
    public async Task QueryTermAsync_WithValidApiResponse_ShouldParseDtoProperly()
    {
        // Arrange
        var mockJsonContent = """
        {
          "choices": [
            {
              "message": {
                "content": "{\n  \"term\": \"strangeness\",\n  \"phonetic\": \"/ˈstreɪndʒ.nəs/\",\n  \"categories\": [\n    {\n      \"partOfSpeech\": \"Substantivo\",\n      \"translations\": [\"estranheza\", \"singularidade\", \"esquisitice\"]\n    }\n  ],\n  \"sentences\": [\n    {\n      \"en\": \"She noticed the strangeness of his behavior.\",\n      \"pt\": \"Ela notou a estranheza do comportamento dele.\"\n    }\n  ]\n}"
              }
            }
          ]
        }
        """;

        var handler = new TestHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(mockJsonContent, System.Text.Encoding.UTF8, "application/json")
        });

        var httpClient = new HttpClient(handler);
        var options = Options.Create(new GroqOptions
        {
            ApiKey = "gsk_testkey12345",
            Endpoint = "https://api.groq.com/openai/v1/chat/completions",
            Model = "llama-3.3-70b-versatile"
        });

        var service = new GroqService(httpClient, options, NullLogger<GroqService>.Instance);

        // Act
        var result = await service.QueryTermAsync("strangeness");

        // Assert
        result.ShouldNotBeNull();
        result.Term.ShouldBe("strangeness");
        result.Phonetic.ShouldBe("/ˈstreɪndʒ.nəs/");
        result.TranslationsByPos.Count.ShouldBe(1);
        result.TranslationsByPos[0].PartOfSpeech.ShouldBe("Substantivo");
        result.TranslationsByPos[0].Translations.ShouldContain("estranheza");
        result.ExampleSentences.Count.ShouldBe(1);
        result.ExampleSentences[0].En.ShouldContain("strangeness");
        handler.CallCount.ShouldBe(1);
    }

    [Fact]
    public async Task QueryTermAsync_WithNarrowNoBreakSpace_ShouldSanitizeToStandardAsciiSpace()
    {
        // Arrange - Simulates model returning \u202F in time expressions like 9\u202Fa.m. and 9\u202Fh
        var mockJsonContent = """
        {
          "choices": [
            {
              "message": {
                "content": "{\n  \"term\": \"daylight savings\",\n  \"phonetic\": \"/ˈdeɪ.laɪt ˈseɪ.vɪŋz/\",\n  \"categories\": [\n    {\n      \"partOfSpeech\": \"Substantivo\",\n      \"translations\": [\"horário\u00A0de\u00A0verão\"]\n    }\n  ],\n  \"sentences\": [\n    {\n      \"en\": \"The meeting was moved to 9\u202Fa.m. because of daylight savings time.\",\n      \"pt\": \"A reunião foi adiada para as 9\u202Fh porque o horário de verão começou.\"\n    }\n  ]\n}"
              }
            }
          ]
        }
        """;

        var handler = new TestHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(mockJsonContent, System.Text.Encoding.UTF8, "application/json")
        });

        var httpClient = new HttpClient(handler);
        var options = Options.Create(new GroqOptions
        {
            ApiKey = "gsk_testkey12345",
            Endpoint = "https://api.groq.com/openai/v1/chat/completions"
        });

        var service = new GroqService(httpClient, options, NullLogger<GroqService>.Instance);

        // Act
        var result = await service.QueryTermAsync("daylight savings");

        // Assert
        result.ShouldNotBeNull();
        result.ExampleSentences[0].En.ShouldBe("The meeting was moved to 9 a.m. because of daylight savings time.");
        result.ExampleSentences[0].Pt.ShouldBe("A reunião foi adiada para as 9 h porque o horário de verão começou.");
        result.ExampleSentences[0].En.ShouldNotContain("\u202F");
        result.ExampleSentences[0].Pt.ShouldNotContain("\u202F");
        result.TranslationsByPos[0].Translations[0].ShouldBe("horário de verão");
        result.TranslationsByPos[0].Translations[0].ShouldNotContain("\u00A0");
    }

    [Theory]
    [InlineData("9\u202Fa.m.", "9 a.m.")]
    [InlineData("9\u202Fh", "9 h")]
    [InlineData("hello\u00A0world", "hello world")]
    [InlineData("  test \u200B ", "test")]
    public void CleanWhitespace_ShouldNormalizeExoticSpaces(string input, string expected)
    {
        var cleaned = GroqService.CleanWhitespace(input);
        cleaned.ShouldBe(expected);
    }

    [Fact]
    public async Task QueryTermAsync_WhenGroqReturnsEnglishSpellingVariantAsTranslation_ShouldFilterItOut()
    {
        // Arrange - Model returns English variant 'hoodie' for searched term 'hoody'
        var mockJsonContent = """
        {
          "choices": [
            {
              "message": {
                "content": "{\n  \"term\": \"hoody\",\n  \"phonetic\": \"/ˈhuːdi/\",\n  \"categories\": [\n    {\n      \"partOfSpeech\": \"Substantivo\",\n      \"translations\": [\"moletom com capuz\", \"blusão com capuz\", \"hoodie\"]\n    }\n  ],\n  \"sentences\": [\n    {\n      \"en\": \"He wore a dark hoody to stay warm.\",\n      \"pt\": \"Ele vestiu um moletom escuro com capuz para se manter aquecido.\"\n    }\n  ]\n}"
              }
            }
          ]
        }
        """;

        var handler = new TestHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(mockJsonContent, System.Text.Encoding.UTF8, "application/json")
        });

        var httpClient = new HttpClient(handler);
        var options = Options.Create(new GroqOptions
        {
            ApiKey = "gsk_testkey12345",
            Endpoint = "https://api.groq.com/openai/v1/chat/completions"
        });

        var service = new GroqService(httpClient, options, NullLogger<GroqService>.Instance);

        // Act
        var result = await service.QueryTermAsync("hoody");

        // Assert
        result.ShouldNotBeNull();
        result.TranslationsByPos.Count.ShouldBe(1);
        result.TranslationsByPos[0].Translations.ShouldContain("moletom com capuz");
        result.TranslationsByPos[0].Translations.ShouldContain("blusão com capuz");
        result.TranslationsByPos[0].Translations.ShouldNotContain("hoodie");
        result.TranslationsByPos[0].Translations.ShouldNotContain("hoody");
    }

    [Theory]
    [InlineData("hoodie", "hoody", true)]
    [InlineData("hoody", "hoodie", true)]
    [InlineData("whiskey", "whisky", true)]
    [InlineData("whisky", "whiskey", true)]
    [InlineData("hoodies", "hoody", true)]
    [InlineData("cats", "cat", true)]
    [InlineData("cat", "cats", true)]
    [InlineData("moletom com capuz", "hoody", false)]
    [InlineData("problema", "problem", false)]
    [InlineData("computador", "computer", false)]
    public void IsSpellingVariant_ShouldDetectVariantsCorrectly(string candidate, string target, bool expected)
    {
        var result = GroqService.IsSpellingVariant(candidate, target);
        result.ShouldBe(expected);
    }

    [Fact]
    public void FilterValidTranslations_WhenCognateIsOnlyWord_ShouldKeepItAsFallback()
    {
        // For words like 'banana' where English and Portuguese are identical
        var result = GroqService.FilterValidTranslations(new[] { "banana" }, "banana", "banana");
        result.ShouldContain("banana");
    }

    private sealed class TestHttpMessageHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _responder;
        public int CallCount { get; private set; }

        public TestHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> responder)
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
