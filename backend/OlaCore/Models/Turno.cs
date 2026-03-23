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

    // Relación con Taller
    public int? TallerId { get; set; }
    public Taller? Taller { get; set; }

    // Si true, las fechas de clase se toman de TurnoFechas en lugar de calcularse por DiaSemana
    public bool UsarFechasManuales { get; set; } = false;

    // Relaciones
    public ICollection<Inscripcion> Inscripciones { get; set; } = new List<Inscripcion>();
    public ICollection<Asistencia> Asistencias { get; set; } = new List<Asistencia>();
    public ICollection<TurnoFecha> FechasManuales { get; set; } = new List<TurnoFecha>();
}
