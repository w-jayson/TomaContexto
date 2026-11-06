namespace TomaSeuContexto.Application.Interfaces;

public interface ITtsService
{
    /// <summary>
    /// Retrieves a cached MP3 stream from local VPS storage or synthesizes it via Google Cloud Neural2 TTS.
    /// Returns null if Google TTS is not configured or if synthesis fails.
    /// </summary>
    /// <param name="text">The word or sentence to pronounce.</param>
    /// <param name="type">Either 'word' or 'sentence'.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task<Stream?> GetOrSynthesizeAudioAsync(string text, string type, CancellationToken cancellationToken = default);

    /// <summary>
    /// Checks whether an audio file is already cached on local storage.
    /// </summary>
    bool IsAudioCached(string text, string type);
}
