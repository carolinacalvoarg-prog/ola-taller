using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OlaCore.Models;
using OlaInfrastructure.Data;

namespace OlaAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TurnosController : ControllerBase
{
    private readonly OlaDbContext _context;

    public TurnosController(OlaDbContext context)
    {
        _context = context;
    }

    // GET: api/Turnos
    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetTurnos()
    {
        var turnos = await _context.Turnos
            .Include(t => t.Profesor)
            .Include(t => t.Inscripciones)
            .Where(t => t.Activo)
            .Select(t => new
            {
                t.Id,
                t.DiaSemana,
                t.HoraInicio,
                t.HoraFin,
                t.CuposMaximos,
                t.Activo,
                Profesor = t.Profesor != null ? new
                {
                    t.Profesor.Id,
                    t.Profesor.Nombre,
                    t.Profesor.Apellido
                } : null,
                CuposOcupados = t.Inscripciones.Count(i => i.Activa),
                CuposDisponibles = t.CuposMaximos - t.Inscripciones.Count(i => i.Activa)
            })
            .OrderBy(t => t.DiaSemana)
            .ThenBy(t => t.HoraInicio)
            .ToListAsync();

        return Ok(turnos);
    }

    // GET: api/Turnos/5
    [HttpGet("{id}")]
    public async Task<ActionResult<Turno>> GetTurno(int id)
    {
        var turno = await _context.Turnos
            .Include(t => t.Profesor)
            .Include(t => t.Inscripciones)
                .ThenInclude(i => i.Alumno)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (turno == null)
        {
            return NotFound();
        }

        return turno;
    }

    // POST: api/Turnos
    [HttpPost]
    public async Task<ActionResult<Turno>> PostTurno(Turno turno)
    {
        turno.Activo = true;
        _context.Turnos.Add(turno);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetTurno), new { id = turno.Id }, turno);
    }

    // PUT: api/Turnos/5
    [HttpPut("{id}")]
    public async Task<IActionResult> PutTurno(int id, Turno turno)
    {
        if (id != turno.Id)
        {
            return BadRequest();
        }

        _context.Entry(turno).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!TurnoExists(id))
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

    // DELETE: api/Turnos/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTurno(int id)
    {
        var turno = await _context.Turnos.FindAsync(id);
        if (turno == null)
        {
            return NotFound();
        }

        turno.Activo = false;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private bool TurnoExists(int id)
    {
        return _context.Turnos.Any(e => e.Id == id);
    }
}
