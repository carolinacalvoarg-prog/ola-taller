namespace OlaCore.Models;

public class Pago
{
    public int Id { get; set; }
    public int AlumnoId { get; set; }

    // Monto calculado automáticamente por el sistema
    public decimal MontoCalculado { get; set; }

    // Monto final (puede ser editado por el admin para aplicar descuentos especiales)
    public decimal Monto { get; set; }

    // Null hasta que se registra el pago
    public DateTime? FechaPago { get; set; }

    public DateTime FechaVencimiento { get; set; }

    // Null hasta que se registra el pago
    public string? MetodoPago { get; set; } // Efectivo, Transferencia, MercadoPago

    public string? Comprobante { get; set; }
    public string Estado { get; set; } = "Pendiente"; // Pendiente, Pagado, Vencido
    public int MesPago { get; set; }
    public int AnioPago { get; set; }

    // True si el alumno tiene 2+ clases por semana → aplica precio efectivo para todos
    public bool AplicaDescuentoMultiple { get; set; }

    public string? NotasAdmin { get; set; }

    public Alumno Alumno { get; set; } = null!;
}
