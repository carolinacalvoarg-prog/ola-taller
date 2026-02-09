using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OlaCore.Models;
using OlaInfrastructure.Data;

namespace OlaAPI.Controllers;

public class CreateInscripcionDto
{
    public int AlumnoId { get; set; }
    public int TurnoId { get; set; }
}

public class CancelarProximasDto
{
    public int InscripcionId { get; set; }
    public int Cantidad { get; set; } = 1;
    public DateTime? Fecha { get; set; }
}

[ApiController]
[Route("api/[controller]")]
public class InscripcionesController : ControllerBase
{
    private readonly OlaDbContext _context;

    public InscripcionesController(OlaDbContext context)
    {
        _context = context;
    }

    /// <summary>Obtiene las próximas N fechas de clase para un turno, excluyendo días sin clase y (opcional) ausencias de la inscripción.</summary>
    private async Task<List<DateTime>> GetProximasFechasClaseAsync(int turnoId, int? inscripcionId, DateTime desde, int cantidad)
    {
        var turno = await _context.Turnos.FindAsync(turnoId);
        if (turno == null) return new List<DateTime>();

        var diaSemana = (int)turno.DiaSemana; // 0=Dom, 1=Lun, ...
        var hasta = desde.AddMonths(3);
        var diasSinClase = await _context.DiasSinClase
            .Where(d => d.Fecha >= desde && d.Fecha < hasta)
            .Select(d => d.Fecha.Date)
            .ToListAsync();
        var diasSinClaseSet = new HashSet<DateTime>(diasSinClase);

        var ausenciasSet = new HashSet<DateTime>();
        if (inscripcionId.HasValue)
        {
            var ausencias = await _context.AusenciasProgramadas
                .Where(a => a.InscripcionId == inscripcionId.Value && a.Fecha >= desde)
                .Select(a => a.Fecha.Date)
                .ToListAsync();
            ausenciasSet = new HashSet<DateTime>(ausencias);
        }

        var resultados = new List<DateTime>();
        var actual = desde.Date;
        // Primer día de la semana que coincide con el turno (hoy o después)
        var diaActual = (int)actual.DayOfWeek;
        var diasSumar = (diaSemana - diaActual + 7) % 7;
        // Si es hoy, incluir solo si la clase aún no terminó (hora Argentina UTC-3)
        var ahoraArgentina = DateTime.UtcNow.AddHours(-3);
        if (diasSumar == 0 && ahoraArgentina.TimeOfDay >= turno.HoraFin)
            diasSumar = 7;
        actual = actual.AddDays(diasSumar);

        while (resultados.Count < cantidad && actual < hasta)
        {
            if (!diasSinClaseSet.Contains(actual) && !ausenciasSet.Contains(actual))
                resultados.Add(actual);
            actual = actual.AddDays(7);
        }

        return resultados.Take(cantidad).ToList();
    }

    // POST: api/Inscripciones
    [HttpPost]
    public async Task<ActionResult<Inscripcion>> PostInscripcion(CreateInscripcionDto dto)
    {
        var inscripcion = new Inscripcion
        {
            AlumnoId = dto.AlumnoId,
            TurnoId = dto.TurnoId
        };
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

        // Registrar actividad
        _context.Actividades.Add(new Actividad
        {
            Tipo = "inscripcion",
            AlumnoId = inscripcion.AlumnoId,
            TurnoId = inscripcion.TurnoId,
            Fecha = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        // Retornar un objeto simple para evitar referencias circulares
        var result = new
        {
            inscripcion.Id,
            inscripcion.AlumnoId,
            inscripcion.TurnoId,
            inscripcion.FechaInscripcion,
            inscripcion.Activa
        };

        return CreatedAtAction(nameof(GetInscripcion), new { id = inscripcion.Id }, result);
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
        var inscripcion = await _context.Inscripciones
            .Include(i => i.Alumno)
            .FirstOrDefaultAsync(i => i.Id == id);
        if (inscripcion == null)
        {
            return NotFound();
        }

        inscripcion.Activa = false;

        // Incrementar clases pendientes de recuperar para el alumno
        if (inscripcion.Alumno != null)
        {
            inscripcion.Alumno.ClasesPendientesRecuperar++;
        }

        // Registrar actividad
        _context.Actividades.Add(new Actividad
        {
            Tipo = "cancelacion",
            AlumnoId = inscripcion.AlumnoId,
            TurnoId = inscripcion.TurnoId,
            Fecha = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        return NoContent();
    }

    // POST: api/Inscripciones/recuperacion
    [HttpPost("recuperacion")]
    public async Task<ActionResult<object>> InscribirRecuperacion(CreateInscripcionDto dto)
    {
        // Verificar que el alumno tiene clases pendientes de recuperar
        var alumno = await _context.Alumnos.FindAsync(dto.AlumnoId);
        if (alumno == null)
        {
            return NotFound("Alumno no encontrado.");
        }

        if (alumno.ClasesPendientesRecuperar <= 0)
        {
            return BadRequest("El alumno no tiene clases pendientes de recuperar.");
        }

        // Verificar que el turno existe y está activo
        var turno = await _context.Turnos
            .Include(t => t.Inscripciones.Where(i => i.Activa))
            .FirstOrDefaultAsync(t => t.Id == dto.TurnoId);

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

        // Verificar si el alumno ya está inscrito en este turno
        var inscripcionExistente = await _context.Inscripciones
            .FirstOrDefaultAsync(i => i.AlumnoId == dto.AlumnoId &&
                          i.TurnoId == dto.TurnoId &&
                          i.Activa);

        if (inscripcionExistente != null)
        {
            // Ya inscripto: buscar si tiene ausencias futuras para "descancelar"
            var hoy = DateTime.UtcNow.Date;
            var ausenciaFutura = await _context.AusenciasProgramadas
                .Where(a => a.InscripcionId == inscripcionExistente.Id && a.Fecha >= hoy)
                .OrderBy(a => a.Fecha)
                .FirstOrDefaultAsync();

            if (ausenciaFutura == null)
            {
                return BadRequest("El alumno ya está inscrito en este turno.");
            }

            // Remover la ausencia (re-asistir a esa fecha)
            _context.AusenciasProgramadas.Remove(ausenciaFutura);
            alumno.ClasesPendientesRecuperar--;

            _context.Actividades.Add(new Actividad
            {
                Tipo = "recuperacion",
                AlumnoId = dto.AlumnoId,
                TurnoId = dto.TurnoId,
                Fecha = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            return Ok(new
            {
                inscripcionExistente.Id,
                inscripcionExistente.AlumnoId,
                inscripcionExistente.TurnoId,
                inscripcionExistente.FechaInscripcion,
                inscripcionExistente.Activa,
                ClasesPendientesRecuperar = alumno.ClasesPendientesRecuperar
            });
        }

        // Crear la inscripcion de recuperacion en otro turno
        var inscripcion = new Inscripcion
        {
            AlumnoId = dto.AlumnoId,
            TurnoId = dto.TurnoId,
            FechaInscripcion = DateTime.UtcNow,
            Activa = true
        };

        _context.Inscripciones.Add(inscripcion);

        // Decrementar clases pendientes de recuperar
        alumno.ClasesPendientesRecuperar--;

        // Registrar actividad
        _context.Actividades.Add(new Actividad
        {
            Tipo = "recuperacion",
            AlumnoId = dto.AlumnoId,
            TurnoId = dto.TurnoId,
            Fecha = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        return Ok(new
        {
            inscripcion.Id,
            inscripcion.AlumnoId,
            inscripcion.TurnoId,
            inscripcion.FechaInscripcion,
            inscripcion.Activa,
            ClasesPendientesRecuperar = alumno.ClasesPendientesRecuperar
        });
    }

    // GET: api/Inscripciones/alumno/5
    [HttpGet("alumno/{alumnoId}")]
    public async Task<ActionResult<IEnumerable<object>>> GetInscripcionesByAlumno(int alumnoId)
    {
        var inscripciones = await _context.Inscripciones
            .Include(i => i.Turno)
            .Where(i => i.AlumnoId == alumnoId && i.Activa)
            .ToListAsync();

        var hoy = DateTime.UtcNow.Date;
        var resultado = new List<object>();
        foreach (var i in inscripciones)
        {
            var turno = i.Turno;
            var proximasFechas = new List<DateTime>();
            if (turno != null)
            {
                proximasFechas = await GetProximasFechasClaseAsync(turno.Id, i.Id, hoy, 4);
            }
            resultado.Add(new
            {
                i.Id,
                i.AlumnoId,
                i.TurnoId,
                i.FechaInscripcion,
                i.Activa,
                ProximasFechas = proximasFechas,
                Turno = turno != null ? new
                {
                    turno.Id,
                    turno.DiaSemana,
                    turno.HoraInicio,
                    turno.HoraFin,
                    turno.CuposMaximos
                } : null
            });
        }

        return Ok(resultado);
    }

    // POST: api/Inscripciones/cancelar-proximas
    [HttpPost("cancelar-proximas")]
    public async Task<ActionResult<object>> CancelarProximasClases(CancelarProximasDto dto)
    {
        if (dto.Cantidad < 1 || dto.Cantidad > 20)
            return BadRequest("Cantidad debe estar entre 1 y 20.");

        var inscripcion = await _context.Inscripciones
            .Include(i => i.Alumno)
            .Include(i => i.Turno)
            .FirstOrDefaultAsync(i => i.Id == dto.InscripcionId);
        if (inscripcion == null)
            return NotFound("Inscripción no encontrada.");
        if (!inscripcion.Activa)
            return BadRequest("La inscripción no está activa.");

        var hoy = DateTime.UtcNow.Date;

        List<DateTime> fechas;
        if (dto.Fecha.HasValue)
        {
            // Cancelar una fecha específica
            var fechaEspecifica = dto.Fecha.Value.Date;
            if (fechaEspecifica < hoy)
                return BadRequest("No se puede cancelar una fecha pasada.");

            var yaAusente = await _context.AusenciasProgramadas
                .AnyAsync(a => a.InscripcionId == inscripcion.Id && a.Fecha.Date == fechaEspecifica);
            if (yaAusente)
                return BadRequest("Esa fecha ya está cancelada.");

            fechas = new List<DateTime> { fechaEspecifica };
        }
        else
        {
            fechas = await GetProximasFechasClaseAsync(inscripcion.TurnoId, inscripcion.Id, hoy, dto.Cantidad);
        }

        if (fechas.Count == 0)
            return BadRequest("No hay fechas de clase próximas para cancelar.");

        foreach (var fecha in fechas)
        {
            _context.AusenciasProgramadas.Add(new AusenciaProgramada
            {
                InscripcionId = inscripcion.Id,
                Fecha = DateTime.SpecifyKind(fecha, DateTimeKind.Utc)
            });
        }

        if (inscripcion.Alumno != null)
            inscripcion.Alumno.ClasesPendientesRecuperar += fechas.Count;

        for (var i = 0; i < fechas.Count; i++)
        {
            _context.Actividades.Add(new Actividad
            {
                Tipo = "cancelacion",
                AlumnoId = inscripcion.AlumnoId,
                TurnoId = inscripcion.TurnoId,
                Fecha = DateTime.UtcNow
            });
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            InscripcionId = inscripcion.Id,
            CantidadCancelada = fechas.Count,
            Fechas = fechas,
            ClasesPendientesRecuperar = inscripcion.Alumno?.ClasesPendientesRecuperar ?? 0
        });
    }

    // GET: api/Inscripciones/turno/5
    [HttpGet("turno/{turnoId}")]
    public async Task<ActionResult<IEnumerable<object>>> GetInscripcionesByTurno(int turnoId)
    {
        var inscripciones = await _context.Inscripciones
            .Include(i => i.Alumno)
            .Where(i => i.TurnoId == turnoId && i.Activa)
            .Select(i => new
            {
                i.Id,
                i.AlumnoId,
                i.TurnoId,
                i.FechaInscripcion,
                i.Activa,
                Alumno = i.Alumno != null ? new
                {
                    i.Alumno.Id,
                    i.Alumno.Nombre,
                    i.Alumno.Apellido,
                    i.Alumno.Email,
                    i.Alumno.Telefono
                } : null
            })
            .ToListAsync();

        return Ok(inscripciones);
    }

    // GET: api/Inscripciones/actividades
    [HttpGet("actividades")]
    public async Task<ActionResult<IEnumerable<object>>> GetUltimasActividades([FromQuery] int limit = 10)
    {
        // Excluir asistencias e inasistencias del panel de administracion
        var tiposExcluidos = new[] { "asistencia", "inasistencia" };

        var actividades = await _context.Actividades
            .Include(a => a.Alumno)
            .Include(a => a.Turno)
            .Where(a => !tiposExcluidos.Contains(a.Tipo))
            .OrderByDescending(a => a.Fecha)
            .Take(limit)
            .Select(a => new
            {
                a.Id,
                a.Tipo,
                a.Fecha,
                Alumno = a.Alumno != null ? new
                {
                    a.Alumno.Id,
                    a.Alumno.Nombre,
                    a.Alumno.Apellido
                } : null,
                Turno = a.Turno != null ? new
                {
                    a.Turno.Id,
                    a.Turno.DiaSemana,
                    a.Turno.HoraInicio,
                    a.Turno.HoraFin
                } : null
            })
            .ToListAsync();

        return Ok(actividades);
    }

    // GET: api/Inscripciones/actividades/alumno/5
    [HttpGet("actividades/alumno/{alumnoId}")]
    public async Task<ActionResult<IEnumerable<object>>> GetActividadesByAlumno(
        int alumnoId,
        [FromQuery] int limit = 10,
        [FromQuery] string? tipo = null,
        [FromQuery] DateTime? fechaDesde = null,
        [FromQuery] DateTime? fechaHasta = null)
    {
        var query = _context.Actividades
            .Include(a => a.Turno)
            .Where(a => a.AlumnoId == alumnoId);

        // Filtro por tipo
        if (!string.IsNullOrEmpty(tipo))
        {
            query = query.Where(a => a.Tipo == tipo);
        }

        // Filtro por fecha desde
        if (fechaDesde.HasValue)
        {
            query = query.Where(a => a.Fecha >= fechaDesde.Value);
        }

        // Filtro por fecha hasta
        if (fechaHasta.HasValue)
        {
            var fechaHastaFin = fechaHasta.Value.Date.AddDays(1);
            query = query.Where(a => a.Fecha < fechaHastaFin);
        }

        var actividades = await query
            .OrderByDescending(a => a.Fecha)
            .Take(limit)
            .Select(a => new
            {
                a.Id,
                a.Tipo,
                a.Fecha,
                Turno = a.Turno != null ? new
                {
                    a.Turno.Id,
                    a.Turno.DiaSemana,
                    a.Turno.HoraInicio,
                    a.Turno.HoraFin
                } : null
            })
            .ToListAsync();

        return Ok(actividades);
    }
}
