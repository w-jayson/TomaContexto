namespace TomaSeuContexto.Application.DTOs;

public record TranslationGroupDto(
    string PartOfSpeech,
    List<string> Translations
);
