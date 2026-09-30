namespace TomaContexto.Domain.Entities;

public class WordTranslation
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid WordId { get; set; }
    public string PartOfSpeech { get; set; } = string.Empty;
    public string Translation { get; set; } = string.Empty;
}
