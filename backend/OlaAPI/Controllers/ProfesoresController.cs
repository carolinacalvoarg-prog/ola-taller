using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OlaCore.Models;
using OlaInfrastructure.Data;

namespace OlaAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProfesoresController : ControllerBase
{
    private readonly OlaDbContext _context;

    public ProfesoresController(OlaDbContext context)
    {
        _context = context;
    }

    // GET: api/Profesores
    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetProfesores()
    {
        return await _context.Profesores
            .Where(p => p.Activo)
            .OrderBy(p => p.Apellido)
            .ThenBy(p => p.Nombre)
            .Select(p => new
            {
                p.Id,
                p.Nombre,
                p.Apellido,
                p.Email,
                p.Telefono,
                p.Activo
            })
            .ToListAsync();
    }

    // GET: api/Profesores/5
    [HttpGet("{id}")]
    public async Task<ActionResult<object>> GetProfesor(int id)
    {
        var profesor = await _context.Profesores
            .Where(p => p.Id == id)
            .Select(p => new
            {
                p.Id,
                p.Nombre,
                p.Apellido,
                p.Email,
                p.Telefono,
                p.Activo
            })
            .FirstOrDefaultAsync();

        if (profesor == null)
        {
            return NotFound();
        }

        return profesor;
    }

    // POST: api/Profesores
    [HttpPost]
    public async Task<ActionResult<Profesor>> PostProfesor(Profesor profesor)
    {
        profesor.Activo = true;

        _context.Profesores.Add(profesor);
        await _context.SaveChangesAsync();

        // Crear Usuario automaticamente
        var usuario = new Usuario
        {
            Email = profesor.Email,
            PasswordHash = AuthController.GetDefaultPasswordHash(),
            Rol = "Profesor",
            ProfesorId = profesor.Id,
            Activo = true
        };
        _context.Usuarios.Add(usuario);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetProfesor), new { id = profesor.Id }, profesor);
    }

    // PUT: api/Profesores/5
    [HttpPut("{id}")]
    public async Task<IActionResult> PutProfesor(int id, Profesor profesor)
    {
        if (id != profesor.Id)
        {
            return BadRequest();
        }

        _context.Entry(profesor).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!ProfesorExists(id))
            {
                return NotFound();
            }
            else
            {
                throw;
            }
        }

        return NoContent();
    }

    // DELETE: api/Profesores/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteProfesor(int id)
    {
        var profesor = await _context.Profesores.FindAsync(id);
        if (profesor == null)
        {
            return NotFound();
        }

        profesor.Activo = false;

        // Desactivar Usuario asociado
        var usuario = await _context.Usuarios.FirstOrDefaultAsync(u => u.ProfesorId == id);
        if (usuario != null)
        {
            usuario.Activo = false;
        }

        await _context.SaveChangesAsync();

        return NoContent();
    }

    private bool ProfesorExists(int id)
    {
        return _context.Profesores.Any(e => e.Id == id);
    }
}
