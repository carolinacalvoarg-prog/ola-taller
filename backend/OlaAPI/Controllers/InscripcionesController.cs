using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OlaCore.Models;
using OlaInfrastructure.Data;

namespace OlaAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InscripcionesController : ControllerBase
{
    private readonly OlaDbContext _context;

    public InscripcionesController(OlaDbContext context)
    {
        _context = context;
    }

    // POST: api/Inscripciones
    [HttpPost]
    public async Task<ActionResult<Inscripcion>> PostInscripcion(Inscripcion inscripcion)
    {
        // Verificar que el turno existe y está activo
        var turno = await _context.Turnos
            .Include(t => t.Inscripciones.Where(i => i.Activa))
            .FirstOrDefaultAsync(t => t.Id == inscripcion.TurnoId);

        if (turno == null || !turno.Activo)
        {
            return BadRequest("El turno no existe o no está activo.");
        }

        // Verificar cupos disponibles
        var cuposOcupados = turno.Inscripciones.Count;
        if (cuposOcupados >= turno.CuposMaximos)
        {
            return BadRequest("No hay cupos disponibles para este turno.");
        }

        // Verificar que el alumno no esté ya inscrito en este turno
        var inscripcionExistente = await _context.Inscripciones
            .AnyAsync(i => i.AlumnoId == inscripcion.AlumnoId && 
                          i.TurnoId == inscripcion.TurnoId && 
                          i.Activa);

        if (inscripcionExistente)
        {
            return BadRequest("El alumno ya está inscrito en este turno.");
        }

        inscripcion.FechaInscripcion = DateTime.UtcNow;
        inscripcion.Activa = true;

        _context.Inscripciones.Add(inscripcion);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetInscripcion), new { id = inscripcion.Id }, inscripcion);
    }

    // GET: api/Inscripciones/5
    [HttpGet("{id}")]
    public async Task<ActionResult<Inscripcion>> GetInscripcion(int id)
    {
        var inscripcion = await _context.Inscripciones
            .Include(i => i.Alumno)
            .Include(i => i.Turno)
            .FirstOrDefaultAsync(i => i.Id == id);

        if (inscripcion == null)
        {
            return NotFound();
        }

        return inscripcion;
    }

    // DELETE: api/Inscripciones/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> CancelarInscripcion(int id)
    {
        var inscripcion = await _context.Inscripciones.FindAsync(id);
        if (inscripcion == null)
        {
            return NotFound();
        }

        inscripcion.Activa = false;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    // GET: api/Inscripciones/alumno/5
    [HttpGet("alumno/{alumnoId}")]
    public async Task<ActionResult<IEnumerable<Inscripcion>>> GetInscripcionesByAlumno(int alumnoId)
    {
        var inscripciones = await _context.Inscripciones
            .Include(i => i.Turno)
                .ThenInclude(t => t.Profesor)
            .Where(i => i.AlumnoId == alumnoId && i.Activa)
            .ToListAsync();

        return Ok(inscripciones);
    }

    // GET: api/Inscripciones/turno/5
    [HttpGet("turno/{turnoId}")]
    public async Task<ActionResult<IEnumerable<Inscripcion>>> GetInscripcionesByTurno(int turnoId)
    {
        var inscripciones = await _context.Inscripciones
            .Include(i => i.Alumno)
            .Where(i => i.TurnoId == turnoId && i.Activa)
            .ToListAsync();

        return Ok(inscripciones);
    }
}
