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
    public DbSet<Sentence> Sentences => Set<Sentence>();

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
                  .WithMany(s => s.Words)
                  .UsingEntity<Dictionary<string, object>>(
                      "WordSentences",
                      j => j.HasOne<Sentence>().WithMany().HasForeignKey("SentenceId").OnDelete(DeleteBehavior.Cascade),
                      j => j.HasOne<Word>().WithMany().HasForeignKey("WordId").OnDelete(DeleteBehavior.Cascade));
        });

        modelBuilder.Entity<WordTranslation>(entity =>
        {
            entity.HasKey(t => t.Id);
            entity.Property(t => t.PartOfSpeech).IsRequired().HasMaxLength(100);
            entity.Property(t => t.Translation).IsRequired().HasMaxLength(250);
        });

        modelBuilder.Entity<Sentence>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.Property(s => s.SentenceEn).IsRequired();
            entity.Property(s => s.SentencePt).IsRequired();
            entity.Property(s => s.CreatedAt).IsRequired();

            entity.HasIndex(s => s.SentenceEn);
        });
    }
}
