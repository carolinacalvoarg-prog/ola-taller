namespace OlaCore.Models;

// Valor por clase de un taller para un mes dado. TallerId null = tarifa general
// para turnos que no pertenecen a ningún taller.
public class TarifaMensual
{
    public int Id { get; set; }
    public int Anio { get; set; }
    public int Mes { get; set; }
    public int? TallerId { get; set; }
    public decimal ValorClaseTransferencia { get; set; }
    public decimal ValorClaseEfectivo { get; set; }

    // Relaciones
    public Taller? Taller { get; set; }
}
