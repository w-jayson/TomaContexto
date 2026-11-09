namespace TomaSeuContexto.Infrastructure.Repositories;

using Microsoft.EntityFrameworkCore;
using TomaSeuContexto.Application.Common;
using TomaSeuContexto.Application.Interfaces;
using TomaSeuContexto.Domain.Entities;
using TomaSeuContexto.Infrastructure.Persistence;

public class PostgresWordRepository : IWordRepository
{
    private readonly TomaSeuContextoDbContext _context;

    public PostgresWordRepository(TomaSeuContextoDbContext context)
    {
        _context = context;
    }

    public async Task<Word?> GetByTermAsync(string term, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(term))
        {
            return null;
        }

        var normalizedTerm = term.Trim().ToLowerInvariant();

        return await _context.Words
            .Include(w => w.Translations)
            .Include(w => w.Sentences)
            .AsSplitQuery()
            .AsNoTracking()
            .FirstOrDefaultAsync(w => w.Term == normalizedTerm, cancellationToken);
    }

    public async Task<Word?> FindClosestByTermAsync(string term, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(term))
        {
            return null;
        }

        var cleanTerm = term.Trim().ToLowerInvariant();
        var maxDistance = FuzzyMatcher.GetMaxAllowedDistance(cleanTerm);
        if (maxDistance <= 0)
        {
            return null;
        }

        var minLen = Math.Max(1, cleanTerm.Length - maxDistance);
        var maxLen = cleanTerm.Length + maxDistance;

        var candidates = await _context.Words
            .AsNoTracking()
            .Where(w => w.Term.Length >= minLen && w.Term.Length <= maxLen)
            .Select(w => w.Term)
            .ToListAsync(cancellationToken);

        var bestTerm = candidates
            .Select(t => new { Term = t, Distance = FuzzyMatcher.ComputeDistance(cleanTerm, t) })
            .Where(x => x.Distance <= maxDistance)
            .OrderBy(x => x.Distance)
            .ThenBy(x => Math.Abs(x.Term.Length - cleanTerm.Length))
            .Select(x => x.Term)
            .FirstOrDefault();

        if (bestTerm is null)
        {
            return null;
        }

        return await GetByTermAsync(bestTerm, cancellationToken);
    }

    public async Task<List<string>> GetSuggestionsAsync(string query, int maxResults = 6, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(query) || query.Trim().Length < 2)
        {
            return new List<string>();
        }

        var cleanQuery = query.Trim().ToLowerInvariant();
        var maxDistance = Math.Max(1, FuzzyMatcher.GetMaxAllowedDistance(cleanQuery));

        var prefixMatches = await _context.Words
            .AsNoTracking()
            .Where(w => EF.Functions.ILike(w.Term, $"{cleanQuery}%"))
            .OrderBy(w => w.Term.Length)
            .ThenBy(w => w.Term)
            .Take(maxResults)
            .Select(w => w.Term)
            .ToListAsync(cancellationToken);

        if (prefixMatches.Count >= maxResults)
        {
            return prefixMatches;
        }

        var minLen = Math.Max(2, cleanQuery.Length - maxDistance);
        var maxLen = cleanQuery.Length + maxDistance + 3;

        var fuzzyCandidates = await _context.Words
            .AsNoTracking()
            .Where(w => w.Term.Length >= minLen && w.Term.Length <= maxLen)
            .Select(w => w.Term)
            .ToListAsync(cancellationToken);

        var fuzzyMatches = fuzzyCandidates
            .Where(t => !prefixMatches.Contains(t, StringComparer.OrdinalIgnoreCase))
            .Select(t => new { Term = t, Distance = FuzzyMatcher.ComputeDistance(cleanQuery, t) })
            .Where(x => x.Distance <= maxDistance)
            .OrderBy(x => x.Distance)
            .ThenBy(x => Math.Abs(x.Term.Length - cleanQuery.Length))
            .Select(x => x.Term);

        return prefixMatches
            .Concat(fuzzyMatches)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(maxResults)
            .ToList();
    }

    public async Task<List<Sentence>> FindSentencesContainingTermAsync(string term, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(term))
        {
            return new List<Sentence>();
        }

        var cleanTerm = term.Trim().ToLowerInvariant();

        // Search for sentences in the repository that contain the term (case-insensitive)
        return await _context.Sentences
            .AsNoTracking()
            .Where(s => EF.Functions.ILike(s.SentenceEn, $"%{cleanTerm}%"))
            .Take(10)
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(Word word, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(word);

        if (string.IsNullOrWhiteSpace(word.Term))
        {
            throw new ArgumentException("Word term cannot be empty or whitespace.", nameof(word));
        }

        word.Term = word.Term.Trim().ToLowerInvariant();

        var existingWord = await _context.Words
            .Include(w => w.Sentences)
            .FirstOrDefaultAsync(w => w.Term == word.Term, cancellationToken);

        if (existingWord is not null)
        {
            // If the word already exists, ensure any new sentences are attached
            await AttachSentencesAsync(existingWord, word.Sentences, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);
            return;
        }

        // Deduplicate sentences against the global Sentences table
        var resolvedSentences = new List<Sentence>();
        foreach (var incomingSentence in word.Sentences)
        {
            var normalizedEn = incomingSentence.SentenceEn.Trim();

            var existingDbSentence = await _context.Sentences
                .FirstOrDefaultAsync(s => s.SentenceEn.ToLower() == normalizedEn.ToLower(), cancellationToken);

            if (existingDbSentence is not null)
            {
                resolvedSentences.Add(existingDbSentence);
            }
            else
            {
                if (incomingSentence.Id == Guid.Empty)
                {
                    incomingSentence.Id = Guid.NewGuid();
                }
                if (incomingSentence.CreatedAt == default)
                {
                    incomingSentence.CreatedAt = DateTime.UtcNow;
                }

                await _context.Sentences.AddAsync(incomingSentence, cancellationToken);
                resolvedSentences.Add(incomingSentence);
            }
        }

        word.Sentences = resolvedSentences;

        await _context.Words.AddAsync(word, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
    }

    private async Task AttachSentencesAsync(Word word, IEnumerable<Sentence> newSentences, CancellationToken cancellationToken)
    {
        foreach (var incoming in newSentences)
        {
            var normalizedEn = incoming.SentenceEn.Trim();

            if (word.Sentences.Any(s => s.SentenceEn.Equals(normalizedEn, StringComparison.OrdinalIgnoreCase)))
            {
                continue;
            }

            var existingDbSentence = await _context.Sentences
                .FirstOrDefaultAsync(s => s.SentenceEn.ToLower() == normalizedEn.ToLower(), cancellationToken);

            if (existingDbSentence is not null)
            {
                word.Sentences.Add(existingDbSentence);
            }
            else
            {
                if (incoming.Id == Guid.Empty)
                {
                    incoming.Id = Guid.NewGuid();
                }
                if (incoming.CreatedAt == default)
                {
                    incoming.CreatedAt = DateTime.UtcNow;
                }

                await _context.Sentences.AddAsync(incoming, cancellationToken);
                word.Sentences.Add(incoming);
            }
        }
    }
}
