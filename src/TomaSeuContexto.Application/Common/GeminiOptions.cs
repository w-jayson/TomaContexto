namespace TomaSeuContexto.Application.Common;

public class GeminiOptions
{
    public const string SectionName = "Gemini";

    public string ApiKey { get; set; } = string.Empty;
    public string Endpoint { get; set; } = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
    public string Model { get; set; } = "gemini-3.5-flash";
    public string SystemPrompt { get; set; } = string.Empty;
}
