namespace TomaSeuContexto.UnitTests.Fakes;

using TomaSeuContexto.Application.DTOs;
using TomaSeuContexto.Application.Interfaces;

public class FakeGroqService : IGroqService
{
    public Func<string, Task<WordLookupResponseDto?>>? Handler { get; set; }
    public Func<string, IEnumerable<string>?, Task<List<SentencePairDto>>>? MoreSentencesHandler { get; set; }
    public Func<string, Task<List<string>>>? SynonymsHandler { get; set; }

    public int CallCount { get; private set; }
    public int MoreSentencesCallCount { get; private set; }
    public int SynonymsCallCount { get; private set; }
    public string? LastQueriedTerm { get; private set; }
    public List<string>? LastExistingSentences { get; private set; }

    public Task<WordLookupResponseDto?> QueryTermAsync(string term, CancellationToken cancellationToken = default)
    {
        CallCount++;
        LastQueriedTerm = term;
        return Handler != null
            ? Handler(term)
            : Task.FromResult<WordLookupResponseDto?>(null);
    }

    public Task<List<SentencePairDto>> GenerateMoreSentencesAsync(string term, IEnumerable<string>? existingSentences = null, CancellationToken cancellationToken = default)
    {
        MoreSentencesCallCount++;
        LastQueriedTerm = term;
        LastExistingSentences = existingSentences?.ToList();
        return MoreSentencesHandler != null
            ? MoreSentencesHandler(term, existingSentences)
            : Task.FromResult(new List<SentencePairDto>());
    }

    public Task<List<string>> GetSynonymsAsync(string term, CancellationToken cancellationToken = default)
    {
        SynonymsCallCount++;
        LastQueriedTerm = term;
        return SynonymsHandler != null
            ? SynonymsHandler(term)
            : Task.FromResult(new List<string>());
    }
}
