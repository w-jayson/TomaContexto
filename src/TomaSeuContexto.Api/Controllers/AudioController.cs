namespace TomaSeuContexto.Api.Controllers;

using Microsoft.AspNetCore.Mvc;
using TomaSeuContexto.Application.Interfaces;

[ApiController]
[Route("api/[controller]")]
public class AudioController : ControllerBase
{
    private const int MaxAudioTextLength = 300;
    private readonly ITtsService _ttsService;

    public AudioController(ITtsService ttsService)
    {
        _ttsService = ttsService;
    }

    /// <summary>
    /// Returns high-fidelity MP3 audio for a given word or contextual sentence,
    /// serving from the local VPS cache or synthesizing via Google Cloud Neural2 TTS.
    /// </summary>
    /// <param name="text">The text to speak.</param>
    /// <param name="type">Type of speech ('word' or 'sentence').</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    [HttpGet("synthesize")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> Synthesize(
        [FromQuery] string? text,
        [FromQuery] string type = "sentence",
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid Text",
                Detail = "The 'text' query parameter must not be empty.",
                Status = StatusCodes.Status400BadRequest
            });
        }

        var trimmed = text.Trim();
        if (trimmed.Length > MaxAudioTextLength)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Text Too Long",
                Detail = $"The 'text' parameter must not exceed {MaxAudioTextLength} characters.",
                Status = StatusCodes.Status400BadRequest
            });
        }

        var audioStream = await _ttsService.GetOrSynthesizeAudioAsync(trimmed, type, cancellationToken);
        if (audioStream is null)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new ProblemDetails
            {
                Title = "Audio Synthesis Unavailable",
                Detail = "Server-side TTS is not configured or unavailable. Use client-side fallback.",
                Status = StatusCodes.Status503ServiceUnavailable
            });
        }

        // Cache aggressively: audio for words/sentences is immutable
        Response.Headers.CacheControl = "public, max-age=31536000, immutable";
        return File(audioStream, "audio/mpeg", enableRangeProcessing: true);
    }
}
