namespace OlaCore.Models;

public class TurnoFecha
{
    public int Id { get; set; }
    public int TurnoId { get; set; }
    public DateTime Fecha { get; set; }

    public Turno Turno { get; set; } = null!;
}
