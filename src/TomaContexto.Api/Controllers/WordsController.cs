namespace TomaContexto.Api.Controllers;

using Microsoft.AspNetCore.Mvc;
using TomaContexto.Application.DTOs;
using TomaContexto.Application.Interfaces;

[ApiController]
[Route("api/[controller]")]
public class WordsController : ControllerBase
{
    private readonly IWordLookupService _wordLookupService;

    public WordsController(IWordLookupService wordLookupService)
    {
        _wordLookupService = wordLookupService;
    }

    /// <summary>
    /// Looks up a vocabulary term and retrieves its phonetic, part-of-speech grouped translations, and contextual sentences.
    /// </summary>
    /// <param name="term">The vocabulary word or multi-word expression.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Word lookup response containing translations and example sentences.</returns>
    [HttpGet("{term}")]
    [ProducesResponseType(typeof(WordLookupResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetByTerm([FromRoute] string term, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(term))
        {
            return Problem(
                title: "Invalid term",
                detail: "The 'term' parameter must not be empty or whitespace.",
                statusCode: StatusCodes.Status400BadRequest
            );
        }

        var result = await _wordLookupService.LookupTermAsync(term, cancellationToken);
        if (result is null)
        {
            return Problem(
                title: "Word Not Found",
                detail: $"The term '{term.Trim()}' was not found in the vocabulary repository.",
                statusCode: StatusCodes.Status404NotFound
            );
        }

        return Ok(result);
    }
}
