namespace TomaContexto.Application.DTOs;

public record WordLookupResponseDto(
    string Term,
    string? Phonetic,
    List<TranslationGroupDto> TranslationsByPos,
    List<SentencePairDto> ExampleSentences
);
