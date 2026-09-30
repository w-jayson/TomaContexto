namespace TomaContexto.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

public class TomaContextoDbContextFactory : IDesignTimeDbContextFactory<TomaContextoDbContext>
{
    public TomaContextoDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<TomaContextoDbContext>();
        
        // Design-time connection string used solely for generating migrations
        optionsBuilder.UseNpgsql("Host=localhost;Database=toma_contexto_design;Username=postgres;Password=postgres;");

        return new TomaContextoDbContext(optionsBuilder.Options);
    }
}
