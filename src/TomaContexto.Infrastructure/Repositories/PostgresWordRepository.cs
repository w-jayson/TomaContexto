namespace TomaContexto.Infrastructure.Repositories;

using Microsoft.EntityFrameworkCore;
using TomaContexto.Application.Interfaces;
using TomaContexto.Domain.Entities;
using TomaContexto.Infrastructure.Persistence;

public class PostgresWordRepository : IWordRepository
{
    private readonly TomaContextoDbContext _context;

    public PostgresWordRepository(TomaContextoDbContext context)
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
                word.Sentences.Add(incoming);
            }
        }
    }
}
