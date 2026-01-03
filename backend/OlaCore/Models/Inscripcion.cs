namespace OlaCore.Models;

public class Inscripcion
{
    public int Id { get; set; }
    public int AlumnoId { get; set; }
    public int TurnoId { get; set; }
    public DateTime FechaInscripcion { get; set; }
    public bool Activa { get; set; }
    
    // Relaciones
    public Alumno Alumno { get; set; } = null!;
    public Turno Turno { get; set; } = null!;
}
