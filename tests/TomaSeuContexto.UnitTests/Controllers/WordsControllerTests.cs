namespace TomaSeuContexto.UnitTests.Controllers;

using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using Shouldly;
using TomaSeuContexto.Api.Controllers;
using TomaSeuContexto.Api.Middlewares;
using TomaSeuContexto.Application.Common;
using TomaSeuContexto.Application.DTOs;
using TomaSeuContexto.Application.Services;
using TomaSeuContexto.Infrastructure.Repositories;
using TomaSeuContexto.UnitTests.Fakes;
using Xunit;

public class WordsControllerTests
{
    private readonly WordsController _controller;
    private readonly FakeGroqService _fakeGroq;

    public WordsControllerTests()
    {
        var repository = new InMemoryWordRepository(populateSeeds: true);
        _fakeGroq = new FakeGroqService();
        var service = new WordLookupService(repository, _fakeGroq);
        _controller = new WordsController(service);

        // Setup HttpContext for ProblemDetails execution if needed
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };
    }

    [Fact]
    public async Task GetByTerm_WithValidSeedWord_ShouldReturn200OkWithExpectedDto()
    {
        // Act
        var actionResult = await _controller.GetByTerm("in disbelief", CancellationToken.None);

        // Assert
        var okResult = actionResult.ShouldBeOfType<OkObjectResult>();
        okResult.StatusCode.ShouldBe(StatusCodes.Status200OK);

        var dto = okResult.Value.ShouldBeOfType<WordLookupResponseDto>();
        dto.Term.ShouldBe("in disbelief");
        dto.Phonetic.ShouldBe("/ɪn dɪsbɪˈliːf/");
        dto.TranslationsByPos.ShouldNotBeEmpty();
        dto.ExampleSentences.Count.ShouldBeGreaterThanOrEqualTo(2);
    }

    [Fact]
    public async Task GetByTerm_WithNonExistentTerm_ShouldReturn404NotFoundWithProblemDetails()
    {
        // Act
        var actionResult = await _controller.GetByTerm("unknownphrasehere", CancellationToken.None);

        // Assert
        var objectResult = actionResult.ShouldBeOfType<ObjectResult>();
        objectResult.StatusCode.ShouldBe(StatusCodes.Status404NotFound);

        var problem = objectResult.Value.ShouldBeOfType<ProblemDetails>();
        problem.Status.ShouldBe(StatusCodes.Status404NotFound);
        problem.Title.ShouldBe("Word Not Found");
        problem.Detail.ShouldNotBeNull();
        problem.Detail.ShouldContain("unknownphrasehere");
    }

    [Fact]
    public async Task GetByTerm_WhenGroqThrowsAiServiceUnavailable_MiddlewareShouldReturn503ServiceUnavailable()
    {
        // Arrange
        _fakeGroq.Handler = _ => throw new AiServiceUnavailableException("Failed to communicate with the AI provider (HTTP 401).");

        var context = new DefaultHttpContext();
        context.Request.Path = "/api/Words/strangeness";
        context.Response.Body = new MemoryStream();

        var middleware = new GlobalExceptionHandlerMiddleware(
            async _ => await _controller.GetByTerm("strangeness", CancellationToken.None),
            NullLogger<GlobalExceptionHandlerMiddleware>.Instance);

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Response.StatusCode.ShouldBe(StatusCodes.Status503ServiceUnavailable);
        context.Response.Body.Seek(0, SeekOrigin.Begin);
        var problem = await JsonSerializer.DeserializeAsync<ProblemDetails>(context.Response.Body);
        problem.ShouldNotBeNull();
        problem.Status.ShouldBe(StatusCodes.Status503ServiceUnavailable);
        problem.Title.ShouldBe("AI Service Unavailable");
        problem.Detail.ShouldNotBeNull();
        problem.Detail.ShouldContain("401");
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task GetByTerm_WithEmptyOrWhitespace_ShouldReturn400BadRequestWithProblemDetails(string emptyTerm)
    {
        // Act
        var actionResult = await _controller.GetByTerm(emptyTerm, CancellationToken.None);

        // Assert
        var objectResult = actionResult.ShouldBeOfType<ObjectResult>();
        objectResult.StatusCode.ShouldBe(StatusCodes.Status400BadRequest);

        var problem = objectResult.Value.ShouldBeOfType<ProblemDetails>();
        problem.Status.ShouldBe(StatusCodes.Status400BadRequest);
        problem.Title.ShouldBe("Invalid term");
    }

    [Fact]
    public async Task GetByTerm_WhenTermExceedsMaxLength_ShouldReturn400BadRequestWithProblemDetails()
    {
        // Arrange
        var hugeTerm = new string('a', WordLookupService.MaxTermLength + 1);

        // Act
        var actionResult = await _controller.GetByTerm(hugeTerm, CancellationToken.None);

        // Assert
        var objectResult = actionResult.ShouldBeOfType<ObjectResult>();
        objectResult.StatusCode.ShouldBe(StatusCodes.Status400BadRequest);

        var problem = objectResult.Value.ShouldBeOfType<ProblemDetails>();
        problem.Status.ShouldBe(StatusCodes.Status400BadRequest);
        problem.Title.ShouldBe("Term too long");
        problem.Detail.ShouldNotBeNull();
        problem.Detail.ShouldContain(WordLookupService.MaxTermLength.ToString());
        _fakeGroq.CallCount.ShouldBe(0);
    }

    [Fact]
    public async Task GetMoreSentences_WithValidSeedWord_ShouldReturn200OkWithSentences()
    {
        // Act
        var actionResult = await _controller.GetMoreSentences("in disbelief", new MoreSentencesRequest(), CancellationToken.None);

        // Assert
        var okResult = actionResult.ShouldBeOfType<OkObjectResult>();
        okResult.StatusCode.ShouldBe(StatusCodes.Status200OK);

        var sentences = okResult.Value.ShouldBeOfType<List<SentencePairDto>>();
        sentences.ShouldNotBeNull();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task GetMoreSentences_WithEmptyTerm_ShouldReturn400BadRequest(string invalidTerm)
    {
        // Act
        var actionResult = await _controller.GetMoreSentences(invalidTerm, null, CancellationToken.None);

        // Assert
        var objectResult = actionResult.ShouldBeOfType<ObjectResult>();
        objectResult.StatusCode.ShouldBe(StatusCodes.Status400BadRequest);
    }
}
