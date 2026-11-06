namespace TomaSeuContexto.Infrastructure.Services;

using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using TomaSeuContexto.Application.Common;
using TomaSeuContexto.Application.Interfaces;

public class GoogleTtsService : ITtsService
{
    private readonly HttpClient _httpClient;
    private readonly GoogleTtsOptions _options;
    private readonly ILogger<GoogleTtsService> _logger;
    private readonly string _wordsDir;
    private readonly string _sentencesDir;

    public GoogleTtsService(
        HttpClient httpClient,
        IOptions<GoogleTtsOptions> options,
        ILogger<GoogleTtsService> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;

        var basePath = Path.IsPathRooted(_options.StoragePath)
            ? _options.StoragePath
            : Path.Combine(AppContext.BaseDirectory, _options.StoragePath);

        _wordsDir = Path.Combine(basePath, "words");
        _sentencesDir = Path.Combine(basePath, "sentences");

        Directory.CreateDirectory(_wordsDir);
        Directory.CreateDirectory(_sentencesDir);
    }

    public bool IsAudioCached(string text, string type)
    {
        var filePath = ResolveFilePath(text, type);
        return File.Exists(filePath);
    }

    public async Task<Stream?> GetOrSynthesizeAudioAsync(
        string text,
        string type,
        CancellationToken cancellationToken = default)
    {
        var trimmed = text.Trim();
        if (string.IsNullOrWhiteSpace(trimmed))
        {
            return null;
        }

        var filePath = ResolveFilePath(trimmed, type);

        // 1. Return immediately from VPS disk cache if present (zero latency & zero API cost)
        if (File.Exists(filePath))
        {
            try
            {
                return new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read, 4096, FileOptions.Asynchronous);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to read cached audio file at {FilePath}. Re-synthesizing.", filePath);
            }
        }

        // 2. If API Key is not configured, return null gracefully (frontend will use native speech)
        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            _logger.LogDebug("Google Cloud TTS API key not configured. Skipping server-side synthesis.");
            return null;
        }

        // 3. Synthesize via Google Cloud Neural2 API
        try
        {
            var audioBytes = await CallGoogleTtsApiAsync(trimmed, cancellationToken);
            if (audioBytes is null || audioBytes.Length == 0)
            {
                return null;
            }

            // 4. Save to local disk cache atomically
            await SaveAudioToDiskAsync(filePath, audioBytes, cancellationToken);

            return new MemoryStream(audioBytes);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error synthesizing audio via Google TTS for text: {Text}", trimmed);
            return null;
        }
    }

    private string ResolveFilePath(string text, string type)
    {
        var isWord = string.Equals(type, "word", StringComparison.OrdinalIgnoreCase);
        if (isWord)
        {
            // Sanitize word for clean file name
            var cleanWord = new string(text.ToLowerInvariant().Where(c => char.IsLetterOrDigit(c) || c == '-' || c == '_').ToArray());
            if (string.IsNullOrEmpty(cleanWord)) cleanWord = "unnamed";
            return Path.Combine(_wordsDir, $"{cleanWord}.mp3");
        }

        // Sentences use SHA256 hash for deterministic collision-free file naming
        using var sha256 = SHA256.Create();
        var hashBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(text.ToLowerInvariant().Trim()));
        var hashHex = Convert.ToHexString(hashBytes).ToLowerInvariant();
        return Path.Combine(_sentencesDir, $"{hashHex}.mp3");
    }

    private async Task<byte[]?> CallGoogleTtsApiAsync(string text, CancellationToken cancellationToken)
    {
        var url = $"https://texttospeech.googleapis.com/v1/text:synthesize?key={_options.ApiKey}";

        var requestBody = new GoogleSynthesizeRequest
        {
            Input = new SynthesisInput { Text = text },
            Voice = new VoiceSelectionParams
            {
                LanguageCode = _options.LanguageCode,
                Name = _options.VoiceName
            },
            AudioConfig = new AudioConfig
            {
                AudioEncoding = "MP3",
                SpeakingRate = _options.SpeakingRate
            }
        };

        var json = JsonSerializer.Serialize(requestBody);
        using var content = new StringContent(json, Encoding.UTF8, "application/json");

        using var response = await _httpClient.PostAsync(url, content, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogWarning("Google TTS API returned status {StatusCode}: {Error}", response.StatusCode, err);
            return null;
        }

        var resJson = await response.Content.ReadAsStringAsync(cancellationToken);
        var resObj = JsonSerializer.Deserialize<GoogleSynthesizeResponse>(resJson);

        if (string.IsNullOrEmpty(resObj?.AudioContent))
        {
            return null;
        }

        return Convert.FromBase64String(resObj.AudioContent);
    }

    private async Task SaveAudioToDiskAsync(string destinationPath, byte[] data, CancellationToken cancellationToken)
    {
        var tempFile = destinationPath + $".{Guid.NewGuid():N}.tmp";
        try
        {
            await File.WriteAllBytesAsync(tempFile, data, cancellationToken);
            File.Move(tempFile, destinationPath, overwrite: true);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to persist audio cache file at {Path}", destinationPath);
            if (File.Exists(tempFile))
            {
                try { File.Delete(tempFile); } catch { }
            }
        }
    }

    private sealed class GoogleSynthesizeRequest
    {
        [JsonPropertyName("input")]
        public SynthesisInput Input { get; set; } = new();

        [JsonPropertyName("voice")]
        public VoiceSelectionParams Voice { get; set; } = new();

        [JsonPropertyName("audioConfig")]
        public AudioConfig AudioConfig { get; set; } = new();
    }

    private sealed class SynthesisInput
    {
        [JsonPropertyName("text")]
        public string Text { get; set; } = string.Empty;
    }

    private sealed class VoiceSelectionParams
    {
        [JsonPropertyName("languageCode")]
        public string LanguageCode { get; set; } = "en-US";

        [JsonPropertyName("name")]
        public string Name { get; set; } = "en-US-Neural2-F";
    }

    private sealed class AudioConfig
    {
        [JsonPropertyName("audioEncoding")]
        public string AudioEncoding { get; set; } = "MP3";

        [JsonPropertyName("speakingRate")]
        public double SpeakingRate { get; set; } = 0.90;
    }

    private sealed class GoogleSynthesizeResponse
    {
        [JsonPropertyName("audioContent")]
        public string? AudioContent { get; set; }
    }
}
