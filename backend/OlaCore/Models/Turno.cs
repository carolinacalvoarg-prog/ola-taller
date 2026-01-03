namespace OlaCore.Models;

public class Turno
{
    public int Id { get; set; }
    public DayOfWeek DiaSemana { get; set; }
    public TimeSpan HoraInicio { get; set; }
    public TimeSpan HoraFin { get; set; }
    public int CuposMaximos { get; set; }
    public bool Activo { get; set; }
    
    // Relación con Profesor
    public int? ProfesorId { get; set; }
    public Profesor? Profesor { get; set; }
    
    // Relaciones
    public ICollection<Inscripcion> Inscripciones { get; set; } = new List<Inscripcion>();
    public ICollection<Asistencia> Asistencias { get; set; } = new List<Asistencia>();
}
