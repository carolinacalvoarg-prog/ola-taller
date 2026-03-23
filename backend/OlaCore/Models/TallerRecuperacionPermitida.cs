namespace OlaCore.Models;

public class TallerRecuperacionPermitida
{
    public int Id { get; set; }

    // Taller de origen: los alumnos inscriptos aquí pueden recuperar en TallerPermitido
    public int TallerId { get; set; }
    public Taller Taller { get; set; } = null!;

    // Taller destino: donde pueden recuperar los alumnos del Taller de origen
    public int TallerPermitidoId { get; set; }
    public Taller TallerPermitido { get; set; } = null!;
}
