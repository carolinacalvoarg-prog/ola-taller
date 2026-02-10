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

        // Calcular próximas fechas por turno (mes actual + siguiente), excluyendo días sin clase
        var hoy = DateTime.UtcNow.Date;
        var hasta = new DateTime(hoy.Year, hoy.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(2);
        var diasSinClaseSet = new HashSet<DateTime>(
            await _context.DiasSinClase
                .Where(d => d.Fecha >= hoy && d.Fecha < hasta)
                .Select(d => d.Fecha.Date)
                .ToListAsync()
        );

        // Cargar ausencias programadas para calcular cupos por fecha
        var ausenciasPorTurnoFecha = await _context.AusenciasProgramadas
            .Include(a => a.Inscripcion)
            .Where(a => a.Fecha >= hoy && a.Fecha < hasta && a.Inscripcion!.Activa)
            .GroupBy(a => new { a.Inscripcion!.TurnoId, Fecha = a.Fecha.Date })
            .Select(g => new { g.Key.TurnoId, g.Key.Fecha, Count = g.Count() })
            .ToListAsync();
        var ausenciasLookup = ausenciasPorTurnoFecha
            .ToDictionary(a => $"{a.TurnoId}-{a.Fecha:yyyy-MM-dd}", a => a.Count);

        // Cargar recuperaciones programadas para restarlas de los cupos
        var recuperacionesPorTurnoFecha = await _context.RecuperacionesProgramadas
            .Where(r => r.Fecha >= hoy && r.Fecha < hasta)
            .GroupBy(r => new { r.TurnoId, Fecha = r.Fecha.Date })
            .Select(g => new { g.Key.TurnoId, g.Key.Fecha, Count = g.Count() })
            .ToListAsync();
        var recuperacionesLookup = recuperacionesPorTurnoFecha
            .ToDictionary(r => $"{r.TurnoId}-{r.Fecha:yyyy-MM-dd}", r => r.Count);

        var resultado = turnosOrdenados.Select(t =>
        {
            var diaSemana = (int)t.DiaSemana;
            var actual = hoy;
            var diaActual = (int)actual.DayOfWeek;
            var diasSumar = (diaSemana - diaActual + 7) % 7;
            // Si es hoy, incluir solo si la clase aún no terminó (hora Argentina UTC-3)
            var ahoraArgentina = DateTime.UtcNow.AddHours(-3);
            if (diasSumar == 0 && ahoraArgentina.TimeOfDay >= t.HoraFin)
                diasSumar = 7;
            actual = actual.AddDays(diasSumar);

            var fechas = new List<object>();
            while (fechas.Count < 9 && actual < hasta)
            {
                if (!diasSinClaseSet.Contains(actual))
                {
                    var key = $"{t.Id}-{actual:yyyy-MM-dd}";
                    var ausencias = ausenciasLookup.GetValueOrDefault(key, 0);
                    var recuperaciones = recuperacionesLookup.GetValueOrDefault(key, 0);
                    fechas.Add(new
                    {
                        Fecha = actual,
                        CuposDisponibles = t.CuposDisponibles + ausencias - recuperaciones
                    });
                }
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
