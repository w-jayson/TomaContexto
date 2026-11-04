namespace TomaSeuContexto.Application.Interfaces;

using TomaSeuContexto.Application.DTOs;

public interface IWordLookupService
{
    Task<WordLookupResponseDto?> LookupTermAsync(string rawTerm, CancellationToken cancellationToken = default);
}
