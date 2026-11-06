namespace TomaSeuContexto.UnitTests.Infrastructure;

using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Shouldly;
using TomaSeuContexto.Application.Common;
using TomaSeuContexto.Infrastructure.Services;
using Xunit;

public class GoogleTtsServiceTests : IDisposable
{
    private readonly string _testStorageDir;

    public GoogleTtsServiceTests()
    {
        _testStorageDir = Path.Combine(Path.GetTempPath(), "tsc_test_audio_" + Guid.NewGuid().ToString("N"));
    }

    public void Dispose()
    {
        if (Directory.Exists(_testStorageDir))
        {
            try { Directory.Delete(_testStorageDir, true); } catch { }
        }
    }

    [Fact]
    public async Task GetOrSynthesizeAudioAsync_WhenApiKeyEmptyAndNotCached_ReturnsNull()
    {
        var options = Options.Create(new GoogleTtsOptions
        {
            ApiKey = "",
            StoragePath = _testStorageDir
        });

        var service = new GoogleTtsService(new HttpClient(), options, NullLogger<GoogleTtsService>.Instance);

        var result = await service.GetOrSynthesizeAudioAsync("resilience", "word");

        result.ShouldBeNull();
        service.IsAudioCached("resilience", "word").ShouldBeFalse();
    }

    [Fact]
    public async Task GetOrSynthesizeAudioAsync_WhenCachedOnDisk_ReturnsCachedStreamWithoutCallingApi()
    {
        var options = Options.Create(new GoogleTtsOptions
        {
            ApiKey = "",
            StoragePath = _testStorageDir
        });

        var service = new GoogleTtsService(new HttpClient(), options, NullLogger<GoogleTtsService>.Instance);

        // Pre-create a cached audio file
        var wordsDir = Path.Combine(_testStorageDir, "words");
        Directory.CreateDirectory(wordsDir);
        var expectedBytes = new byte[] { 0x49, 0x44, 0x33, 0x03 }; // Mock MP3 header
        await File.WriteAllBytesAsync(Path.Combine(wordsDir, "resilience.mp3"), expectedBytes);

        service.IsAudioCached("resilience", "word").ShouldBeTrue();

        var stream = await service.GetOrSynthesizeAudioAsync("resilience", "word");

        stream.ShouldNotBeNull();
        using var ms = new MemoryStream();
        await stream.CopyToAsync(ms);
        ms.ToArray().ShouldBe(expectedBytes);
    }
}
