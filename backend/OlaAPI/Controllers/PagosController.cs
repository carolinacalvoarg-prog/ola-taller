using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OlaInfrastructure.Data;
using OlaCore.Models;

namespace OlaAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PagosController : ControllerBase
{
    private readonly OlaDbContext _context;

    public PagosController(OlaDbContext context)
    {
        _context = context;
    }

    // GET api/pagos/preview/{mes}/{anio}
    // Calcula cuántas clases tiene cada turno activo en el mes, excluyendo feriados
    [HttpGet("preview/{mes}/{anio}")]
    public async Task<ActionResult<object>> GetPreview(int mes, int anio)
    {
        if (mes < 1 || mes > 12) return BadRequest("Mes inválido");

        var feriados = await _context.DiasSinClase
            .Where(d => d.Fecha.Month == mes && d.Fecha.Year == anio)
            .Select(d => d.Fecha.Date)
            .ToListAsync();

        var turnos = await _context.Turnos
            .Include(t => t.Taller)
            .Include(t => t.FechasManuales)
            .Include(t => t.Inscripciones.Where(i => i.Activa))
            .Where(t => t.Activo && t.TallerId != null)
            .ToListAsync();

        var hoy = DateTime.UtcNow.Date;
        var primerDiaMes = new DateTime(anio, mes, 1);

        var talleresPreview = new List<object>();

        foreach (var turno in turnos)
        {
            var diasDelMes = ObtenerDiasDelMesParaTurno(turno, mes, anio, feriados);

            var precioVigente = await _context.PreciosTaller
                .Where(p => p.TallerId == turno.TallerId && p.VigenteDesde.Date <= primerDiaMes)
                .OrderByDescending(p => p.VigenteDesde)
                .FirstOrDefaultAsync();

            var cantClases = diasDelMes.Count;
            var precioTransf = precioVigente?.PrecioTransferencia ?? 0;
            var precioEfect = precioVigente?.PrecioEfectivo ?? 0;

            talleresPreview.Add(new
            {
                turnoId = turno.Id,
                tallerId = turno.TallerId,
                tallerNombre = turno.Taller?.Nombre ?? "Sin taller",
                diaSemana = (int)turno.DiaSemana,
                diasDelMes = diasDelMes.Select(d => d.Day).ToList(),
                cantidadClases = cantClases,
                precioTransferencia = precioTransf,
                precioEfectivo = precioEfect,
                totalTransferencia = cantClases * precioTransf,
                totalEfectivo = cantClases * precioEfect,
                alumnosInscriptos = turno.Inscripciones.Count,
                sinPrecio = precioVigente == null
            });
        }

        var yaGeneradas = await _context.Pagos.AnyAsync(p => p.MesPago == mes && p.AnioPago == anio);
        var totalAlumnos = yaGeneradas ? await _context.Pagos.CountAsync(p => p.MesPago == mes && p.AnioPago == anio) : 0;

        return Ok(new
        {
            mes,
            anio,
            yaGeneradas,
            totalAlumnos,
            feriados = feriados.Select(f => f.Day).ToList(),
            talleres = talleresPreview
        });
    }

    // POST api/pagos/generar/{mes}/{anio}
    // Genera cuotas para todos los alumnos activos con inscripciones
    [HttpPost("generar/{mes}/{anio}")]
    public async Task<ActionResult<object>> Generar(int mes, int anio)
    {
        if (mes < 1 || mes > 12) return BadRequest("Mes inválido");

        var yaExisten = await _context.Pagos.AnyAsync(p => p.MesPago == mes && p.AnioPago == anio);
        if (yaExisten) return BadRequest($"Las cuotas de {mes}/{anio} ya fueron generadas");

        var feriados = await _context.DiasSinClase
            .Where(d => d.Fecha.Month == mes && d.Fecha.Year == anio)
            .Select(d => d.Fecha.Date)
            .ToListAsync();

        var primerDiaMes = new DateTime(anio, mes, 1);
        var vencimiento = new DateTime(anio, mes, 10);

        // Cargar todos los turnos activos con sus talleres
        var turnos = await _context.Turnos
            .Include(t => t.Taller)
            .Include(t => t.FechasManuales)
            .Where(t => t.Activo && t.TallerId != null)
            .ToListAsync();

        // Precargar precios vigentes para el mes
        var preciosPorTaller = new Dictionary<int, PrecioTaller?>();
        foreach (var tallerId in turnos.Select(t => t.TallerId!.Value).Distinct())
        {
            preciosPorTaller[tallerId] = await _context.PreciosTaller
                .Where(p => p.TallerId == tallerId && p.VigenteDesde.Date <= primerDiaMes)
                .OrderByDescending(p => p.VigenteDesde)
                .FirstOrDefaultAsync();
        }

        // Precargar conteo de clases por turno
        var clasesPorTurno = new Dictionary<int, int>();
        foreach (var turno in turnos)
        {
            clasesPorTurno[turno.Id] = ObtenerDiasDelMesParaTurno(turno, mes, anio, feriados).Count;
        }

        // Cargar alumnos activos con sus inscripciones activas
        var alumnos = await _context.Alumnos
            .Where(a => a.Activo)
            .Include(a => a.Inscripciones.Where(i => i.Activa))
                .ThenInclude(i => i.Turno)
            .ToListAsync();

        var pagosCreados = 0;

        foreach (var alumno in alumnos)
        {
            var inscripcionesActivas = alumno.Inscripciones
                .Where(i => i.Activa && i.Turno != null && i.Turno.Activo && i.Turno.TallerId != null)
                .ToList();

            if (!inscripcionesActivas.Any()) continue;

            // Descuento múltiple: 2+ turnos distintos por semana
            var aplicaDescuento = inscripcionesActivas.Count >= 2;

            decimal montoCalculado = 0;

            foreach (var inscripcion in inscripcionesActivas)
            {
                var turno = inscripcion.Turno!;
                var tallerId = turno.TallerId!.Value;
                var precio = preciosPorTaller.GetValueOrDefault(tallerId);
                var cantClases = clasesPorTurno.GetValueOrDefault(turno.Id, 0);

                if (precio == null || cantClases == 0) continue;

                var precioPorClase = aplicaDescuento
                    ? precio.PrecioEfectivo
                    : precio.PrecioTransferencia;

                montoCalculado += cantClases * precioPorClase;
            }

            if (montoCalculado == 0) continue;

            var pago = new Pago
            {
                AlumnoId = alumno.Id,
                MontoCalculado = montoCalculado,
                Monto = montoCalculado,
                FechaVencimiento = vencimiento,
                Estado = "Pendiente",
                MesPago = mes,
                AnioPago = anio,
                AplicaDescuentoMultiple = aplicaDescuento,
            };

            _context.Pagos.Add(pago);
            pagosCreados++;
        }

        await _context.SaveChangesAsync();

        return Ok(new { message = $"Se generaron {pagosCreados} cuotas para {mes}/{anio}", total = pagosCreados });
    }

    // GET api/pagos/{mes}/{anio}
    // Lista todas las cuotas de un mes con detalle del alumno y sus talleres
    [HttpGet("{mes}/{anio}")]
    public async Task<ActionResult<IEnumerable<object>>> GetByMes(int mes, int anio)
    {
        var pagos = await _context.Pagos
            .Include(p => p.Alumno)
                .ThenInclude(a => a.Inscripciones.Where(i => i.Activa))
                    .ThenInclude(i => i.Turno)
                        .ThenInclude(t => t!.Taller)
            .Where(p => p.MesPago == mes && p.AnioPago == anio)
            .OrderBy(p => p.Alumno.Apellido)
            .ThenBy(p => p.Alumno.Nombre)
            .ToListAsync();

        var resultado = pagos.Select(p => new
        {
            p.Id,
            alumno = new { p.Alumno.Id, p.Alumno.Nombre, p.Alumno.Apellido, p.Alumno.Email },
            talleres = p.Alumno.Inscripciones
                .Where(i => i.Activa && i.Turno?.Taller != null)
                .Select(i => i.Turno!.Taller!.Nombre)
                .Distinct()
                .ToList(),
            p.MontoCalculado,
            montoFinal = p.Monto,
            p.Estado,
            p.AplicaDescuentoMultiple,
            p.NotasAdmin,
            p.FechaPago,
            p.MetodoPago,
            p.Comprobante,
            p.FechaVencimiento,
        });

        return Ok(resultado);
    }

    // GET api/pagos/alumno/{alumnoId}
    // Historial de pagos de un alumno
    [HttpGet("alumno/{alumnoId}")]
    public async Task<ActionResult<IEnumerable<object>>> GetByAlumno(int alumnoId)
    {
        var pagos = await _context.Pagos
            .Where(p => p.AlumnoId == alumnoId)
            .OrderByDescending(p => p.AnioPago)
            .ThenByDescending(p => p.MesPago)
            .Select(p => new
            {
                p.Id,
                p.MesPago,
                p.AnioPago,
                p.MontoCalculado,
                montoFinal = p.Monto,
                p.Estado,
                p.AplicaDescuentoMultiple,
                p.NotasAdmin,
                p.FechaPago,
                p.MetodoPago,
                p.Comprobante,
                p.FechaVencimiento,
            })
            .ToListAsync();

        return Ok(pagos);
    }

    // GET api/pagos/deudores
    // Alumnos con cuotas pendientes o vencidas del mes actual o anterior
    [HttpGet("deudores")]
    public async Task<ActionResult<IEnumerable<object>>> GetDeudores()
    {
        var hoy = DateTime.UtcNow;

        var deudores = await _context.Pagos
            .Include(p => p.Alumno)
            .Where(p => p.Estado != "Pagado")
            .OrderBy(p => p.AnioPago)
            .ThenBy(p => p.MesPago)
            .ThenBy(p => p.Alumno.Apellido)
            .Select(p => new
            {
                p.Id,
                alumno = new { p.Alumno.Id, p.Alumno.Nombre, p.Alumno.Apellido, p.Alumno.Email, p.Alumno.Telefono },
                p.MesPago,
                p.AnioPago,
                montoFinal = p.Monto,
                p.Estado,
                p.FechaVencimiento,
                diasVencido = p.Estado == "Vencido" ? (int)(hoy - p.FechaVencimiento).TotalDays : 0
            })
            .ToListAsync();

        return Ok(deudores);
    }

    // PUT api/pagos/{id}
    // El admin edita el monto final y/o agrega una nota
    [HttpPut("{id}")]
    public async Task<ActionResult> Update(int id, [FromBody] UpdatePagoRequest req)
    {
        var pago = await _context.Pagos.FindAsync(id);
        if (pago == null) return NotFound();

        if (req.MontoFinal <= 0) return BadRequest("El monto debe ser mayor a cero");

        pago.Monto = req.MontoFinal;
        pago.NotasAdmin = req.NotasAdmin?.Trim();

        await _context.SaveChangesAsync();
        return Ok(new { message = "Cuota actualizada" });
    }

    // POST api/pagos/{id}/registrar-pago
    // Marca la cuota como pagada
    [HttpPost("{id}/registrar-pago")]
    public async Task<ActionResult> RegistrarPago(int id, [FromBody] RegistrarPagoRequest req)
    {
        var pago = await _context.Pagos.FindAsync(id);
        if (pago == null) return NotFound();
        if (pago.Estado == "Pagado") return BadRequest("Esta cuota ya está registrada como pagada");

        pago.Estado = "Pagado";
        pago.FechaPago = req.FechaPago ?? DateTime.UtcNow;
        pago.MetodoPago = req.MetodoPago;
        pago.Comprobante = req.Referencia?.Trim();

        await _context.SaveChangesAsync();
        return Ok(new { message = "Pago registrado correctamente" });
    }

    // Calcula qué fechas del mes corresponden a un turno, excluyendo feriados
    private static List<DateTime> ObtenerDiasDelMesParaTurno(Turno turno, int mes, int anio, List<DateTime> feriados)
    {
        if (turno.UsarFechasManuales && turno.FechasManuales.Any())
        {
            return turno.FechasManuales
                .Where(f => f.Fecha.Month == mes && f.Fecha.Year == anio && !feriados.Contains(f.Fecha.Date))
                .Select(f => f.Fecha)
                .OrderBy(f => f)
                .ToList();
        }

        var diasEnMes = DateTime.DaysInMonth(anio, mes);
        var resultado = new List<DateTime>();

        for (int dia = 1; dia <= diasEnMes; dia++)
        {
            var fecha = new DateTime(anio, mes, dia);
            if (fecha.DayOfWeek == turno.DiaSemana && !feriados.Contains(fecha))
                resultado.Add(fecha);
        }

        return resultado;
    }
}

public record UpdatePagoRequest(decimal MontoFinal, string? NotasAdmin);
public record RegistrarPagoRequest(string MetodoPago, string? Referencia, DateTime? FechaPago);
