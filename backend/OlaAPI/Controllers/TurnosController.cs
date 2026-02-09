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
    public async Task<ActionResult<IEnumerable<object>>> GetTurnos([FromQuery] bool incluirFechas = false)
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
            .ToListAsync();

        // Ordenar en memoria porque SQLite no soporta ORDER BY con TimeSpan
        var turnosOrdenados = turnos
            .OrderBy(t => t.DiaSemana)
            .ThenBy(t => t.HoraInicio)
            .ToList();

        if (!incluirFechas)
            return Ok(turnosOrdenados);

        // Calcular próximas 4 fechas por turno, excluyendo días sin clase
        var hoy = DateTime.UtcNow.Date;
        var hasta = hoy.AddMonths(3);
        var diasSinClaseSet = new HashSet<DateTime>(
            await _context.DiasSinClase
                .Where(d => d.Fecha >= hoy && d.Fecha < hasta)
                .Select(d => d.Fecha.Date)
                .ToListAsync()
        );

        var resultado = turnosOrdenados.Select(t =>
        {
            var diaSemana = (int)t.DiaSemana;
            var actual = hoy;
            var diaActual = (int)actual.DayOfWeek;
            var diasSumar = (diaSemana - diaActual + 7) % 7;
            // Si es hoy, incluir solo si la clase aún no empezó
            if (diasSumar == 0 && DateTime.UtcNow.TimeOfDay >= t.HoraInicio)
                diasSumar = 7;
            actual = actual.AddDays(diasSumar);

            var fechas = new List<DateTime>();
            while (fechas.Count < 4 && actual < hasta)
            {
                if (!diasSinClaseSet.Contains(actual))
                    fechas.Add(actual);
                actual = actual.AddDays(7);
            }

            return new
            {
                t.Id,
                t.DiaSemana,
                t.HoraInicio,
                t.HoraFin,
                t.CuposMaximos,
                t.Activo,
                t.Profesor,
                t.CuposOcupados,
                t.CuposDisponibles,
                ProximasFechas = fechas
            };
        }).ToList();

        return Ok(resultado);
    }

    // GET: api/Turnos/profesor/5
    [HttpGet("profesor/{profesorId}")]
    public async Task<ActionResult<IEnumerable<object>>> GetTurnosByProfesor(int profesorId)
    {
        var turnos = await _context.Turnos
            .Include(t => t.Inscripciones)
                .ThenInclude(i => i.Alumno)
            .Where(t => t.Activo && t.ProfesorId == profesorId)
            .Select(t => new
            {
                t.Id,
                t.DiaSemana,
                t.HoraInicio,
                t.HoraFin,
                t.CuposMaximos,
                Alumnos = t.Inscripciones
                    .Where(i => i.Activa && i.Alumno != null)
                    .Select(i => new
                    {
                        i.Alumno!.Id,
                        i.Alumno.Nombre,
                        i.Alumno.Apellido
                    })
                    .ToList()
            })
            .ToListAsync();

        var turnosOrdenados = turnos
            .OrderBy(t => t.DiaSemana)
            .ThenBy(t => t.HoraInicio)
            .ToList();

        return Ok(turnosOrdenados);
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
