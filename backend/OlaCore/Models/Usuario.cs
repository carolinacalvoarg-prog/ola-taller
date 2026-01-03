namespace OlaCore.Models;

public class Usuario
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Rol { get; set; } = string.Empty; // Admin, Profesor, Alumno
    public int? AlumnoId { get; set; }
    public int? ProfesorId { get; set; }
    public bool Activo { get; set; }
    
    // Relaciones opcionales
    public Alumno? Alumno { get; set; }
    public Profesor? Profesor { get; set; }
}
