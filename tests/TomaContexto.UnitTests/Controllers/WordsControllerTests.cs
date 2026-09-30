namespace TomaContexto.UnitTests.Controllers;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Shouldly;
using TomaContexto.Api.Controllers;
using TomaContexto.Application.DTOs;
using TomaContexto.Application.Services;
using TomaContexto.Infrastructure.Repositories;
using TomaContexto.UnitTests.Fakes;
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
}
