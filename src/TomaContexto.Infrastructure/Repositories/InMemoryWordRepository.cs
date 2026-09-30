namespace TomaContexto.Infrastructure.Repositories;

using System.Collections.Concurrent;
using TomaContexto.Application.Interfaces;
using TomaContexto.Domain.Entities;
using TomaContexto.Infrastructure.MockData;

public class InMemoryWordRepository : IWordRepository
{
    private readonly ConcurrentDictionary<string, Word> _words = new();

    public InMemoryWordRepository(bool populateSeeds = true)
    {
        if (populateSeeds)
        {
            foreach (var seed in WordSeedData.GetSeeds())
            {
                var normalizedKey = Normalize(seed.Term);
                _words.TryAdd(normalizedKey, seed);
            }
        }
    }

    public Task<Word?> GetByTermAsync(string term, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(term))
        {
            return Task.FromResult<Word?>(null);
        }

        var normalizedKey = Normalize(term);
        _words.TryGetValue(normalizedKey, out var word);
        return Task.FromResult(word);
    }

    public Task AddAsync(Word word, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(word);

        if (string.IsNullOrWhiteSpace(word.Term))
        {
            throw new ArgumentException("Word term cannot be empty or whitespace.", nameof(word));
        }

        var normalizedKey = Normalize(word.Term);
        _words.AddOrUpdate(normalizedKey, word, (_, _) => word);
        return Task.CompletedTask;
    }

    private static string Normalize(string term) => term.Trim().ToLowerInvariant();
}
