using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OlaCore.Models;
using OlaInfrastructure.Data;

namespace OlaAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AsistenciasController : ControllerBase
{
    private readonly OlaDbContext _context;

    public AsistenciasController(OlaDbContext context)
    {
        _context = context;
    }

    // POST: api/Asistencias
    [HttpPost]
    public async Task<ActionResult<Asistencia>> PostAsistencia(Asistencia asistencia)
    {
        asistencia.FechaRegistro = DateTime.UtcNow;

        _context.Asistencias.Add(asistencia);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAsistencia), new { id = asistencia.Id }, asistencia);
    }

    // POST: api/Asistencias/marcar-multiple
    [HttpPost("marcar-multiple")]
    public async Task<ActionResult> MarcarAsistenciaMultiple([FromBody] List<Asistencia> asistencias)
    {
        foreach (var asistencia in asistencias)
        {
            // Verificar si ya existe una asistencia para este alumno, turno y fecha
            var existente = await _context.Asistencias
                .FirstOrDefaultAsync(a => a.AlumnoId == asistencia.AlumnoId &&
                                          a.TurnoId == asistencia.TurnoId &&
                                          a.Fecha.Date == asistencia.Fecha.Date);

            if (existente != null)
            {
                // Actualizar existente
                existente.Presente = asistencia.Presente;
                existente.Observaciones = asistencia.Observaciones;
                existente.FechaRegistro = DateTime.UtcNow;
            }
            else
            {
                // Crear nueva
                asistencia.FechaRegistro = DateTime.UtcNow;
                _context.Asistencias.Add(asistencia);
            }

            // Registrar actividad
            _context.Actividades.Add(new Actividad
            {
                Tipo = asistencia.Presente ? "asistencia" : "inasistencia",
                AlumnoId = asistencia.AlumnoId,
                TurnoId = asistencia.TurnoId,
                Fecha = DateTime.UtcNow
            });
        }

        await _context.SaveChangesAsync();

        return Ok(new { mensaje = "Asistencias registradas correctamente" });
    }

    // GET: api/Asistencias/5
    [HttpGet("{id}")]
    public async Task<ActionResult<Asistencia>> GetAsistencia(int id)
    {
        var asistencia = await _context.Asistencias
            .Include(a => a.Alumno)
            .Include(a => a.Turno)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (asistencia == null)
        {
            return NotFound();
        }

        return asistencia;
    }

    // GET: api/Asistencias/turno/5?fecha=2024-12-26
    [HttpGet("turno/{turnoId}")]
    public async Task<ActionResult<IEnumerable<Asistencia>>> GetAsistenciasByTurnoYFecha(
        int turnoId, 
        [FromQuery] DateTime fecha)
    {
        var asistencias = await _context.Asistencias
            .Include(a => a.Alumno)
            .Where(a => a.TurnoId == turnoId && a.Fecha.Date == fecha.Date)
            .ToListAsync();

        return Ok(asistencias);
    }

    // GET: api/Asistencias/alumno/5
    [HttpGet("alumno/{alumnoId}")]
    public async Task<ActionResult<IEnumerable<Asistencia>>> GetAsistenciasByAlumno(int alumnoId)
    {
        var asistencias = await _context.Asistencias
            .Include(a => a.Turno)
            .Where(a => a.AlumnoId == alumnoId)
            .OrderByDescending(a => a.Fecha)
            .ToListAsync();

        return Ok(asistencias);
    }

    // GET: api/Asistencias/reporte/alumno/5
    [HttpGet("reporte/alumno/{alumnoId}")]
    public async Task<ActionResult<object>> GetReporteAsistenciaAlumno(int alumnoId)
    {
        var totalAsistencias = await _context.Asistencias
            .Where(a => a.AlumnoId == alumnoId)
            .CountAsync();

        var totalPresentes = await _context.Asistencias
            .Where(a => a.AlumnoId == alumnoId && a.Presente)
            .CountAsync();

        var totalAusentes = totalAsistencias - totalPresentes;
        var porcentajeAsistencia = totalAsistencias > 0
            ? (totalPresentes * 100.0 / totalAsistencias)
            : 0;

        return Ok(new
        {
            TotalClases = totalAsistencias,
            Presentes = totalPresentes,
            Ausentes = totalAusentes,
            PorcentajeAsistencia = Math.Round(porcentajeAsistencia, 2)
        });
    }

    // GET: api/Asistencias/historial/turno/5
    [HttpGet("historial/turno/{turnoId}")]
    public async Task<ActionResult<IEnumerable<object>>> GetHistorialAsistenciasByTurno(int turnoId)
    {
        var unMesAtras = DateTime.UtcNow.AddMonths(-1);

        var historial = await _context.Asistencias
            .Where(a => a.TurnoId == turnoId && a.Fecha >= unMesAtras)
            .GroupBy(a => a.Fecha.Date)
            .Select(g => new
            {
                Fecha = g.Key,
                Presentes = g.Count(a => a.Presente),
                Ausentes = g.Count(a => !a.Presente),
                Total = g.Count()
            })
            .OrderByDescending(x => x.Fecha)
            .ToListAsync();

        return Ok(historial);
    }
}
