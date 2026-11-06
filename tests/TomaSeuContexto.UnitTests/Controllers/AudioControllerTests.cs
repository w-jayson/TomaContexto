namespace TomaSeuContexto.UnitTests.Controllers;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Shouldly;
using TomaSeuContexto.Api.Controllers;
using TomaSeuContexto.Application.Interfaces;
using Xunit;

public class AudioControllerTests
{
    private class MockTtsService : ITtsService
    {
        public bool ReturnNull { get; set; }

        public Task<Stream?> GetOrSynthesizeAudioAsync(string text, string type, CancellationToken cancellationToken = default)
        {
            if (ReturnNull) return Task.FromResult<Stream?>(null);
            Stream stream = new MemoryStream(new byte[] { 1, 2, 3 });
            return Task.FromResult<Stream?>(stream);
        }

        public bool IsAudioCached(string text, string type) => !ReturnNull;
    }

    [Fact]
    public async Task Synthesize_WhenTextIsEmpty_ReturnsBadRequest()
    {
        var controller = new AudioController(new MockTtsService());

        var result = await controller.Synthesize("");

        var badRequest = result.ShouldBeOfType<BadRequestObjectResult>();
        badRequest.StatusCode.ShouldBe(StatusCodes.Status400BadRequest);
    }

    [Fact]
    public async Task Synthesize_WhenServiceReturnsStream_ReturnsFileResultWithCacheHeaders()
    {
        var controller = new AudioController(new MockTtsService { ReturnNull = false });
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };

        var result = await controller.Synthesize("resilience", "word");

        var fileResult = result.ShouldBeOfType<FileStreamResult>();
        fileResult.ContentType.ShouldBe("audio/mpeg");
        controller.Response.Headers.CacheControl.ToString().ShouldContain("immutable");
    }

    [Fact]
    public async Task Synthesize_WhenServiceReturnsNull_ReturnsServiceUnavailable()
    {
        var controller = new AudioController(new MockTtsService { ReturnNull = true });

        var result = await controller.Synthesize("resilience", "word");

        var statusResult = result.ShouldBeOfType<ObjectResult>();
        statusResult.StatusCode.ShouldBe(StatusCodes.Status503ServiceUnavailable);
    }
}
