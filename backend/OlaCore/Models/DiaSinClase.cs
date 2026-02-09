namespace OlaCore.Models;

/// <summary>
/// Fechas en las que no hay clases (feriados, sábados sin clase, etc.).
/// </summary>
public class DiaSinClase
{
    public int Id { get; set; }
    public DateTime Fecha { get; set; }
    public string? Motivo { get; set; }
}
