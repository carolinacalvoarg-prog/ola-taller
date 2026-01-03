namespace OlaCore.Models;

public class Profesor
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Apellido { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Telefono { get; set; }
    public bool Activo { get; set; }
    
    // Relaciones
    public ICollection<Turno> Turnos { get; set; } = new List<Turno>();
}
