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
    public string Estado { get; set; } = string.Empty; // Pendiente, Parcial, Pagado
    public int MesPago { get; set; }
    public int AnioPago { get; set; }

    // Cuota mensual: montos esperados calculados al generar (la admin puede pisarlos)
    public decimal MontoEsperadoTransferencia { get; set; }
    public decimal MontoEsperadoEfectivo { get; set; }
    public decimal MontoAbonado { get; set; }
    public int CantidadClases { get; set; }
    public bool EsDosVecesSemana { get; set; }
    public bool MontoAjustadoManual { get; set; }
    public string? Detalle { get; set; }
    public string? Notas { get; set; }

    // Relaciones
    public Alumno Alumno { get; set; } = null!;
}
