namespace OlaCore.Models;

public class Actividad
{
    public int Id { get; set; }
    public string Tipo { get; set; } = string.Empty; // "inscripcion", "cancelacion"
    public int AlumnoId { get; set; }
    public int TurnoId { get; set; }
    public DateTime Fecha { get; set; }

    // Relaciones
    public Alumno? Alumno { get; set; }
    public Turno? Turno { get; set; }
}
