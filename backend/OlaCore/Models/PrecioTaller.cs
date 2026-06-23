namespace OlaCore.Models;

public class PrecioTaller
{
    public int Id { get; set; }
    public int TallerId { get; set; }
    public DateTime VigenteDesde { get; set; }
    public decimal PrecioTransferencia { get; set; }
    public decimal PrecioEfectivo { get; set; }

    public Taller Taller { get; set; } = null!;
}
