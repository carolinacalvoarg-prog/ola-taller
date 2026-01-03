namespace OlaCore.Models;

public class Asistencia
{
    public int Id { get; set; }
    public int AlumnoId { get; set; }
    public int TurnoId { get; set; }
    public DateTime Fecha { get; set; }
    public bool Presente { get; set; }
    public string? Observaciones { get; set; }
    public DateTime FechaRegistro { get; set; }
    
    // Relaciones
    public Alumno Alumno { get; set; } = null!;
    public Turno Turno { get; set; } = null!;
}
