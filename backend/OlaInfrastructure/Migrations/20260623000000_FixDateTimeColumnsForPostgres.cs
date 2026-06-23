using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OlaInfrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixDateTimeColumnsForPostgres : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Solo en PostgreSQL: las migraciones anteriores crearon columnas DateTime como TEXT (tipo SQLite).
            // Npgsql no puede mapear TEXT → DateTime, causando error 500 al consultar Actividades.
            if (!migrationBuilder.ActiveProvider.Contains("Sqlite"))
            {
                migrationBuilder.Sql(@"
                    ALTER TABLE ""Actividades""
                    ALTER COLUMN ""Fecha"" TYPE timestamp with time zone
                    USING ""Fecha""::timestamp with time zone;
                ");

                migrationBuilder.Sql(@"
                    ALTER TABLE ""Actividades""
                    ALTER COLUMN ""FechaClase"" TYPE timestamp with time zone
                    USING CASE WHEN ""FechaClase"" IS NULL THEN NULL ELSE ""FechaClase""::timestamp with time zone END;
                ");
            }
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            if (!migrationBuilder.ActiveProvider.Contains("Sqlite"))
            {
                migrationBuilder.Sql(@"
                    ALTER TABLE ""Actividades""
                    ALTER COLUMN ""FechaClase"" TYPE text
                    USING ""FechaClase""::text;
                ");

                migrationBuilder.Sql(@"
                    ALTER TABLE ""Actividades""
                    ALTER COLUMN ""Fecha"" TYPE text
                    USING ""Fecha""::text;
                ");
            }
        }
    }
}
