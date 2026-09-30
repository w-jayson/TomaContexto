namespace TomaContexto.Application.DTOs;

using System.Text.Json.Serialization;

public class GroqWordResponse
{
    [JsonPropertyName("term")]
    public string Term { get; set; } = string.Empty;

    [JsonPropertyName("phonetic")]
    public string? Phonetic { get; set; }

    [JsonPropertyName("categories")]
    public List<GroqCategoryResponse> Categories { get; set; } = new();

    [JsonPropertyName("sentences")]
    public List<GroqSentenceResponse> Sentences { get; set; } = new();
}

public class GroqCategoryResponse
{
    [JsonPropertyName("partOfSpeech")]
    public string PartOfSpeech { get; set; } = string.Empty;

    [JsonPropertyName("translations")]
    public List<string> Translations { get; set; } = new();
}

public class GroqSentenceResponse
{
    [JsonPropertyName("en")]
    public string En { get; set; } = string.Empty;

    [JsonPropertyName("pt")]
    public string Pt { get; set; } = string.Empty;
}
