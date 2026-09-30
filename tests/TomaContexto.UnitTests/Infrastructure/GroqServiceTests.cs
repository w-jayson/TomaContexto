namespace TomaContexto.UnitTests.Infrastructure;

using System.Net;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Shouldly;
using TomaContexto.Application.Common;
using TomaContexto.Infrastructure.Services;
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
