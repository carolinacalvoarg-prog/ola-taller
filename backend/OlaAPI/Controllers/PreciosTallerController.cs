using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OlaInfrastructure.Data;
using OlaCore.Models;

namespace OlaAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PreciosTallerController : ControllerBase
{
    private readonly OlaDbContext _context;

    public PreciosTallerController(OlaDbContext context)
    {
        _context = context;
    }

    // GET api/precios-taller
    // Devuelve el precio vigente de cada taller activo
    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetActuales()
    {
        var talleres = await _context.Talleres
            .Where(t => t.Activo)
            .ToListAsync();

        var hoy = DateTime.UtcNow.Date;

        var resultado = new List<object>();

        foreach (var taller in talleres)
        {
            var precio = await _context.PreciosTaller
                .Where(p => p.TallerId == taller.Id && p.VigenteDesde.Date <= hoy)
                .OrderByDescending(p => p.VigenteDesde)
                .FirstOrDefaultAsync();

            resultado.Add(new
            {
                tallerId = taller.Id,
                tallerNombre = taller.Nombre,
                precioTransferencia = precio?.PrecioTransferencia ?? 0,
                precioEfectivo = precio?.PrecioEfectivo ?? 0,
                vigenteDesde = precio?.VigenteDesde,
                sinPrecio = precio == null
            });
        }

        return Ok(resultado);
    }

    // GET api/precios-taller/{tallerId}/historial
    [HttpGet("{tallerId}/historial")]
    public async Task<ActionResult<IEnumerable<object>>> GetHistorial(int tallerId)
    {
        var historial = await _context.PreciosTaller
            .Where(p => p.TallerId == tallerId)
            .OrderByDescending(p => p.VigenteDesde)
            .Select(p => new
            {
                p.Id,
                p.TallerId,
                p.VigenteDesde,
                p.PrecioTransferencia,
                p.PrecioEfectivo
            })
            .ToListAsync();

        return Ok(historial);
    }

    // POST api/precios-taller/{tallerId}
    // Registra un nuevo precio vigente desde la fecha indicada
    [HttpPost("{tallerId}")]
    public async Task<ActionResult> SetPrecio(int tallerId, [FromBody] SetPrecioRequest req)
    {
        var taller = await _context.Talleres.FindAsync(tallerId);
        if (taller == null) return NotFound("Taller no encontrado");

        if (req.PrecioTransferencia <= 0 || req.PrecioEfectivo <= 0)
            return BadRequest("Los precios deben ser mayores a cero");

        if (req.PrecioEfectivo > req.PrecioTransferencia)
            return BadRequest("El precio en efectivo no puede ser mayor al precio por transferencia");

        var nuevoPrecio = new PrecioTaller
        {
            TallerId = tallerId,
            VigenteDesde = req.VigenteDesde.Date,
            PrecioTransferencia = req.PrecioTransferencia,
            PrecioEfectivo = req.PrecioEfectivo,
        };

        _context.PreciosTaller.Add(nuevoPrecio);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Precio actualizado", id = nuevoPrecio.Id });
    }
}

public record SetPrecioRequest(
    decimal PrecioTransferencia,
    decimal PrecioEfectivo,
    DateTime VigenteDesde
);
