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

        // Verificar que el alumno no esté ya inscrito en este turno
        var inscripcionExistente = await _context.Inscripciones
            .AnyAsync(i => i.AlumnoId == dto.AlumnoId &&
                          i.TurnoId == dto.TurnoId &&
                          i.Activa);

        if (inscripcionExistente)
        {
            return BadRequest("El alumno ya está inscrito en este turno.");
        }

        // Crear la inscripcion de recuperacion
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
            .Select(i => new
            {
                i.Id,
                i.AlumnoId,
                i.TurnoId,
                i.FechaInscripcion,
                i.Activa,
                Turno = i.Turno != null ? new
                {
                    i.Turno.Id,
                    i.Turno.DiaSemana,
                    i.Turno.HoraInicio,
                    i.Turno.HoraFin,
                    i.Turno.CuposMaximos
                } : null
            })
            .ToListAsync();

        return Ok(inscripciones);
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
