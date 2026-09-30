namespace TomaContexto.Infrastructure.Persistence;

using Npgsql;

public static class NpgsqlConnectionHelper
{
    /// <summary>
    /// Normalizes a connection string. If provided in postgresql:// URI format (e.g. from Neon or DATABASE_URL),
    /// converts it to the standard ADO.NET Key=Value format required by Npgsql.
    /// </summary>
    public static string NormalizeConnectionString(string rawConnectionString)
    {
        if (string.IsNullOrWhiteSpace(rawConnectionString))
        {
            return rawConnectionString;
        }

        if (rawConnectionString.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
            rawConnectionString.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
        {
            var uri = new Uri(rawConnectionString);
            var userInfo = uri.UserInfo.Split(':');
            var username = userInfo[0];
            var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : string.Empty;
            var host = uri.Host;
            var port = uri.Port > 0 ? uri.Port : 5432;
            var database = uri.AbsolutePath.TrimStart('/');

            var builder = new NpgsqlConnectionStringBuilder
            {
                Host = host,
                Port = port,
                Database = database,
                Username = username,
                Password = password,
                SslMode = SslMode.Require
            };

            return builder.ConnectionString;
        }

        return rawConnectionString;
    }
}
