using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TomaSeuContexto.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddWordSynonyms : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "WordSynonyms",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    WordId = table.Column<Guid>(type: "uuid", nullable: false),
                    Synonym = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WordSynonyms", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WordSynonyms_Words_WordId",
                        column: x => x.WordId,
                        principalTable: "Words",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WordSynonyms_WordId",
                table: "WordSynonyms",
                column: "WordId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WordSynonyms");
        }
    }
}
