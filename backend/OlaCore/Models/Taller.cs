namespace OlaCore.Models;

public class Taller
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public bool Activo { get; set; } = true;

    public ICollection<Turno> Turnos { get; set; } = new List<Turno>();

    // Talleres en los que los alumnos de ESTE taller pueden recuperar clases
    public ICollection<TallerRecuperacionPermitida> RecuperacionesPermitidas { get; set; } = new List<TallerRecuperacionPermitida>();
}
