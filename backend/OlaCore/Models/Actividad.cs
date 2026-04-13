namespace OlaCore.Models;

public class Actividad
{
    public int Id { get; set; }
    public string Tipo { get; set; } = string.Empty; // "inscripcion", "cancelacion", "recuperacion", "cancelacion_recuperacion"
    public int AlumnoId { get; set; }
    public int TurnoId { get; set; }
    public DateTime Fecha { get; set; }        // cuándo se realizó la acción
    public DateTime? FechaClase { get; set; }  // qué clase fue afectada (null para inscripciones)

    // Relaciones
    public Alumno? Alumno { get; set; }
    public Turno? Turno { get; set; }
}
