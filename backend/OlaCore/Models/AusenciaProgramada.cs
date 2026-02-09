namespace OlaCore.Models;

/// <summary>
/// Indica que el alumno no asistirá a una clase en una fecha concreta (próximas ausencias).
/// </summary>
public class AusenciaProgramada
{
    public int Id { get; set; }
    public int InscripcionId { get; set; }
    public DateTime Fecha { get; set; }

    public Inscripcion? Inscripcion { get; set; }
}
