namespace TomaSeuContexto.Application.Common;

public class AiServiceUnavailableException : Exception
{
    public AiServiceUnavailableException(string message)
        : base(message)
    {
    }

    public AiServiceUnavailableException(string message, Exception innerException)
        : base(message, innerException)
    {
    }
}
