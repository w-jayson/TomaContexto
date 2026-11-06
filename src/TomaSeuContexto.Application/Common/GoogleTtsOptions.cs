namespace TomaSeuContexto.Application.Common;

public class GoogleTtsOptions
{
    public const string SectionName = "GoogleTts";

    /// <summary>
    /// Google Cloud API Key with Cloud Text-to-Speech API enabled.
    /// If empty, the system gracefully falls back to client-side speech synthesis.
    /// </summary>
    public string ApiKey { get; set; } = string.Empty;

    /// <summary>
    /// High-fidelity Neural2 voice name. Default is en-US-Neural2-F.
    /// </summary>
    public string VoiceName { get; set; } = "en-US-Neural2-F";

    /// <summary>
    /// BCP-47 language code. Default is en-US.
    /// </summary>
    public string LanguageCode { get; set; } = "en-US";

    /// <summary>
    /// Speaking rate for pedagogical clarity (0.85 - 1.0).
    /// </summary>
    public double SpeakingRate { get; set; } = 0.90;

    /// <summary>
    /// Directory path on the VPS/host to persist cached MP3 audio files.
    /// </summary>
    public string StoragePath { get; set; } = "storage/audio";
}
