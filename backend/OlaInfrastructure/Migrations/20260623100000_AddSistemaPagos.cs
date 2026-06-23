using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OlaInfrastructure.Migrations
{
    public partial class AddSistemaPagos : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Recrear Pagos con el nuevo schema (sin datos de producción aún)
            migrationBuilder.DropTable(name: "Pagos");

            migrationBuilder.CreateTable(
                name: "Pagos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    AlumnoId = table.Column<int>(type: "INTEGER", nullable: false),
                    MontoCalculado = table.Column<decimal>(type: "TEXT", precision: 10, scale: 2, nullable: false),
                    Monto = table.Column<decimal>(type: "TEXT", precision: 10, scale: 2, nullable: false),
                    FechaPago = table.Column<DateTime>(type: "TEXT", nullable: true),
                    FechaVencimiento = table.Column<DateTime>(type: "TEXT", nullable: false),
                    MetodoPago = table.Column<string>(type: "TEXT", nullable: true),
                    Comprobante = table.Column<string>(type: "TEXT", nullable: true),
                    Estado = table.Column<string>(type: "TEXT", nullable: false),
                    MesPago = table.Column<int>(type: "INTEGER", nullable: false),
                    AnioPago = table.Column<int>(type: "INTEGER", nullable: false),
                    AplicaDescuentoMultiple = table.Column<bool>(type: "INTEGER", nullable: false),
                    NotasAdmin = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Pagos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Pagos_Alumnos_AlumnoId",
                        column: x => x.AlumnoId,
                        principalTable: "Alumnos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Pagos_AlumnoId_MesPago_AnioPago",
                table: "Pagos",
                columns: new[] { "AlumnoId", "MesPago", "AnioPago" },
                unique: true);

            // Tabla de precios por taller
            migrationBuilder.CreateTable(
                name: "PreciosTaller",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    TallerId = table.Column<int>(type: "INTEGER", nullable: false),
                    VigenteDesde = table.Column<DateTime>(type: "TEXT", nullable: false),
                    PrecioTransferencia = table.Column<decimal>(type: "TEXT", precision: 10, scale: 2, nullable: false),
                    PrecioEfectivo = table.Column<decimal>(type: "TEXT", precision: 10, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PreciosTaller", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PreciosTaller_Talleres_TallerId",
                        column: x => x.TallerId,
                        principalTable: "Talleres",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PreciosTaller_TallerId_VigenteDesde",
                table: "PreciosTaller",
                columns: new[] { "TallerId", "VigenteDesde" });

            // Corregir tipos de columnas DateTime en PostgreSQL
            if (!migrationBuilder.ActiveProvider.Contains("Sqlite"))
            {
                migrationBuilder.Sql(@"
                    ALTER TABLE ""Pagos""
                    ALTER COLUMN ""FechaVencimiento"" TYPE timestamp with time zone
                    USING ""FechaVencimiento""::timestamp with time zone;
                ");
                migrationBuilder.Sql(@"
                    ALTER TABLE ""PreciosTaller""
                    ALTER COLUMN ""VigenteDesde"" TYPE timestamp with time zone
                    USING ""VigenteDesde""::timestamp with time zone;
                ");
                migrationBuilder.Sql(@"
                    ALTER TABLE ""Pagos""
                    ALTER COLUMN ""AplicaDescuentoMultiple"" TYPE boolean
                    USING ""AplicaDescuentoMultiple""::integer::boolean;
                ");
            }
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "PreciosTaller");
            migrationBuilder.DropTable(name: "Pagos");

            // Restaurar Pagos original
            migrationBuilder.CreateTable(
                name: "Pagos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    AlumnoId = table.Column<int>(type: "INTEGER", nullable: false),
                    Monto = table.Column<decimal>(type: "TEXT", precision: 10, scale: 2, nullable: false),
                    FechaPago = table.Column<DateTime>(type: "TEXT", nullable: false),
                    FechaVencimiento = table.Column<DateTime>(type: "TEXT", nullable: false),
                    MetodoPago = table.Column<string>(type: "TEXT", nullable: false),
                    Comprobante = table.Column<string>(type: "TEXT", nullable: true),
                    Estado = table.Column<string>(type: "TEXT", nullable: false),
                    MesPago = table.Column<int>(type: "INTEGER", nullable: false),
                    AnioPago = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Pagos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Pagos_Alumnos_AlumnoId",
                        column: x => x.AlumnoId,
                        principalTable: "Alumnos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Pagos_AlumnoId_MesPago_AnioPago",
                table: "Pagos",
                columns: new[] { "AlumnoId", "MesPago", "AnioPago" });
        }
    }
}
