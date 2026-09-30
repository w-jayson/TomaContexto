namespace TomaContexto.UnitTests.Infrastructure;

using Shouldly;
using TomaContexto.Domain.Entities;
using TomaContexto.Infrastructure.Repositories;
using Xunit;

public class InMemoryWordRepositoryTests
{
    [Fact]
    public async Task AddAsync_ShouldEnableImmediateSubsequentRetrieval()
    {
        // Arrange
        var repository = new InMemoryWordRepository(populateSeeds: false);
        var wordId = Guid.NewGuid();
        var word = new Word
        {
            Id = wordId,
            Term = "serendipity",
            Phonetic = "/ˌser.ənˈdɪp.ə.t̬i/",
            Translations = new List<WordTranslation>
            {
                new() { Id = Guid.NewGuid(), WordId = wordId, PartOfSpeech = "Noun", Translation = "acaso feliz" }
            },
            Sentences = new List<Sentence>
            {
                new() { Id = Guid.NewGuid(), SentenceEn = "Finding this book was pure serendipity.", SentencePt = "Encontrar este livro foi puro acaso feliz." }
            }
        };

        // Act
        await repository.AddAsync(word);
        var retrieved = await repository.GetByTermAsync("serendipity");

        // Assert
        retrieved.ShouldNotBeNull();
        retrieved.Id.ShouldBe(wordId);
        retrieved.Term.ShouldBe("serendipity");
        retrieved.Translations.Count.ShouldBe(1);
        retrieved.Sentences.Count.ShouldBe(1);
    }

    [Fact]
    public async Task Repository_ShouldPreloadSeedEntries()
    {
        // Arrange
        var repository = new InMemoryWordRepository(populateSeeds: true);

        // Act & Assert
        var disbelief = await repository.GetByTermAsync("in disbelief");
        disbelief.ShouldNotBeNull();
        disbelief.Term.ShouldBe("in disbelief");

        var runOutOf = await repository.GetByTermAsync("run out of");
        runOutOf.ShouldNotBeNull();
        runOutOf.Term.ShouldBe("run out of");

        var breakthrough = await repository.GetByTermAsync("breakthrough");
        breakthrough.ShouldNotBeNull();
        breakthrough.Term.ShouldBe("breakthrough");
    }

    [Theory]
    [InlineData(" BREAKTHROUGH ")]
    [InlineData("BreakThrough")]
    [InlineData("breakthrough")]
    public async Task GetByTermAsync_ShouldBeCaseAndWhitespaceInsensitive(string query)
    {
        // Arrange
        var repository = new InMemoryWordRepository(populateSeeds: true);

        // Act
        var result = await repository.GetByTermAsync(query);

        // Assert
        result.ShouldNotBeNull();
        result.Term.ShouldBe("breakthrough");
    }

    [Fact]
    public async Task FindSentencesContainingTermAsync_ShouldReturnMatchingSentencesFromPreloadedSeeds()
    {
        // Arrange
        var repository = new InMemoryWordRepository(populateSeeds: true);

        // Act
        // "stared" appears in "She stared at the test results in disbelief."
        var matches = await repository.FindSentencesContainingTermAsync("stared");

        // Assert
        matches.ShouldNotBeEmpty();
        matches.ShouldContain(s => s.SentenceEn.Contains("stared"));
    }
}
