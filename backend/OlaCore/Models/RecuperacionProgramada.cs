namespace OlaCore.Models;

/// <summary>
/// Asistencia puntual de un alumno a un turno en una fecha específica como recuperación de clase.
/// No es una inscripción permanente.
/// </summary>
public class RecuperacionProgramada
{
    public int Id { get; set; }
    public int AlumnoId { get; set; }
    public int TurnoId { get; set; }
    public DateTime Fecha { get; set; }
    public DateTime FechaRegistro { get; set; }

    public Alumno? Alumno { get; set; }
    public Turno? Turno { get; set; }
}
