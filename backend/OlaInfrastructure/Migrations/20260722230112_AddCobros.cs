using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace OlaInfrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCobros : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CantidadClases",
                table: "Pagos",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Detalle",
                table: "Pagos",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "EsDosVecesSemana",
                table: "Pagos",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "MontoAbonado",
                table: "Pagos",
                type: "TEXT",
                precision: 10,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<bool>(
                name: "MontoAjustadoManual",
                table: "Pagos",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "MontoEsperadoEfectivo",
                table: "Pagos",
                type: "TEXT",
                precision: 10,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "MontoEsperadoTransferencia",
                table: "Pagos",
                type: "TEXT",
                precision: 10,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "Notas",
                table: "Pagos",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "PortalPagosHabilitado",
                table: "Alumnos",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "TarifasMensuales",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Anio = table.Column<int>(type: "INTEGER", nullable: false),
                    Mes = table.Column<int>(type: "INTEGER", nullable: false),
                    TallerId = table.Column<int>(type: "INTEGER", nullable: true),
                    ValorClaseTransferencia = table.Column<decimal>(type: "TEXT", precision: 10, scale: 2, nullable: false),
                    ValorClaseEfectivo = table.Column<decimal>(type: "TEXT", precision: 10, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TarifasMensuales", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TarifasMensuales_Talleres_TallerId",
                        column: x => x.TallerId,
                        principalTable: "Talleres",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "ConfiguracionesSistema",
                columns: new[] { "Id", "Clave", "Descripcion", "Valor" },
                values: new object[,]
                {
                    { 2, "TransferenciaTitular", "Titular de la cuenta para transferencias", "Yesica Anabela Cruz" },
                    { 3, "TransferenciaCVU", "CVU para transferencias", "0000003100094666029136" },
                    { 4, "TransferenciaAlias", "Alias para transferencias", "ola.ceramica" },
                    { 5, "TransferenciaCUIT", "CUIT/CUIL del titular", "27319388309" },
                    { 6, "TransferenciaBanco", "Banco o billetera de destino", "Mercado Pago" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_TarifasMensuales_Anio_Mes_TallerId",
                table: "TarifasMensuales",
                columns: new[] { "Anio", "Mes", "TallerId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TarifasMensuales_TallerId",
                table: "TarifasMensuales",
                column: "TallerId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TarifasMensuales");

            migrationBuilder.DeleteData(
                table: "ConfiguracionesSistema",
                keyColumn: "Id",
                keyValue: 2);

            migrationBuilder.DeleteData(
                table: "ConfiguracionesSistema",
                keyColumn: "Id",
                keyValue: 3);

            migrationBuilder.DeleteData(
                table: "ConfiguracionesSistema",
                keyColumn: "Id",
                keyValue: 4);

            migrationBuilder.DeleteData(
                table: "ConfiguracionesSistema",
                keyColumn: "Id",
                keyValue: 5);

            migrationBuilder.DeleteData(
                table: "ConfiguracionesSistema",
                keyColumn: "Id",
                keyValue: 6);

            migrationBuilder.DropColumn(
                name: "CantidadClases",
                table: "Pagos");

            migrationBuilder.DropColumn(
                name: "Detalle",
                table: "Pagos");

            migrationBuilder.DropColumn(
                name: "EsDosVecesSemana",
                table: "Pagos");

            migrationBuilder.DropColumn(
                name: "MontoAbonado",
                table: "Pagos");

            migrationBuilder.DropColumn(
                name: "MontoAjustadoManual",
                table: "Pagos");

            migrationBuilder.DropColumn(
                name: "MontoEsperadoEfectivo",
                table: "Pagos");

            migrationBuilder.DropColumn(
                name: "MontoEsperadoTransferencia",
                table: "Pagos");

            migrationBuilder.DropColumn(
                name: "Notas",
                table: "Pagos");

            migrationBuilder.DropColumn(
                name: "PortalPagosHabilitado",
                table: "Alumnos");
        }
    }
}
