using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OlaInfrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTallerRecuperacionPermitida : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TalleresRecuperacionPermitida",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    TallerId = table.Column<int>(type: "INTEGER", nullable: false),
                    TallerPermitidoId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TalleresRecuperacionPermitida", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TalleresRecuperacionPermitida_Talleres_TallerId",
                        column: x => x.TallerId,
                        principalTable: "Talleres",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TalleresRecuperacionPermitida_Talleres_TallerPermitidoId",
                        column: x => x.TallerPermitidoId,
                        principalTable: "Talleres",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TalleresRecuperacionPermitida_TallerId_TallerPermitidoId",
                table: "TalleresRecuperacionPermitida",
                columns: new[] { "TallerId", "TallerPermitidoId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TalleresRecuperacionPermitida_TallerPermitidoId",
                table: "TalleresRecuperacionPermitida",
                column: "TallerPermitidoId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TalleresRecuperacionPermitida");
        }
    }
}
