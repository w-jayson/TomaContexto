namespace TomaContexto.UnitTests.Application;

using Shouldly;
using TomaContexto.Application.DTOs;
using TomaContexto.Application.Services;
using TomaContexto.Domain.Entities;
using TomaContexto.Infrastructure.Repositories;
using TomaContexto.UnitTests.Fakes;
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
}

