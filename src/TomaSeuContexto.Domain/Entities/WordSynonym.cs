namespace TomaSeuContexto.Domain.Entities;

public class WordSynonym
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid WordId { get; set; }
    public string Synonym { get; set; } = string.Empty;
}
