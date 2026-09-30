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

    public async Task AddAsync(Word word, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(word);

        if (string.IsNullOrWhiteSpace(word.Term))
        {
            throw new ArgumentException("Word term cannot be empty or whitespace.", nameof(word));
        }

        word.Term = word.Term.Trim().ToLowerInvariant();

        var exists = await _context.Words.AnyAsync(w => w.Term == word.Term, cancellationToken);
        if (exists)
        {
            return;
        }

        await _context.Words.AddAsync(word, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
