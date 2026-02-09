using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OlaInfrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddFechaNacimientoToAlumno : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "FechaNacimiento",
                table: "Alumnos",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FechaNacimiento",
                table: "Alumnos");
        }
    }
}
