using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OlaCore.Models;
using OlaInfrastructure.Data;

namespace OlaAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DiasSinClaseController : ControllerBase
{
    private readonly OlaDbContext _context;

    public DiasSinClaseController(OlaDbContext context)
    {
        _context = context;
    }

    /// <summary>Obtiene los días sin clase de un mes (año y mes).</summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetDiasSinClase([FromQuery] int anio, [FromQuery] int mes)
    {
        var inicio = new DateTime(anio, mes, 1, 0, 0, 0, DateTimeKind.Utc);
        var fin = inicio.AddMonths(1);

        var dias = await _context.DiasSinClase
            .Where(d => d.Fecha >= inicio && d.Fecha < fin)
            .OrderBy(d => d.Fecha)
            .Select(d => new { d.Id, d.Fecha, d.Motivo })
            .ToListAsync();

        return Ok(dias);
    }

    /// <summary>Verifica si una fecha es día sin clase.</summary>
    [HttpGet("verificar")]
    public async Task<ActionResult<bool>> EsDiaSinClase([FromQuery] DateTime fecha)
    {
        var fechaDate = fecha.Date;
        var existe = await _context.DiasSinClase
            .AnyAsync(d => d.Fecha.Date == fechaDate);
        return Ok(existe);
    }

    [HttpPost]
    public async Task<ActionResult<DiaSinClase>> PostDiaSinClase(DiaSinClase dia)
    {
        dia.Fecha = DateTime.SpecifyKind(dia.Fecha.Date, DateTimeKind.Utc);
        var yaExiste = await _context.DiasSinClase.AnyAsync(d => d.Fecha.Date == dia.Fecha.Date);
        if (yaExiste)
            return BadRequest("Ya existe un día sin clase para esa fecha.");

        _context.DiasSinClase.Add(dia);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetDiasSinClase), new { anio = dia.Fecha.Year, mes = dia.Fecha.Month }, dia);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteDiaSinClase(int id)
    {
        var dia = await _context.DiasSinClase.FindAsync(id);
        if (dia == null)
            return NotFound();
        _context.DiasSinClase.Remove(dia);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
