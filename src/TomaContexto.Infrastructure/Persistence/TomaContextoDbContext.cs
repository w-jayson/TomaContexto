namespace TomaContexto.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;
using TomaContexto.Domain.Entities;

public class TomaContextoDbContext : DbContext
{
    public TomaContextoDbContext(DbContextOptions<TomaContextoDbContext> options) : base(options)
    {
    }

    public DbSet<Word> Words => Set<Word>();
    public DbSet<WordTranslation> WordTranslations => Set<WordTranslation>();
    public DbSet<WordSentence> WordSentences => Set<WordSentence>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Word>(entity =>
        {
            entity.HasKey(w => w.Id);
            entity.Property(w => w.Term).IsRequired().HasMaxLength(250);
            entity.Property(w => w.Phonetic).HasMaxLength(150);
            entity.Property(w => w.CreatedAt).IsRequired();

            entity.HasIndex(w => w.Term)
                  .IsUnique();

            entity.HasMany(w => w.Translations)
                  .WithOne()
                  .HasForeignKey(t => t.WordId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(w => w.Sentences)
                  .WithOne()
                  .HasForeignKey(s => s.WordId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<WordTranslation>(entity =>
        {
            entity.HasKey(t => t.Id);
            entity.Property(t => t.PartOfSpeech).IsRequired().HasMaxLength(100);
            entity.Property(t => t.Translation).IsRequired().HasMaxLength(250);
        });

        modelBuilder.Entity<WordSentence>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.Property(s => s.SentenceEn).IsRequired();
            entity.Property(s => s.SentencePt).IsRequired();
        });
    }
}
