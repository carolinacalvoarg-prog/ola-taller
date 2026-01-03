using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OlaCore.Models;
using OlaInfrastructure.Data;

namespace OlaAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AlumnosController : ControllerBase
{
    private readonly OlaDbContext _context;

    public AlumnosController(OlaDbContext context)
    {
        _context = context;
    }

    // GET: api/Alumnos
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Alumno>>> GetAlumnos()
    {
        return await _context.Alumnos
            .Where(a => a.Activo)
            .OrderBy(a => a.Apellido)
            .ThenBy(a => a.Nombre)
            .ToListAsync();
    }

    // GET: api/Alumnos/5
    [HttpGet("{id}")]
    public async Task<ActionResult<Alumno>> GetAlumno(int id)
    {
        var alumno = await _context.Alumnos
            .Include(a => a.Inscripciones)
                .ThenInclude(i => i.Turno)
            .Include(a => a.Pagos)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (alumno == null)
        {
            return NotFound();
        }

        return alumno;
    }

    // POST: api/Alumnos
    [HttpPost]
    public async Task<ActionResult<Alumno>> PostAlumno(Alumno alumno)
    {
        alumno.FechaRegistro = DateTime.UtcNow;
        alumno.Activo = true;

        _context.Alumnos.Add(alumno);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAlumno), new { id = alumno.Id }, alumno);
    }

    // PUT: api/Alumnos/5
    [HttpPut("{id}")]
    public async Task<IActionResult> PutAlumno(int id, Alumno alumno)
    {
        if (id != alumno.Id)
        {
            return BadRequest();
        }

        _context.Entry(alumno).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!AlumnoExists(id))
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

    // DELETE: api/Alumnos/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteAlumno(int id)
    {
        var alumno = await _context.Alumnos.FindAsync(id);
        if (alumno == null)
        {
            return NotFound();
        }

        alumno.Activo = false;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private bool AlumnoExists(int id)
    {
        return _context.Alumnos.Any(e => e.Id == id);
    }
}
