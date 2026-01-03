namespace OlaCore.Models;

public class Pago
{
    public int Id { get; set; }
    public int AlumnoId { get; set; }
    public decimal Monto { get; set; }
    public DateTime FechaPago { get; set; }
    public DateTime FechaVencimiento { get; set; }
    public string MetodoPago { get; set; } = string.Empty; // Efectivo, Transferencia, MercadoPago
    public string? Comprobante { get; set; }
    public string Estado { get; set; } = string.Empty; // Pendiente, Pagado, Vencido
    public int MesPago { get; set; }
    public int AnioPago { get; set; }
    
    // Relaciones
    public Alumno Alumno { get; set; } = null!;
}
