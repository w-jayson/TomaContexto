namespace TomaSeuContexto.Application.Services;

using TomaSeuContexto.Application.DTOs;
using TomaSeuContexto.Application.Interfaces;
using TomaSeuContexto.Domain.Entities;

public class WordLookupService : IWordLookupService
{
    public const int MaxTermLength = 80;

    private readonly IWordRepository _wordRepository;
    private readonly IGroqService _groqService;

    public WordLookupService(IWordRepository wordRepository, IGroqService groqService)
    {
        _wordRepository = wordRepository;
        _groqService = groqService;
    }

    public async Task<WordLookupResponseDto?> LookupTermAsync(string rawTerm, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(rawTerm))
        {
            return null;
        }

        var normalizedTerm = rawTerm.Trim().ToLowerInvariant();
        if (normalizedTerm.Length > MaxTermLength)
        {
            return null;
        }

        // 1. Check local repository (Exact cache hit)
        var cachedWord = await _wordRepository.GetByTermAsync(normalizedTerm, cancellationToken);
        if (cachedWord is not null)
        {
            return MapToResponseDto(cachedWord);
        }

        // 2. Search for existing sentences in repository that already contain the term
        var existingSentences = await _wordRepository.FindSentencesContainingTermAsync(normalizedTerm, cancellationToken);

        // 3. Query external Groq LLM as fallback (Cache miss)
        var groqResult = await _groqService.QueryTermAsync(normalizedTerm, cancellationToken);
        if (groqResult is null)
        {
            return null;
        }

        // If Groq tried to silently substitute a different word (e.g. "apple" for "aple"), reject silent substitution
        var resolvedTerm = groqResult.Term.Trim().ToLowerInvariant();
        if (!string.Equals(resolvedTerm, normalizedTerm, StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        // 5. Combine existing database sentences with new sentences from Groq (avoiding duplicates)
        var resolvedSentences = new List<Sentence>(existingSentences);
        foreach (var s in groqResult.ExampleSentences)
        {
            var trimmedEn = s.En.Trim();
            if (!resolvedSentences.Any(existing => existing.SentenceEn.Trim().Equals(trimmedEn, StringComparison.OrdinalIgnoreCase)))
            {
                resolvedSentences.Add(new Sentence
                {
                    Id = Guid.NewGuid(),
                    SentenceEn = trimmedEn,
                    SentencePt = s.Pt.Trim(),
                CreatedAt = DateTime.UtcNow
                });
            }
        }

        // 6. Cache the newly discovered word in local repository for future instant lookups
        var wordId = Guid.NewGuid();
        var wordEntity = new Word
        {
            Id = wordId,
            Term = resolvedTerm,
            Phonetic = groqResult.Phonetic,
            CreatedAt = DateTime.UtcNow,
            Translations = groqResult.TranslationsByPos
                .SelectMany(group => group.Translations.Select(t => new WordTranslation
                {
                    Id = Guid.NewGuid(),
                    WordId = wordId,
                    PartOfSpeech = group.PartOfSpeech,
                    Translation = t
                }))
                .ToList(),
            Sentences = resolvedSentences
        };

        await _wordRepository.AddAsync(wordEntity, cancellationToken);

        return MapToResponseDto(wordEntity);
    }

    public async Task<List<string>> GetSuggestionsAsync(string query, int maxResults = 6, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(query) || query.Trim().Length > MaxTermLength)
        {
            return new List<string>();
        }

        return await _wordRepository.GetSuggestionsAsync(query.Trim(), maxResults, cancellationToken);
    }

    public async Task<List<SentencePairDto>> GetMoreSentencesAsync(
        string rawTerm,
        IEnumerable<string>? existingSentences = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(rawTerm))
        {
            return new List<SentencePairDto>();
        }

        var normalizedTerm = rawTerm.Trim().ToLowerInvariant();
        if (normalizedTerm.Length > MaxTermLength)
        {
            return new List<SentencePairDto>();
        }

        var existingList = (existingSentences ?? Enumerable.Empty<string>())
            .Select(s => s.Trim())
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        // 1. Check if the word is already cached in local repository
        var cachedWord = await _wordRepository.GetByTermAsync(normalizedTerm, cancellationToken);

        // 2. Identify unserved sentences already stored in the local cache
        var unservedFromCache = new List<SentencePairDto>();
        if (cachedWord is not null)
        {
            unservedFromCache = cachedWord.Sentences
                .Where(s => !existingList.Any(existing => existing.Equals(s.SentenceEn.Trim(), StringComparison.OrdinalIgnoreCase)))
                .Select(s => new SentencePairDto(s.SentenceEn, s.SentencePt))
                .ToList();

            // If we have at least 4 unserved sentences in the local repository, serve them immediately!
            if (unservedFromCache.Count >= 4)
            {
                return unservedFromCache.Take(4).ToList();
            }
        }

        // 3. Call Groq with all known sentences to generate a new batch of 4 unique contextual sentences
        var allKnownSentences = existingList
            .Concat(cachedWord?.Sentences.Select(s => s.SentenceEn.Trim()) ?? Enumerable.Empty<string>())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var generated = await _groqService.GenerateMoreSentencesAsync(normalizedTerm, allKnownSentences, cancellationToken);
        if (generated is null || generated.Count == 0)
        {
            return unservedFromCache;
        }

        // Filter against all known sentences
        var newSentences = generated
            .Where(g => !allKnownSentences.Any(k => k.Equals(g.En.Trim(), StringComparison.OrdinalIgnoreCase)))
            .DistinctBy(g => g.En.Trim(), StringComparer.OrdinalIgnoreCase)
            .ToList();

        // 4. Save newly generated sentences to the database cache for the word
        if (cachedWord is not null && newSentences.Count > 0)
        {
            var sentencesToAdd = newSentences.Select(s => new Sentence
            {
                Id = Guid.NewGuid(),
                SentenceEn = s.En.Trim(),
                SentencePt = s.Pt.Trim(),
                CreatedAt = DateTime.UtcNow
            }).ToList();

            await _wordRepository.AddAsync(new Word
            {
                Id = cachedWord.Id,
                Term = cachedWord.Term,
                Phonetic = cachedWord.Phonetic,
                CreatedAt = cachedWord.CreatedAt,
                Translations = cachedWord.Translations,
                Sentences = sentencesToAdd
            }, cancellationToken);
        }

        // Combine any unserved sentences with new sentences
        if (unservedFromCache.Count > 0)
        {
            var combined = unservedFromCache
                .Concat(newSentences)
                .DistinctBy(s => s.En.Trim(), StringComparer.OrdinalIgnoreCase)
                .Take(4)
                .ToList();

            return combined;
        }

        return newSentences.Take(4).ToList();
    }

    private static WordLookupResponseDto MapToResponseDto(Word word)
    {
        var translationsByPos = word.Translations
            .GroupBy(t => t.PartOfSpeech, StringComparer.OrdinalIgnoreCase)
            .Select(g => new TranslationGroupDto(
                g.Key,
                g.Select(t => t.Translation).Distinct().ToList()
            ))
            .ToList();

        var exampleSentences = word.Sentences
            .Select(s => new SentencePairDto(s.SentenceEn, s.SentencePt))
            .Take(4)
            .ToList();

        return new WordLookupResponseDto(
            word.Term,
            word.Phonetic,
            translationsByPos,
            exampleSentences
        );
    }
}
