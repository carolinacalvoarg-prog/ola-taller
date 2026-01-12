using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OlaInfrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixBooleanColumnsForPostgres : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Convertir columnas INTEGER a BOOLEAN en PostgreSQL
            // Usamos SQL directo porque EF Core no puede cambiar tipos automáticamente

            // Alumnos.Activo
            migrationBuilder.Sql(@"
                ALTER TABLE ""Alumnos""
                ALTER COLUMN ""Activo"" TYPE boolean
                USING ""Activo""::integer::boolean;
            ");

            // Profesores.Activo
            migrationBuilder.Sql(@"
                ALTER TABLE ""Profesores""
                ALTER COLUMN ""Activo"" TYPE boolean
                USING ""Activo""::integer::boolean;
            ");

            // Turnos.Activo
            migrationBuilder.Sql(@"
                ALTER TABLE ""Turnos""
                ALTER COLUMN ""Activo"" TYPE boolean
                USING ""Activo""::integer::boolean;
            ");

            // Usuarios.Activo
            migrationBuilder.Sql(@"
                ALTER TABLE ""Usuarios""
                ALTER COLUMN ""Activo"" TYPE boolean
                USING ""Activo""::integer::boolean;
            ");

            // Inscripciones.Activa
            migrationBuilder.Sql(@"
                ALTER TABLE ""Inscripciones""
                ALTER COLUMN ""Activa"" TYPE boolean
                USING ""Activa""::integer::boolean;
            ");

            // Asistencias.Presente
            migrationBuilder.Sql(@"
                ALTER TABLE ""Asistencias""
                ALTER COLUMN ""Presente"" TYPE boolean
                USING ""Presente""::integer::boolean;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Revertir a INTEGER si es necesario
            migrationBuilder.Sql(@"
                ALTER TABLE ""Alumnos""
                ALTER COLUMN ""Activo"" TYPE integer
                USING ""Activo""::boolean::integer;
            ");

            migrationBuilder.Sql(@"
                ALTER TABLE ""Profesores""
                ALTER COLUMN ""Activo"" TYPE integer
                USING ""Activo""::boolean::integer;
            ");

            migrationBuilder.Sql(@"
                ALTER TABLE ""Turnos""
                ALTER COLUMN ""Activo"" TYPE integer
                USING ""Activo""::boolean::integer;
            ");

            migrationBuilder.Sql(@"
                ALTER TABLE ""Usuarios""
                ALTER COLUMN ""Activo"" TYPE integer
                USING ""Activo""::boolean::integer;
            ");

            migrationBuilder.Sql(@"
                ALTER TABLE ""Inscripciones""
                ALTER COLUMN ""Activa"" TYPE integer
                USING ""Activa""::boolean::integer;
            ");

            migrationBuilder.Sql(@"
                ALTER TABLE ""Asistencias""
                ALTER COLUMN ""Presente"" TYPE integer
                USING ""Presente""::boolean::integer;
            ");
        }
    }
}
