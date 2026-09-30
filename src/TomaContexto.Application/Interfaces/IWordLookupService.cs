namespace TomaContexto.Application.Interfaces;

using TomaContexto.Application.DTOs;

public interface IWordLookupService
{
    Task<WordLookupResponseDto?> LookupTermAsync(string rawTerm, CancellationToken cancellationToken = default);
}
