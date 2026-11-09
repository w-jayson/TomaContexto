namespace TomaSeuContexto.Application.Interfaces;

using TomaSeuContexto.Application.DTOs;

public interface IGroqService
{
    Task<WordLookupResponseDto?> QueryTermAsync(string term, CancellationToken cancellationToken = default);
    Task<List<SentencePairDto>> GenerateMoreSentencesAsync(string term, IEnumerable<string>? existingSentences = null, CancellationToken cancellationToken = default);
}
