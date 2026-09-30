namespace TomaContexto.Application.Interfaces;

using TomaContexto.Domain.Entities;

public interface IWordRepository
{
    Task<Word?> GetByTermAsync(string term, CancellationToken cancellationToken = default);
    Task AddAsync(Word word, CancellationToken cancellationToken = default);
    Task<List<Sentence>> FindSentencesContainingTermAsync(string term, CancellationToken cancellationToken = default);
}
