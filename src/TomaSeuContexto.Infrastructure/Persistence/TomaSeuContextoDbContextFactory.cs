namespace TomaSeuContexto.Infrastructure.Persistence;

using System.IO;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

public class TomaSeuContextoDbContextFactory : IDesignTimeDbContextFactory<TomaSeuContextoDbContext>
{
    public TomaSeuContextoDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<TomaSeuContextoDbContext>();
        
        string? connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__Postgres");

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            var searchPaths = new[]
            {
                Path.Combine(Directory.GetCurrentDirectory(), "src", "TomaSeuContexto.Api", "appsettings.Development.json"),
                Path.Combine(Directory.GetCurrentDirectory(), "..", "TomaSeuContexto.Api", "appsettings.Development.json"),
                Path.Combine(AppContext.BaseDirectory, "appsettings.Development.json")
            };

            foreach (var path in searchPaths)
            {
                if (File.Exists(path))
                {
                    try
                    {
                        var json = File.ReadAllText(path);
                        using var doc = JsonDocument.Parse(json);
                        if (doc.RootElement.TryGetProperty("ConnectionStrings", out var csSection))
                        {
                            if (csSection.TryGetProperty("DefaultConnection", out var defaultProp))
                            {
                                connectionString = defaultProp.GetString();
                            }
                            else if (csSection.TryGetProperty("Postgres", out var postgresProp))
                            {
                                connectionString = postgresProp.GetString();
                            }

                            if (!string.IsNullOrWhiteSpace(connectionString))
                            {
                                break;
                            }
                        }
                    }
                    catch
                    {
                        // ignore and fall back
                    }
                }
            }
        }

        if (!string.IsNullOrWhiteSpace(connectionString))
        {
            var normalized = NpgsqlConnectionHelper.NormalizeConnectionString(connectionString);
            optionsBuilder.UseNpgsql(normalized);
        }
        else
        {
            optionsBuilder.UseNpgsql("Host=localhost;Database=toma_contexto_design;Username=postgres;Password=postgres;");
        }

        return new TomaSeuContextoDbContext(optionsBuilder.Options);
    }
}

