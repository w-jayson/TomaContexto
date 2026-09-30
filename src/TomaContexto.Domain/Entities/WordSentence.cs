namespace TomaContexto.Domain.Entities;

public class WordSentence
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid WordId { get; set; }
    public string SentenceEn { get; set; } = string.Empty;
    public string SentencePt { get; set; } = string.Empty;
}
