namespace TomaSeuContexto.UnitTests.Application;

using Shouldly;
using TomaSeuContexto.Application.DTOs;
using TomaSeuContexto.Application.Services;
using TomaSeuContexto.Domain.Entities;
using TomaSeuContexto.Infrastructure.Repositories;
using TomaSeuContexto.UnitTests.Fakes;
using Xunit;

public class WordLookupServiceTests
{
    private readonly InMemoryWordRepository _repository;
    private readonly FakeGroqService _fakeGroq;
    private readonly WordLookupService _service;

    public WordLookupServiceTests()
    {
        _repository = new InMemoryWordRepository(populateSeeds: true);
        _fakeGroq = new FakeGroqService();
        _service = new WordLookupService(_repository, _fakeGroq);
    }

    [Theory]
    [InlineData("in disbelief")]
    [InlineData(" In Disbelief  ")]
    [InlineData("IN DISBELIEF")]
    [InlineData("  in DisBelief ")]
    public async Task LookupTermAsync_ShouldNormalizeCaseAndWhitespace_ProducingIdenticalLookups(string input)
    {
        // Act
        var result = await _service.LookupTermAsync(input);

        // Assert
        result.ShouldNotBeNull();
        result.Term.ShouldBe("in disbelief");
        result.Phonetic.ShouldBe("/ɪn dɪsbɪˈliːf/");
        result.TranslationsByPos.ShouldNotBeEmpty();
        result.ExampleSentences.ShouldNotBeEmpty();
        _fakeGroq.CallCount.ShouldBe(0); // Cache hit, Groq should not be invoked
    }

    [Fact]
    public async Task LookupTermAsync_ShouldGroupTranslationsByPartOfSpeech()
    {
        // Arrange
        var testWordId = Guid.NewGuid();
        var customWord = new Word
        {
            Id = testWordId,
            Term = "polysemy",
            Phonetic = "/pəˈlɪsəmi/",
            Translations = new List<WordTranslation>
            {
                new() { Id = Guid.NewGuid(), WordId = testWordId, PartOfSpeech = "Noun", Translation = "polissemia" },
                new() { Id = Guid.NewGuid(), WordId = testWordId, PartOfSpeech = "Noun", Translation = "multiplicidade de sentidos" },
                new() { Id = Guid.NewGuid(), WordId = testWordId, PartOfSpeech = "Adjective", Translation = "polissêmico" }
            },
            Sentences = new List<Sentence>
            {
                new() { Id = Guid.NewGuid(), SentenceEn = "Polysemy is common in English.", SentencePt = "Polissemia é comum em inglês." }
            }
        };

        await _repository.AddAsync(customWord);

        // Act
        var result = await _service.LookupTermAsync("polysemy");

        // Assert
        result.ShouldNotBeNull();
        result.TranslationsByPos.Count.ShouldBe(2);

        var nounGroup = result.TranslationsByPos.FirstOrDefault(g => g.PartOfSpeech.Equals("Noun", StringComparison.OrdinalIgnoreCase));
        nounGroup.ShouldNotBeNull();
        nounGroup.Translations.ShouldContain("polissemia");
        nounGroup.Translations.ShouldContain("multiplicidade de sentidos");
        nounGroup.Translations.Count.ShouldBe(2);

        var adjGroup = result.TranslationsByPos.FirstOrDefault(g => g.PartOfSpeech.Equals("Adjective", StringComparison.OrdinalIgnoreCase));
        adjGroup.ShouldNotBeNull();
        adjGroup.Translations.ShouldContain("polissêmico");
        adjGroup.Translations.Count.ShouldBe(1);
    }

    [Fact]
    public async Task LookupTermAsync_WhenNotInRepository_ShouldCallGroqAndCacheResult()
    {
        // Arrange
        var groqDto = new WordLookupResponseDto(
            "strangeness",
            "/ˈstreɪndʒ.nəs/",
            new List<TranslationGroupDto>
            {
                new("Substantivo", new List<string> { "estranheza", "singularidade" })
            },
            new List<SentencePairDto>
            {
                new("There was a strange sense of strangeness in the room.", "Havia uma estranha sensação de estranheza na sala.")
            }
        );

        _fakeGroq.Handler = term => Task.FromResult<WordLookupResponseDto?>(groqDto);

        // Act 1: Initial query (Cache miss)
        var result1 = await _service.LookupTermAsync("  Strangeness ");

        // Assert 1
        result1.ShouldNotBeNull();
        result1.Term.ShouldBe("strangeness");
        result1.Phonetic.ShouldBe("/ˈstreɪndʒ.nəs/");
        _fakeGroq.CallCount.ShouldBe(1);
        _fakeGroq.LastQueriedTerm.ShouldBe("strangeness");

        // Act 2: Subsequent query for same term (Cache hit)
        var result2 = await _service.LookupTermAsync("strangeness");

        // Assert 2
        result2.ShouldNotBeNull();
        result2.Term.ShouldBe("strangeness");
        _fakeGroq.CallCount.ShouldBe(1); // Groq was NOT called again because it was cached

        var cachedInRepo = await _repository.GetByTermAsync("strangeness");
        cachedInRepo.ShouldNotBeNull();
        cachedInRepo.Term.ShouldBe("strangeness");
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null!)]
    public async Task LookupTermAsync_WithNullOrWhitespace_ShouldReturnNull(string? rawTerm)
    {
        // Act
        var result = await _service.LookupTermAsync(rawTerm!);

        // Assert
        result.ShouldBeNull();
        _fakeGroq.CallCount.ShouldBe(0);
    }

    [Fact]
    public async Task LookupTermAsync_WhenTermExceedsMaxLength_ShouldReturnNullWithoutCallingGroq()
    {
        // Arrange
        var oversizedTerm = new string('x', WordLookupService.MaxTermLength + 1);

        // Act
        var result = await _service.LookupTermAsync(oversizedTerm);

        // Assert
        result.ShouldBeNull();
        _fakeGroq.CallCount.ShouldBe(0);
    }

    [Fact]
    public async Task LookupTermAsync_WithNonExistentTerm_WhenGroqReturnsNull_ShouldReturnNull()
    {
        // Arrange
        _fakeGroq.Handler = _ => Task.FromResult<WordLookupResponseDto?>(null);

        // Act
        var result = await _service.LookupTermAsync("definitelynotrealterm12345");

        // Assert
        result.ShouldBeNull();
        _fakeGroq.CallCount.ShouldBe(1);
    }

    [Fact]
    public async Task LookupTermAsync_WhenExistingSentencesContainTerm_ShouldAutomaticallyLinkAndMergeThem()
    {
        // Arrange
        // The seeds contain the sentence: "She stared at the test results in disbelief." (under 'in disbelief')
        // Now suppose the user looks up "stared", which is not yet cached.
        var groqDto = new WordLookupResponseDto(
            "stared",
            "/stɛərd/",
            new List<TranslationGroupDto>
            {
                new("Verb", new List<string> { "olhou fixamente", "encarou" })
            },
            new List<SentencePairDto>
            {
                new("He stared into the distance thinking about his future.", "Ele olhou fixamente para a distância pensando no seu futuro.")
            }
        );

        _fakeGroq.Handler = term => Task.FromResult<WordLookupResponseDto?>(groqDto);

        // Act
        var result = await _service.LookupTermAsync("stared");

        // Assert
        result.ShouldNotBeNull();
        result.Term.ShouldBe("stared");
        // Result should include BOTH the existing sentence found in the DB and the new sentence from Groq!
        result.ExampleSentences.Count.ShouldBe(2);
        result.ExampleSentences.ShouldContain(s => s.En.Contains("She stared at the test results in disbelief."));
        result.ExampleSentences.ShouldContain(s => s.En.Contains("He stared into the distance thinking about his future."));

        // Verify it was cached with both sentences linked
        var cached = await _repository.GetByTermAsync("stared");
        cached.ShouldNotBeNull();
        cached.Sentences.Count.ShouldBe(2);
    }

    [Fact]
    public async Task LookupTermAsync_WhenGroqSubstitutesDifferentWordForTypo_ShouldReturnNullInsteadOfAutoCorrecting()
    {
        // Arrange
        _fakeGroq.Handler = _ => Task.FromResult<WordLookupResponseDto?>(new WordLookupResponseDto(
            "apple",
            "/ˈæp.əl/",
            new List<TranslationGroupDto> { new("Substantivo", new List<string> { "maçã" }) },
            new List<SentencePairDto> { new("An apple a day.", "Uma maçã por dia.") }
        ));

        // Act
        var result = await _service.LookupTermAsync("aple");

        // Assert
        result.ShouldBeNull();
    }

    [Fact]
    public async Task GetSuggestionsAsync_WithTypoOrPrefix_ShouldReturnMatchingCachedWords()
    {
        // Arrange
        var appleId = Guid.NewGuid();
        await _repository.AddAsync(new Word
        {
            Id = appleId,
            Term = "apple",
            Phonetic = "/ˈæp.əl/"
        });

        // Act
        var typoSuggestions = await _service.GetSuggestionsAsync("aple");
        var prefixSuggestions = await _service.GetSuggestionsAsync("break");

        // Assert
        typoSuggestions.ShouldContain("apple");
        prefixSuggestions.ShouldContain("breakthrough");
    }

    [Fact]
    public async Task GetMoreSentencesAsync_WhenCacheHasUnservedSentences_ShouldReturnThemWithoutCallingGroq()
    {
        // Arrange
        var testWordId = Guid.NewGuid();
        var word = new Word
        {
            Id = testWordId,
            Term = "clarity",
            Phonetic = "/ˈklær.ə.ti/",
            Translations = new List<WordTranslation>
            {
                new() { Id = Guid.NewGuid(), WordId = testWordId, PartOfSpeech = "Noun", Translation = "clareza" }
            },
            Sentences = new List<Sentence>
            {
                new() { Id = Guid.NewGuid(), SentenceEn = "Sentence 1", SentencePt = "Frase 1" },
                new() { Id = Guid.NewGuid(), SentenceEn = "Sentence 2", SentencePt = "Frase 2" },
                new() { Id = Guid.NewGuid(), SentenceEn = "Sentence 3", SentencePt = "Frase 3" },
                new() { Id = Guid.NewGuid(), SentenceEn = "Sentence 4", SentencePt = "Frase 4" },
                new() { Id = Guid.NewGuid(), SentenceEn = "Sentence 5", SentencePt = "Frase 5" },
                new() { Id = Guid.NewGuid(), SentenceEn = "Sentence 6", SentencePt = "Frase 6" },
                new() { Id = Guid.NewGuid(), SentenceEn = "Sentence 7", SentencePt = "Frase 7" },
                new() { Id = Guid.NewGuid(), SentenceEn = "Sentence 8", SentencePt = "Frase 8" }
            }
        };
        await _repository.AddAsync(word);

        // Act: User currently has Sentence 1 to 4 on screen, requests more
        var result = await _service.GetMoreSentencesAsync("clarity", new List<string>
        {
            "Sentence 1", "Sentence 2", "Sentence 3", "Sentence 4"
        });

        // Assert: Returns Sentence 5, 6, 7, 8 from repository without invoking Groq
        result.Count.ShouldBe(4);
        result.ShouldContain(s => s.En == "Sentence 5");
        result.ShouldContain(s => s.En == "Sentence 8");
        _fakeGroq.MoreSentencesCallCount.ShouldBe(0);
    }

    [Fact]
    public async Task GetMoreSentencesAsync_WhenCacheExhausted_ShouldCallGroqAndPersistNewSentences()
    {
        // Arrange
        var term = "breakthrough";
        // Seeds for 'breakthrough' have 2 sentences.
        var existingSentences = new List<string>
        {
            "Scientists made a major breakthrough in cancer research.",
            "This discovery is seen as a historic breakthrough."
        };

        var groqGenerated = new List<SentencePairDto>
        {
            new("In everyday life, small breakthroughs matter.", "No dia a dia, pequenas conquistas importam."),
            new("The tech startup had a major breakthrough this quarter.", "A startup de tecnologia teve um grande avanço neste trimestre."),
            new("While traveling, he had a breakthrough in learning the local dialect.", "Ao viajar, ele teve um avanço no aprendizado do dialeto local."),
            new("Academic researchers celebrated the new breakthrough.", "Pesquisadores acadêmicos celebraram a nova descoberta.")
        };

        _fakeGroq.MoreSentencesHandler = (t, existing) => Task.FromResult(groqGenerated);

        // Act
        var result = await _service.GetMoreSentencesAsync(term, existingSentences);

        // Assert
        result.Count.ShouldBe(4);
        result[0].En.ShouldBe("In everyday life, small breakthroughs matter.");
        _fakeGroq.MoreSentencesCallCount.ShouldBe(1);
        _fakeGroq.LastExistingSentences.ShouldNotBeNull();
        _fakeGroq.LastExistingSentences.ShouldContain("Scientists made a major breakthrough in cancer research.");

        // Check that sentences were persisted to repository
        var cached = await _repository.GetByTermAsync(term);
        cached.ShouldNotBeNull();
        cached.Sentences.Count.ShouldBe(6); // 2 original + 4 newly generated
    }

    [Fact]
    public async Task LookupTermAsync_WhenWordHasSynonymsInRepository_ShouldReturnSynonymsInDto()
    {
        // Act - breakthrough has seed synonyms configured
        var result = await _service.LookupTermAsync("breakthrough");

        // Assert
        result.ShouldNotBeNull();
        result.Synonyms.ShouldNotBeEmpty();
        result.Synonyms.ShouldContain("advance");
        result.Synonyms.ShouldContain("discovery");
        result.Synonyms.ShouldContain("leap");
        result.Synonyms.ShouldContain("milestone");
        result.Synonyms.ShouldContain("innovation");
    }

    [Fact]
    public async Task LookupTermAsync_WhenGroqReturnsSynonyms_ShouldPersistAndReturnSynonyms()
    {
        // Arrange
        var groqDto = new WordLookupResponseDto(
            "unravel",
            "/ʌnˈræv.əl/",
            new List<TranslationGroupDto>
            {
                new("Verb", new List<string> { "desvendar", "desembaraçar" })
            },
            new List<SentencePairDto>
            {
                new("Detectives tried to unravel the mystery.", "Detetives tentaram desvendar o mistério.")
            },
            new List<string> { "solve", "untangle", "decipher", "resolve" }
        );

        _fakeGroq.Handler = _ => Task.FromResult<WordLookupResponseDto?>(groqDto);

        // Act
        var result = await _service.LookupTermAsync("unravel");

        // Assert
        result.ShouldNotBeNull();
        result.Synonyms.ShouldNotBeEmpty();
        result.Synonyms.Count.ShouldBe(4);
        result.Synonyms.ShouldContain("solve");
        result.Synonyms.ShouldContain("decipher");

        // Verify cached in repository
        var cached = await _repository.GetByTermAsync("unravel");
        cached.ShouldNotBeNull();
        cached.Synonyms.Count.ShouldBe(4);
        cached.Synonyms.Select(s => s.Synonym).ShouldContain("untangle");
    }
}