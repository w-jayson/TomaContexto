namespace TomaContexto.Application.Interfaces;

using TomaContexto.Application.DTOs;

public interface IGroqService
{
    Task<WordLookupResponseDto?> QueryTermAsync(string term, CancellationToken cancellationToken = default);
}
