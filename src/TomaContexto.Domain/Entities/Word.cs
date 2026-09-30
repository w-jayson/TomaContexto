namespace TomaContexto.Domain.Entities;

public class Word
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Term { get; set; } = string.Empty;
    public string? Phonetic { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<WordTranslation> Translations { get; set; } = new List<WordTranslation>();
    public ICollection<WordSentence> Sentences { get; set; } = new List<WordSentence>();
}
