namespace TomaContexto.Application.Services;

using TomaContexto.Application.DTOs;
using TomaContexto.Application.Interfaces;
using TomaContexto.Domain.Entities;

public class WordLookupService : IWordLookupService
{
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

        // 1. Check local repository (Cache hit)
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

        // 4. Combine existing database sentences with new sentences from Groq (avoiding duplicates)
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
                    SentencePt = s.Pt.Trim()
                });
            }
        }

        // 5. Cache the newly discovered word in local repository for future instant lookups
        var wordId = Guid.NewGuid();
        var wordEntity = new Word
        {
            Id = wordId,
            Term = groqResult.Term,
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
            .ToList();

        return new WordLookupResponseDto(
            word.Term,
            word.Phonetic,
            translationsByPos,
            exampleSentences
        );
    }
}
