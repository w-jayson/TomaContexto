namespace TomaSeuContexto.Application.Common;

public class AiOptions
{
    public const string SectionName = "Ai";

    /// <summary>
    /// Supported values: "Auto" (Gemini primary if configured, Groq fallback), "Gemini", or "Groq".
    /// </summary>
    public string Provider { get; set; } = "Auto";
}
