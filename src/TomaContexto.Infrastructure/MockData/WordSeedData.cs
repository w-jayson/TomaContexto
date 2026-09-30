namespace TomaContexto.Infrastructure.MockData;

using TomaContexto.Domain.Entities;

public static class WordSeedData
{
    public static List<Word> GetSeeds()
    {
        var disbeliefId = Guid.NewGuid();
        var disbeliefWord = new Word
        {
            Id = disbeliefId,
            Term = "in disbelief",
            Phonetic = "/ɪn dɪsbɪˈliːf/",
            CreatedAt = DateTime.UtcNow,
            Translations = new List<WordTranslation>
            {
                new() { Id = Guid.NewGuid(), WordId = disbeliefId, PartOfSpeech = "Idiom", Translation = "com descrença" },
                new() { Id = Guid.NewGuid(), WordId = disbeliefId, PartOfSpeech = "Idiom", Translation = "em choque" },
                new() { Id = Guid.NewGuid(), WordId = disbeliefId, PartOfSpeech = "Adverb", Translation = "incrédulo" }
            },
            Sentences = new List<Sentence>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    SentenceEn = "She stared at the test results in disbelief.",
                    SentencePt = "Ela olhou para os resultados do teste com descrença."
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    SentenceEn = "He shook his head in disbelief when he heard the news.",
                    SentencePt = "Ele balançou a cabeça incrédulo quando ouviu a notícia."
                }
            }
        };

        var runOutOfId = Guid.NewGuid();
        var runOutOfWord = new Word
        {
            Id = runOutOfId,
            Term = "run out of",
            Phonetic = "/rʌn aʊt əv/",
            CreatedAt = DateTime.UtcNow,
            Translations = new List<WordTranslation>
            {
                new() { Id = Guid.NewGuid(), WordId = runOutOfId, PartOfSpeech = "Phrasal Verb", Translation = "ficar sem" },
                new() { Id = Guid.NewGuid(), WordId = runOutOfId, PartOfSpeech = "Phrasal Verb", Translation = "esgotar" }
            },
            Sentences = new List<Sentence>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    SentenceEn = "We have run out of coffee, so I need to go to the grocery store.",
                    SentencePt = "Ficamos sem café, então preciso ir ao supermercado."
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    SentenceEn = "The car stopped because we ran out of gas.",
                    SentencePt = "O carro parou porque ficamos sem gasolina."
                }
            }
        };

        var breakthroughId = Guid.NewGuid();
        var breakthroughWord = new Word
        {
            Id = breakthroughId,
            Term = "breakthrough",
            Phonetic = "/ˈbreɪkˌθruː/",
            CreatedAt = DateTime.UtcNow,
            Translations = new List<WordTranslation>
            {
                new() { Id = Guid.NewGuid(), WordId = breakthroughId, PartOfSpeech = "Noun", Translation = "avanço" },
                new() { Id = Guid.NewGuid(), WordId = breakthroughId, PartOfSpeech = "Noun", Translation = "descoberta importante" },
                new() { Id = Guid.NewGuid(), WordId = breakthroughId, PartOfSpeech = "Noun", Translation = "conquista" }
            },
            Sentences = new List<Sentence>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    SentenceEn = "Scientists made a major breakthrough in cancer research.",
                    SentencePt = "Os cientistas fizeram um grande avanço na pesquisa do câncer."
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    SentenceEn = "This discovery is seen as a historic breakthrough.",
                    SentencePt = "Esta descoberta é vista como uma conquista histórica."
                }
            }
        };

        return new List<Word> { disbeliefWord, runOutOfWord, breakthroughWord };
    }
}
