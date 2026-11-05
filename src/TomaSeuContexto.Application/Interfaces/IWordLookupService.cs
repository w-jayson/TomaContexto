namespace TomaSeuContexto.Application.Interfaces;

using TomaSeuContexto.Application.DTOs;

public interface IWordLookupService
{
    Task<WordLookupResponseDto?> LookupTermAsync(string rawTerm, CancellationToken cancellationToken = default);
    Task<List<string>> GetSuggestionsAsync(string query, int maxResults = 6, CancellationToken cancellationToken = default);
}
