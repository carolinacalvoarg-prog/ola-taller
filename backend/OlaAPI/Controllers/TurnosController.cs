using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OlaCore.Models;
using OlaInfrastructure.Data;
using OlaAPI.Helpers;

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
        var turnosRaw = await _context.Turnos
            .Include(t => t.Profesor)
            .Include(t => t.Taller)
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
                t.UsarFechasManuales,
                TallerId = t.TallerId,
                TallerNombre = t.Taller != null ? t.Taller.Nombre : null,
                Profesor = t.Profesor != null ? new
                {
                    t.Profesor.Id,
                    t.Profesor.Nombre,
                    t.Profesor.Apellido
                } : null,
                CuposOcupados = t.Inscripciones.Count(i => i.Activa),
                CuposDisponibles = t.CuposMaximos - t.Inscripciones.Count(i => i.Activa),
            })
            .ToListAsync();

        // Cargar fechas manuales en una query separada (evita problemas con nested collections en SQLite)
        var turnoIds = turnosRaw.Select(t => t.Id).ToList();
        var fechasManualesRaw = await _context.TurnoFechas
            .Where(f => turnoIds.Contains(f.TurnoId))
            .OrderBy(f => f.Fecha)
            .ToListAsync();
        var fechasPorTurno = fechasManualesRaw
            .GroupBy(f => f.TurnoId)
            .ToDictionary(g => g.Key, g => g.Select(f => new { f.Id, f.Fecha }).ToList());

        var emptyFechas = new List<TurnoFechaItem>();
        var turnos = turnosRaw.Select(t => new
        {
            t.Id,
            t.DiaSemana,
            t.HoraInicio,
            t.HoraFin,
            t.CuposMaximos,
            t.Activo,
            t.UsarFechasManuales,
            t.TallerId,
            t.TallerNombre,
            t.Profesor,
            t.CuposOcupados,
            t.CuposDisponibles,
            FechasManuales = fechasPorTurno.ContainsKey(t.Id)
                ? fechasPorTurno[t.Id].Select(f => new TurnoFechaItem { Id = f.Id, Fecha = f.Fecha }).ToList()
                : emptyFechas
        });

        // Ordenar en memoria porque SQLite no soporta ORDER BY con TimeSpan
        var turnosOrdenados = turnos
            .OrderBy(t => t.DiaSemana)
            .ThenBy(t => t.HoraInicio)
            .ToList();

        if (!incluirFechas)
            return Ok(turnosOrdenados);

        // Calcular próximas fechas por turno (mes actual + siguiente), excluyendo días sin clase
        var hoy = TimeHelper.HoyArgentina();
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

        var ahoraArgentina = TimeHelper.AhoraArgentina();

        var resultado = turnosOrdenados.Select(t =>
        {
            List<object> fechas;

            if (t.UsarFechasManuales)
            {
                // Usar las fechas manuales cargadas, filtradas desde hoy
                fechas = t.FechasManuales
                    .Where(f =>
                    {
                        var fecha = DateTime.SpecifyKind(f.Fecha.Date, DateTimeKind.Utc);
                        if (fecha < hoy) return false;
                        if (diasSinClaseSet.Contains(fecha)) return false;
                        // Si es hoy, incluir solo si la clase aún no terminó
                        if (fecha == hoy && ahoraArgentina.TimeOfDay >= t.HoraFin) return false;
                        return true;
                    })
                    .OrderBy(f => f.Fecha)
                    .Select(f =>
                    {
                        var fecha = DateTime.SpecifyKind(f.Fecha.Date, DateTimeKind.Utc);
                        var key = $"{t.Id}-{fecha:yyyy-MM-dd}";
                        var ausencias = ausenciasLookup.GetValueOrDefault(key, 0);
                        var recuperaciones = recuperacionesLookup.GetValueOrDefault(key, 0);
                        return (object)new
                        {
                            Fecha = fecha,
                            CuposDisponibles = t.CuposDisponibles + ausencias - recuperaciones
                        };
                    })
                    .ToList();
            }
            else
            {
                // Calcular fechas automáticamente por día de semana
                var diaSemana = (int)t.DiaSemana;
                var actual = hoy;
                var diaActual = (int)actual.DayOfWeek;
                var diasSumar = (diaSemana - diaActual + 7) % 7;
                if (diasSumar == 0 && ahoraArgentina.TimeOfDay >= t.HoraFin)
                    diasSumar = 7;
                actual = actual.AddDays(diasSumar);

                fechas = new List<object>();
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
            }

            return new
            {
                t.Id,
                t.DiaSemana,
                t.HoraInicio,
                t.HoraFin,
                t.CuposMaximos,
                t.Activo,
                t.UsarFechasManuales,
                t.TallerId,
                t.TallerNombre,
                t.Profesor,
                t.CuposOcupados,
                t.CuposDisponibles,
                t.FechasManuales,
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
            .Include(t => t.Taller)
            .Where(t => t.Activo && t.ProfesorId == profesorId)
            .Select(t => new
            {
                t.Id,
                t.DiaSemana,
                t.HoraInicio,
                t.HoraFin,
                t.CuposMaximos,
                t.TallerId,
                TallerNombre = t.Taller != null ? t.Taller.Nombre : null,
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
            .Include(t => t.Taller)
            .Include(t => t.Inscripciones)
                .ThenInclude(i => i.Alumno)
            .Include(t => t.FechasManuales)
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

    // ── Fechas Manuales ─────────────────────────────────────────────────────────

    // GET: api/Turnos/5/fechas
    [HttpGet("{id}/fechas")]
    public async Task<ActionResult<IEnumerable<object>>> GetFechasManuales(int id)
    {
        if (!TurnoExists(id))
            return NotFound();

        var fechas = await _context.TurnoFechas
            .Where(f => f.TurnoId == id)
            .OrderBy(f => f.Fecha)
            .Select(f => new { f.Id, f.Fecha })
            .ToListAsync();

        return Ok(fechas);
    }

    // POST: api/Turnos/5/fechas
    [HttpPost("{id}/fechas")]
    public async Task<ActionResult<object>> AddFechaManual(int id, [FromBody] TurnoFechaDto dto)
    {
        var turno = await _context.Turnos.FindAsync(id);
        if (turno == null)
            return NotFound();

        var fecha = DateTime.SpecifyKind(dto.Fecha.Date, DateTimeKind.Utc);

        var yaExiste = await _context.TurnoFechas
            .AnyAsync(f => f.TurnoId == id && f.Fecha == fecha);
        if (yaExiste)
            return BadRequest(new { message = "Ya existe esa fecha para este turno." });

        var turnoFecha = new TurnoFecha
        {
            TurnoId = id,
            Fecha = fecha
        };

        _context.TurnoFechas.Add(turnoFecha);

        // Activar modo manual automáticamente si no estaba activado
        if (!turno.UsarFechasManuales)
        {
            turno.UsarFechasManuales = true;
        }

        await _context.SaveChangesAsync();

        return Ok(new { turnoFecha.Id, turnoFecha.Fecha });
    }

    // DELETE: api/Turnos/5/fechas/12
    [HttpDelete("{id}/fechas/{fechaId}")]
    public async Task<IActionResult> DeleteFechaManual(int id, int fechaId)
    {
        var turnoFecha = await _context.TurnoFechas
            .FirstOrDefaultAsync(f => f.Id == fechaId && f.TurnoId == id);

        if (turnoFecha == null)
            return NotFound();

        _context.TurnoFechas.Remove(turnoFecha);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private bool TurnoExists(int id)
    {
        return _context.Turnos.Any(e => e.Id == id);
    }
}

public class TurnoFechaDto
{
    public DateTime Fecha { get; set; }
}

public class TurnoFechaItem
{
    public int Id { get; set; }
    public DateTime Fecha { get; set; }
}
