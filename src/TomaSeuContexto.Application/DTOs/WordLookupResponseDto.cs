namespace TomaSeuContexto.Application.DTOs;

public record WordLookupResponseDto(
    string Term,
    string? Phonetic,
    List<TranslationGroupDto> TranslationsByPos,
    List<SentencePairDto> ExampleSentences,
    List<string>? Synonyms = null
)
{
    public List<string> Synonyms { get; init; } = Synonyms ?? new();
}
