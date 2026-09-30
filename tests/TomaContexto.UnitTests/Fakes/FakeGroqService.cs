namespace TomaContexto.UnitTests.Fakes;

using TomaContexto.Application.DTOs;
using TomaContexto.Application.Interfaces;

public class FakeGroqService : IGroqService
{
    public Func<string, Task<WordLookupResponseDto?>>? Handler { get; set; }
    public int CallCount { get; private set; }
    public string? LastQueriedTerm { get; private set; }

    public Task<WordLookupResponseDto?> QueryTermAsync(string term, CancellationToken cancellationToken = default)
    {
        CallCount++;
        LastQueriedTerm = term;
        return Handler != null
            ? Handler(term)
            : Task.FromResult<WordLookupResponseDto?>(null);
    }
}
