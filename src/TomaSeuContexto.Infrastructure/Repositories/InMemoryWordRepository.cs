namespace TomaSeuContexto.Infrastructure.Repositories;

using System.Collections.Concurrent;
using TomaSeuContexto.Application.Common;
using TomaSeuContexto.Application.Interfaces;
using TomaSeuContexto.Domain.Entities;
using TomaSeuContexto.Infrastructure.MockData;

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

    public Task<Word?> FindClosestByTermAsync(string term, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(term))
        {
            return Task.FromResult<Word?>(null);
        }

        var cleanTerm = Normalize(term);
        var maxDistance = FuzzyMatcher.GetMaxAllowedDistance(cleanTerm);
        if (maxDistance <= 0)
        {
            return Task.FromResult<Word?>(null);
        }

        var bestMatch = _words.Values
            .Select(w => new { Word = w, Distance = FuzzyMatcher.ComputeDistance(cleanTerm, w.Term) })
            .Where(x => x.Distance <= maxDistance)
            .OrderBy(x => x.Distance)
            .ThenBy(x => Math.Abs(x.Word.Term.Length - cleanTerm.Length))
            .Select(x => x.Word)
            .FirstOrDefault();

        return Task.FromResult(bestMatch);
    }

    public Task<List<string>> GetSuggestionsAsync(string query, int maxResults = 6, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(query) || query.Trim().Length < 2)
        {
            return Task.FromResult(new List<string>());
        }

        var cleanQuery = Normalize(query);
        var maxDistance = Math.Max(1, FuzzyMatcher.GetMaxAllowedDistance(cleanQuery));

        var suggestions = _words.Values
            .Select(w => w.Term)
            .Select(term =>
            {
                var startsWith = term.StartsWith(cleanQuery, StringComparison.OrdinalIgnoreCase);
                var contains = !startsWith && term.Contains(cleanQuery, StringComparison.OrdinalIgnoreCase);
                var distance = FuzzyMatcher.ComputeDistance(cleanQuery, term);
                var isFuzzyMatch = distance <= maxDistance;

                var rank = startsWith ? 0
                    : isFuzzyMatch ? 1 + distance
                    : contains ? 5
                    : int.MaxValue;

                return new { Term = term, Rank = rank, Distance = distance };
            })
            .Where(x => x.Rank < int.MaxValue)
            .OrderBy(x => x.Rank)
            .ThenBy(x => Math.Abs(x.Term.Length - cleanQuery.Length))
            .ThenBy(x => x.Term)
            .Take(maxResults)
            .Select(x => x.Term)
            .ToList();

        return Task.FromResult(suggestions);
    }

    public Task<List<Sentence>> FindSentencesContainingTermAsync(string term, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(term))
        {
            return Task.FromResult(new List<Sentence>());
        }

        var cleanTerm = term.Trim().ToLowerInvariant();

        var matched = _words.Values
            .SelectMany(w => w.Sentences)
            .Where(s => s.SentenceEn.ToLowerInvariant().Contains(cleanTerm))
            .DistinctBy(s => s.SentenceEn.Trim().ToLowerInvariant())
            .Take(10)
            .ToList();

        return Task.FromResult(matched);
    }

    public Task AddAsync(Word word, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(word);

        if (string.IsNullOrWhiteSpace(word.Term))
        {
            throw new ArgumentException("Word term cannot be empty or whitespace.", nameof(word));
        }

        var normalizedKey = Normalize(word.Term);
        _words.AddOrUpdate(normalizedKey, word, (_, existing) =>
        {
            if (word.Sentences != null)
            {
                foreach (var incoming in word.Sentences)
                {
                    var normalizedEn = incoming.SentenceEn.Trim();
                    if (!existing.Sentences.Any(s => s.SentenceEn.Trim().Equals(normalizedEn, StringComparison.OrdinalIgnoreCase)))
                    {
                        existing.Sentences.Add(incoming);
                    }
                }
            }
            return existing;
        });
        return Task.CompletedTask;
    }

    private static string Normalize(string term) => term.Trim().ToLowerInvariant();
}
