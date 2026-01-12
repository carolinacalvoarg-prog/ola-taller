using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OlaCore.Models;
using OlaInfrastructure.Data;
using System.Security.Cryptography;
using System.Text;

namespace OlaAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly OlaDbContext _context;
    private const string DefaultPassword = "olataller";

    public AuthController(OlaDbContext context)
    {
        _context = context;
    }

    // POST: api/Auth/login
    [HttpPost("login")]
    public async Task<ActionResult<object>> Login([FromBody] LoginRequest request)
    {
        var usuario = await _context.Usuarios
            .Where(u => u.Email == request.Email && u.Activo)
            .Select(u => new
            {
                u.Id,
                u.Email,
                u.PasswordHash,
                u.Rol,
                u.AlumnoId,
                u.ProfesorId
            })
            .FirstOrDefaultAsync();

        if (usuario == null)
        {
            return Unauthorized(new { message = "Email o contraseña incorrectos" });
        }

        var passwordHash = HashPassword(request.Password);
        if (usuario.PasswordHash != passwordHash)
        {
            return Unauthorized(new { message = "Email o contraseña incorrectos" });
        }

        // Get additional info based on role
        string nombre = "";
        string apellido = "";

        if (usuario.Rol == "Alumno" && usuario.AlumnoId.HasValue)
        {
            var alumno = await _context.Alumnos
                .Where(a => a.Id == usuario.AlumnoId.Value)
                .Select(a => new { a.Nombre, a.Apellido })
                .FirstOrDefaultAsync();
            if (alumno != null)
            {
                nombre = alumno.Nombre;
                apellido = alumno.Apellido;
            }
        }
        else if (usuario.Rol == "Profesor" && usuario.ProfesorId.HasValue)
        {
            var profesor = await _context.Profesores
                .Where(p => p.Id == usuario.ProfesorId.Value)
                .Select(p => new { p.Nombre, p.Apellido })
                .FirstOrDefaultAsync();
            if (profesor != null)
            {
                nombre = profesor.Nombre;
                apellido = profesor.Apellido;
            }
        }
        else if (usuario.Rol == "Admin")
        {
            nombre = "Administrador";
            apellido = "";
        }

        return Ok(new
        {
            usuario.Id,
            usuario.Email,
            usuario.Rol,
            Nombre = nombre,
            Apellido = apellido,
            AlumnoId = usuario.AlumnoId,
            ProfesorId = usuario.ProfesorId
        });
    }

    // PUT: api/Auth/change-password/5
    [HttpPut("change-password/{id}")]
    public async Task<IActionResult> ChangePassword(int id, [FromBody] ChangePasswordRequest request)
    {
        var usuario = await _context.Usuarios.FindAsync(id);
        if (usuario == null)
        {
            return NotFound();
        }

        usuario.PasswordHash = HashPassword(request.NewPassword);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    // GET: api/Auth/usuarios
    [HttpGet("usuarios")]
    public async Task<ActionResult<IEnumerable<object>>> GetUsuarios()
    {
        var usuarios = await _context.Usuarios
            .Where(u => u.Activo)
            .Select(u => new
            {
                u.Id,
                u.Email,
                u.Rol,
                u.AlumnoId,
                u.ProfesorId
            })
            .ToListAsync();

        return Ok(usuarios);
    }

    // Helper method to hash passwords
    public static string HashPassword(string password)
    {
        using var sha256 = SHA256.Create();
        var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
        return Convert.ToBase64String(hashedBytes);
    }

    // Helper method to create default password hash
    public static string GetDefaultPasswordHash()
    {
        return HashPassword(DefaultPassword);
    }
}

public class LoginRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class ChangePasswordRequest
{
    public string NewPassword { get; set; } = string.Empty;
}
