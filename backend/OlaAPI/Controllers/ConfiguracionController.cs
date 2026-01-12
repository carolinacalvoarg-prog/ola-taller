using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OlaCore.Models;
using OlaInfrastructure.Data;

namespace OlaAPI.Controllers;

public class UpdateConfiguracionDto
{
    public string Valor { get; set; } = string.Empty;
}

[ApiController]
[Route("api/[controller]")]
public class ConfiguracionController : ControllerBase
{
    private readonly OlaDbContext _context;

    public ConfiguracionController(OlaDbContext context)
    {
        _context = context;
    }

    // GET: api/Configuracion
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ConfiguracionSistema>>> GetConfiguraciones()
    {
        return await _context.ConfiguracionesSistema.ToListAsync();
    }

    // GET: api/Configuracion/HorasAnticipacionCancelacion
    [HttpGet("{clave}")]
    public async Task<ActionResult<ConfiguracionSistema>> GetConfiguracion(string clave)
    {
        var config = await _context.ConfiguracionesSistema
            .FirstOrDefaultAsync(c => c.Clave == clave);

        if (config == null)
        {
            return NotFound();
        }

        return config;
    }

    // PUT: api/Configuracion/HorasAnticipacionCancelacion
    [HttpPut("{clave}")]
    public async Task<IActionResult> UpdateConfiguracion(string clave, UpdateConfiguracionDto dto)
    {
        var config = await _context.ConfiguracionesSistema
            .FirstOrDefaultAsync(c => c.Clave == clave);

        if (config == null)
        {
            return NotFound();
        }

        config.Valor = dto.Valor;
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
