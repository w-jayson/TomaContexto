namespace TomaSeuContexto.Application.Interfaces;

using TomaSeuContexto.Application.DTOs;

public interface IGroqService
{
    Task<WordLookupResponseDto?> QueryTermAsync(string term, CancellationToken cancellationToken = default);
}
