namespace TomaContexto.Domain.Entities;

public class Sentence
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string SentenceEn { get; set; } = string.Empty;
    public string SentencePt { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<Word> Words { get; set; } = new List<Word>();
}
