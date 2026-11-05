namespace TomaSeuContexto.Api.Controllers;

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using TomaSeuContexto.Application.DTOs;
using TomaSeuContexto.Application.Interfaces;
using TomaSeuContexto.Application.Services;

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
    /// Returns autocomplete and spell-correction suggestions from the local vocabulary repository.
    /// </summary>
    [HttpGet("suggestions")]
    [ProducesResponseType(typeof(List<string>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSuggestions([FromQuery] string? q, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Trim().Length < 2 || q.Trim().Length > WordLookupService.MaxTermLength)
        {
            return Ok(new List<string>());
        }

        var suggestions = await _wordLookupService.GetSuggestionsAsync(q, maxResults: 6, cancellationToken);
        return Ok(suggestions);
    }

    /// <summary>
    /// Looks up a vocabulary term and retrieves its phonetic, part-of-speech grouped translations, and contextual sentences.
    /// </summary>
    /// <param name="term">The vocabulary word or multi-word expression.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Word lookup response containing translations and example sentences.</returns>
    [HttpGet("{term}")]
    [EnableRateLimiting("SearchPolicy")]
    [ProducesResponseType(typeof(WordLookupResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status429TooManyRequests)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status503ServiceUnavailable)]
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

        var trimmedTerm = term.Trim();
        if (trimmedTerm.Length > WordLookupService.MaxTermLength)
        {
            return Problem(
                title: "Term too long",
                detail: $"The 'term' parameter must not exceed {WordLookupService.MaxTermLength} characters.",
                statusCode: StatusCodes.Status400BadRequest
            );
        }

        var result = await _wordLookupService.LookupTermAsync(trimmedTerm, cancellationToken);
        if (result is null)
        {
            return Problem(
                title: "Word Not Found",
                detail: $"The term '{trimmedTerm}' was not found in the vocabulary repository.",
                statusCode: StatusCodes.Status404NotFound
            );
        }

        return Ok(result);
    }
}
