using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OlaCore.Models;
using OlaInfrastructure.Data;

namespace OlaAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TalleresController : ControllerBase
{
    private readonly OlaDbContext _context;

    public TalleresController(OlaDbContext context)
    {
        _context = context;
    }

    // GET: api/Talleres
    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetTalleres()
    {
        var talleres = await _context.Talleres
            .OrderBy(t => t.Nombre)
            .Select(t => new
            {
                t.Id,
                t.Nombre,
                t.Activo,
                CantidadTurnos = t.Turnos.Count(tu => tu.Activo)
            })
            .ToListAsync();

        // Cargar permisos de recuperación en query separada
        var tallerIds = talleres.Select(t => t.Id).ToList();
        var permisos = await _context.TalleresRecuperacionPermitida
            .Where(p => tallerIds.Contains(p.TallerId))
            .Select(p => new { p.TallerId, p.TallerPermitidoId })
            .ToListAsync();
        var permisosPorTaller = permisos
            .GroupBy(p => p.TallerId)
            .ToDictionary(g => g.Key, g => g.Select(p => p.TallerPermitidoId).ToList());

        var resultado = talleres.Select(t => new
        {
            t.Id,
            t.Nombre,
            t.Activo,
            t.CantidadTurnos,
            TalleresRecuperacionPermitidos = permisosPorTaller.GetValueOrDefault(t.Id, new List<int>())
        }).ToList();

        return Ok(resultado);
    }

    // GET: api/Talleres/5
    [HttpGet("{id}")]
    public async Task<ActionResult<object>> GetTaller(int id)
    {
        var taller = await _context.Talleres
            .Where(t => t.Id == id)
            .Select(t => new
            {
                t.Id,
                t.Nombre,
                t.Activo
            })
            .FirstOrDefaultAsync();

        if (taller == null)
            return NotFound();

        return Ok(taller);
    }

    // POST: api/Talleres
    [HttpPost]
    public async Task<ActionResult<object>> CreateTaller([FromBody] TallerDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Nombre))
            return BadRequest(new { message = "El nombre es requerido." });

        var taller = new Taller
        {
            Nombre = dto.Nombre.Trim(),
            Activo = true
        };

        _context.Talleres.Add(taller);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetTaller), new { id = taller.Id }, new
        {
            taller.Id,
            taller.Nombre,
            taller.Activo
        });
    }

    // PUT: api/Talleres/5
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTaller(int id, [FromBody] TallerDto dto)
    {
        var taller = await _context.Talleres.FindAsync(id);
        if (taller == null)
            return NotFound();

        if (string.IsNullOrWhiteSpace(dto.Nombre))
            return BadRequest(new { message = "El nombre es requerido." });

        taller.Nombre = dto.Nombre.Trim();
        if (dto.Activo.HasValue)
            taller.Activo = dto.Activo.Value;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    // ── Permisos de Recuperación ─────────────────────────────────────────────

    // POST: api/Talleres/5/recuperaciones   body: { "tallerPermitidoId": 3 }
    [HttpPost("{id}/recuperaciones")]
    public async Task<IActionResult> AddRecuperacionPermitida(int id, [FromBody] RecuperacionPermitidaDto dto)
    {
        var taller = await _context.Talleres.FindAsync(id);
        if (taller == null)
            return NotFound();

        if (id == dto.TallerPermitidoId)
            return BadRequest(new { message = "No es necesario configurar el propio taller (siempre está permitido)." });

        var tallerPermitido = await _context.Talleres.FindAsync(dto.TallerPermitidoId);
        if (tallerPermitido == null)
            return BadRequest(new { message = "El taller destino no existe." });

        var yaExiste = await _context.TalleresRecuperacionPermitida
            .AnyAsync(p => p.TallerId == id && p.TallerPermitidoId == dto.TallerPermitidoId);
        if (yaExiste)
            return BadRequest(new { message = "Ese permiso ya está configurado." });

        _context.TalleresRecuperacionPermitida.Add(new TallerRecuperacionPermitida
        {
            TallerId = id,
            TallerPermitidoId = dto.TallerPermitidoId
        });
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // DELETE: api/Talleres/5/recuperaciones/3
    [HttpDelete("{id}/recuperaciones/{tallerPermitidoId}")]
    public async Task<IActionResult> DeleteRecuperacionPermitida(int id, int tallerPermitidoId)
    {
        var permiso = await _context.TalleresRecuperacionPermitida
            .FirstOrDefaultAsync(p => p.TallerId == id && p.TallerPermitidoId == tallerPermitidoId);

        if (permiso == null)
            return NotFound();

        _context.TalleresRecuperacionPermitida.Remove(permiso);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // DELETE: api/Talleres/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTaller(int id)
    {
        var taller = await _context.Talleres.FindAsync(id);
        if (taller == null)
            return NotFound();

        var tieneTurnos = await _context.Turnos.AnyAsync(t => t.TallerId == id && t.Activo);
        if (tieneTurnos)
            return BadRequest(new { message = "No se puede eliminar un taller que tiene clases activas." });

        _context.Talleres.Remove(taller);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}

public class TallerDto
{
    public string Nombre { get; set; } = string.Empty;
    public bool? Activo { get; set; }
}

public class RecuperacionPermitidaDto
{
    public int TallerPermitidoId { get; set; }
}
