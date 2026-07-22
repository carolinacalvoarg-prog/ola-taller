using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OlaCore.Models;
using OlaInfrastructure.Data;
using OlaAPI.Helpers;
using System.Text;

namespace OlaAPI.Controllers;

public class TarifaDto
{
    public int? TallerId { get; set; }
    public decimal ValorClaseTransferencia { get; set; }
    public decimal ValorClaseEfectivo { get; set; }
}

public class AjustarCuotaDto
{
    public decimal MontoEsperadoTransferencia { get; set; }
    public decimal MontoEsperadoEfectivo { get; set; }
    public string? Notas { get; set; }
}

public class RegistrarPagoDto
{
    public decimal Monto { get; set; }
    public string MetodoPago { get; set; } = "Transferencia"; // Transferencia | Efectivo
    public DateTime? Fecha { get; set; }
    public string? Comprobante { get; set; }
    public string? Nota { get; set; }
}

[ApiController]
[Route("api/[controller]")]
public class PagosController : ControllerBase
{
    private readonly OlaDbContext _context;
    private static readonly string[] NombresDias = { "Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado" };
    private static readonly string[] NombresMeses = { "", "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE" };

    public PagosController(OlaDbContext context)
    {
        _context = context;
    }

    /// <summary>Cuenta las fechas de clase de un turno dentro del mes, excluyendo días sin clase. `desde` permite prorratear altas a mitad de mes.</summary>
    private async Task<int> ContarClasesDelMesAsync(Turno turno, int anio, int mes, DateTime? desde, HashSet<DateTime> diasSinClase)
    {
        var inicioMes = new DateTime(anio, mes, 1, 0, 0, 0, DateTimeKind.Utc);
        var finMes = inicioMes.AddMonths(1);
        var inicio = desde.HasValue && desde.Value.Date > inicioMes ? desde.Value.Date : inicioMes;
        if (inicio >= finMes) return 0;

        if (turno.UsarFechasManuales)
        {
            var fechas = await _context.TurnoFechas
                .Where(f => f.TurnoId == turno.Id && f.Fecha >= inicio && f.Fecha < finMes)
                .Select(f => f.Fecha.Date)
                .ToListAsync();
            return fechas.Count(f => !diasSinClase.Contains(f));
        }

        var diaSemana = (int)turno.DiaSemana;
        var actual = inicio;
        var diasSumar = (diaSemana - (int)actual.DayOfWeek + 7) % 7;
        actual = actual.AddDays(diasSumar);

        var cantidad = 0;
        while (actual < finMes)
        {
            if (!diasSinClase.Contains(actual.Date)) cantidad++;
            actual = actual.AddDays(7);
        }
        return cantidad;
    }

    private async Task<HashSet<DateTime>> GetDiasSinClaseDelMesAsync(int anio, int mes)
    {
        var inicioMes = new DateTime(anio, mes, 1, 0, 0, 0, DateTimeKind.Utc);
        var finMes = inicioMes.AddMonths(1);
        var dias = await _context.DiasSinClase
            .Where(d => d.Fecha >= inicioMes && d.Fecha < finMes)
            .Select(d => d.Fecha.Date)
            .ToListAsync();
        return new HashSet<DateTime>(dias);
    }

    // GET: api/Pagos/tarifas/2026/7
    // Tarifas cargadas + resumen por turno (cantidad de clases del mes) para previsualizar los aranceles.
    [HttpGet("tarifas/{anio}/{mes}")]
    public async Task<ActionResult<object>> GetTarifas(int anio, int mes)
    {
        if (mes < 1 || mes > 12) return BadRequest("Mes inválido.");

        var tarifas = await _context.TarifasMensuales
            .Where(t => t.Anio == anio && t.Mes == mes)
            .ToListAsync();

        var talleres = await _context.Talleres.Where(t => t.Activo).OrderBy(t => t.Nombre).ToListAsync();
        var turnos = await _context.Turnos.Where(t => t.Activo).ToListAsync();
        var diasSinClase = await GetDiasSinClaseDelMesAsync(anio, mes);

        var resumenTurnos = new List<object>();
        foreach (var turno in turnos)
        {
            var cantidad = await ContarClasesDelMesAsync(turno, anio, mes, null, diasSinClase);
            resumenTurnos.Add(new
            {
                TurnoId = turno.Id,
                turno.TallerId,
                DiaSemana = (int)turno.DiaSemana,
                DiaNombre = NombresDias[(int)turno.DiaSemana],
                HoraInicio = turno.HoraInicio.ToString(@"hh\:mm"),
                turno.UsarFechasManuales,
                CantidadClases = cantidad
            });
        }

        var hayTurnosSinTaller = turnos.Any(t => t.TallerId == null);

        return Ok(new
        {
            Tarifas = tarifas.Select(t => new
            {
                t.Id,
                t.TallerId,
                t.ValorClaseTransferencia,
                t.ValorClaseEfectivo
            }),
            Talleres = talleres.Select(t => new { t.Id, t.Nombre }),
            HayTurnosSinTaller = hayTurnosSinTaller,
            ResumenTurnos = resumenTurnos
        });
    }

    // PUT: api/Pagos/tarifas/2026/7 — upsert de la lista de tarifas del mes
    [HttpPut("tarifas/{anio}/{mes}")]
    public async Task<IActionResult> PutTarifas(int anio, int mes, [FromBody] List<TarifaDto> dtos)
    {
        if (mes < 1 || mes > 12) return BadRequest("Mes inválido.");

        var existentes = await _context.TarifasMensuales
            .Where(t => t.Anio == anio && t.Mes == mes)
            .ToListAsync();

        foreach (var dto in dtos)
        {
            if (dto.ValorClaseTransferencia < 0 || dto.ValorClaseEfectivo < 0)
                return BadRequest("Los valores no pueden ser negativos.");

            var existente = existentes.FirstOrDefault(t => t.TallerId == dto.TallerId);
            if (existente != null)
            {
                existente.ValorClaseTransferencia = dto.ValorClaseTransferencia;
                existente.ValorClaseEfectivo = dto.ValorClaseEfectivo;
            }
            else
            {
                _context.TarifasMensuales.Add(new TarifaMensual
                {
                    Anio = anio,
                    Mes = mes,
                    TallerId = dto.TallerId,
                    ValorClaseTransferencia = dto.ValorClaseTransferencia,
                    ValorClaseEfectivo = dto.ValorClaseEfectivo
                });
            }
        }

        await _context.SaveChangesAsync();
        return NoContent();
    }

    // POST: api/Pagos/generar/2026/7
    // Genera (o recalcula) las cuotas del mes para cada alumno activo con inscripciones activas.
    // No toca cuotas con pagos registrados ni ajustadas a mano por la administradora.
    [HttpPost("generar/{anio}/{mes}")]
    public async Task<ActionResult<object>> GenerarCuotas(int anio, int mes)
    {
        if (mes < 1 || mes > 12) return BadRequest("Mes inválido.");

        var tarifas = await _context.TarifasMensuales
            .Where(t => t.Anio == anio && t.Mes == mes)
            .ToListAsync();

        if (tarifas.Count == 0)
            return BadRequest("Primero cargá los aranceles del mes.");

        var tarifasPorTaller = tarifas.ToDictionary(t => t.TallerId ?? 0);

        var inscripciones = await _context.Inscripciones
            .Include(i => i.Alumno)
            .Include(i => i.Turno)
            .Where(i => i.Activa && i.Alumno!.Activo && i.Turno!.Activo)
            .ToListAsync();

        var cuotasExistentes = await _context.Pagos
            .Where(p => p.AnioPago == anio && p.MesPago == mes)
            .ToListAsync();

        var diasSinClase = await GetDiasSinClaseDelMesAsync(anio, mes);
        var inicioMes = new DateTime(anio, mes, 1, 0, 0, 0, DateTimeKind.Utc);
        var finMes = inicioMes.AddMonths(1);

        var generadas = 0;
        var actualizadas = 0;
        var sinCambios = 0;
        var sinTarifa = new List<string>();

        foreach (var grupo in inscripciones.GroupBy(i => i.AlumnoId))
        {
            var alumno = grupo.First().Alumno!;
            var esDosVeces = grupo.Count() >= 2;

            decimal totalTransf = 0;
            decimal totalEfectivo = 0;
            var totalClases = 0;
            var lineasDetalle = new List<string>();
            var faltaTarifa = false;

            foreach (var insc in grupo)
            {
                var turno = insc.Turno!;
                if (!tarifasPorTaller.TryGetValue(turno.TallerId ?? 0, out var tarifa))
                {
                    faltaTarifa = true;
                    break;
                }

                // Prorrateo: si el alumno se inscribió durante este mes, solo cuentan las clases desde su alta
                DateTime? desde = insc.FechaInscripcion >= inicioMes && insc.FechaInscripcion < finMes
                    ? insc.FechaInscripcion.Date
                    : null;

                var clases = await ContarClasesDelMesAsync(turno, anio, mes, desde, diasSinClase);
                if (clases == 0) continue;

                totalClases += clases;
                totalTransf += clases * tarifa.ValorClaseTransferencia;
                totalEfectivo += clases * tarifa.ValorClaseEfectivo;

                var prorrateo = desde.HasValue ? " (desde tu alta)" : "";
                lineasDetalle.Add($"{NombresDias[(int)turno.DiaSemana]} {turno.HoraInicio:hh\\:mm} · {clases} clase{(clases != 1 ? "s" : "")}{prorrateo}");
            }

            if (faltaTarifa)
            {
                sinTarifa.Add($"{alumno.Nombre} {alumno.Apellido}");
                continue;
            }
            if (totalClases == 0) continue;

            // Regla 2x/semana: paga todo a precio efectivo, incluso por transferencia
            if (esDosVeces) totalTransf = totalEfectivo;

            var cuota = cuotasExistentes.FirstOrDefault(p => p.AlumnoId == alumno.Id);
            if (cuota == null)
            {
                _context.Pagos.Add(new Pago
                {
                    AlumnoId = alumno.Id,
                    AnioPago = anio,
                    MesPago = mes,
                    MontoEsperadoTransferencia = totalTransf,
                    MontoEsperadoEfectivo = totalEfectivo,
                    CantidadClases = totalClases,
                    EsDosVecesSemana = esDosVeces,
                    Detalle = string.Join("\n", lineasDetalle),
                    FechaVencimiento = new DateTime(anio, mes, 10, 0, 0, 0, DateTimeKind.Utc),
                    Estado = "Pendiente"
                });
                generadas++;
            }
            else if (cuota.MontoAbonado == 0 && !cuota.MontoAjustadoManual)
            {
                cuota.MontoEsperadoTransferencia = totalTransf;
                cuota.MontoEsperadoEfectivo = totalEfectivo;
                cuota.CantidadClases = totalClases;
                cuota.EsDosVecesSemana = esDosVeces;
                cuota.Detalle = string.Join("\n", lineasDetalle);
                actualizadas++;
            }
            else
            {
                sinCambios++;
            }
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            Generadas = generadas,
            Actualizadas = actualizadas,
            SinCambios = sinCambios,
            AlumnosSinTarifa = sinTarifa
        });
    }

    // GET: api/Pagos/resumen/2026/7 — cuotas del mes + KPIs
    [HttpGet("resumen/{anio}/{mes}")]
    public async Task<ActionResult<object>> GetResumen(int anio, int mes)
    {
        if (mes < 1 || mes > 12) return BadRequest("Mes inválido.");

        var cuotas = await _context.Pagos
            .Include(p => p.Alumno)
            .Where(p => p.AnioPago == anio && p.MesPago == mes)
            .ToListAsync();

        // Días de turno de cada alumno para mostrar en la tabla
        var inscripciones = await _context.Inscripciones
            .Include(i => i.Turno)
            .Where(i => i.Activa && i.Turno!.Activo)
            .ToListAsync();
        var diasPorAlumno = inscripciones
            .GroupBy(i => i.AlumnoId)
            .ToDictionary(
                g => g.Key,
                g => string.Join(" + ", g.Select(i => $"{NombresDias[(int)i.Turno!.DiaSemana]} {i.Turno.HoraInicio:hh\\:mm}")));

        var hoy = TimeHelper.HoyArgentina();

        // Deuda de meses anteriores (cuotas no pagadas de meses previos)
        var inicioMes = new DateTime(anio, mes, 1, 0, 0, 0, DateTimeKind.Utc);
        var deudasAnteriores = await _context.Pagos
            .Include(p => p.Alumno)
            .Where(p => p.Estado != "Pagado"
                     && (p.AnioPago < anio || (p.AnioPago == anio && p.MesPago < mes)))
            .ToListAsync();
        var deudaAnteriorTotal = deudasAnteriores.Sum(p => p.MontoEsperadoTransferencia - p.MontoAbonado);
        var deudoresAnteriores = deudasAnteriores
            .GroupBy(p => p.AlumnoId)
            .Select(g => new
            {
                AlumnoId = g.Key,
                Nombre = $"{g.First().Alumno.Nombre} {g.First().Alumno.Apellido}",
                Meses = g.Select(p => $"{p.MesPago}/{p.AnioPago}").ToList(),
                Monto = g.Sum(p => p.MontoEsperadoTransferencia - p.MontoAbonado)
            })
            .ToList();

        var lista = cuotas
            .OrderBy(p => p.Alumno.Apellido).ThenBy(p => p.Alumno.Nombre)
            .Select(p => new
            {
                p.Id,
                p.AlumnoId,
                AlumnoNombre = $"{p.Alumno.Nombre} {p.Alumno.Apellido}".Trim(),
                Dias = diasPorAlumno.GetValueOrDefault(p.AlumnoId, ""),
                p.CantidadClases,
                p.EsDosVecesSemana,
                p.MontoEsperadoTransferencia,
                p.MontoEsperadoEfectivo,
                p.MontoAbonado,
                p.MontoAjustadoManual,
                p.Estado,
                Vencida = p.Estado != "Pagado" && hoy > p.FechaVencimiento,
                p.FechaVencimiento,
                FechaPago = p.MontoAbonado > 0 ? p.FechaPago : (DateTime?)null,
                p.MetodoPago,
                p.Detalle,
                p.Notas,
                DeudaAnterior = deudoresAnteriores.FirstOrDefault(d => d.AlumnoId == p.AlumnoId)
            })
            .ToList();

        return Ok(new
        {
            Cuotas = lista,
            Kpis = new
            {
                Cobrado = cuotas.Sum(p => p.MontoAbonado),
                PorCobrar = cuotas.Where(p => p.Estado != "Pagado").Sum(p => p.MontoEsperadoTransferencia - p.MontoAbonado),
                DeudaMesesAnteriores = deudaAnteriorTotal,
                AlumnasAlDia = cuotas.Count(p => p.Estado == "Pagado"),
                TotalAlumnas = cuotas.Count
            },
            DeudoresAnteriores = deudoresAnteriores
        });
    }

    // PUT: api/Pagos/5 — ajuste manual de los montos esperados por la administradora
    [HttpPut("{id}")]
    public async Task<IActionResult> AjustarCuota(int id, [FromBody] AjustarCuotaDto dto)
    {
        var cuota = await _context.Pagos.FindAsync(id);
        if (cuota == null) return NotFound("Cuota no encontrada.");
        if (dto.MontoEsperadoTransferencia < 0 || dto.MontoEsperadoEfectivo < 0)
            return BadRequest("Los montos no pueden ser negativos.");

        cuota.MontoEsperadoTransferencia = dto.MontoEsperadoTransferencia;
        cuota.MontoEsperadoEfectivo = dto.MontoEsperadoEfectivo;
        cuota.MontoAjustadoManual = true;
        if (dto.Notas != null) cuota.Notas = dto.Notas;

        // Reevaluar estado si ya había pagos parciales
        if (cuota.MontoAbonado > 0)
        {
            var esperado = cuota.MetodoPago == "Efectivo" ? cuota.MontoEsperadoEfectivo : cuota.MontoEsperadoTransferencia;
            cuota.Estado = cuota.MontoAbonado >= esperado ? "Pagado" : "Parcial";
        }

        await _context.SaveChangesAsync();
        return NoContent();
    }

    // POST: api/Pagos/5/registrar — registra un pago (total o parcial) sobre la cuota
    [HttpPost("{id}/registrar")]
    public async Task<ActionResult<object>> RegistrarPago(int id, [FromBody] RegistrarPagoDto dto)
    {
        var cuota = await _context.Pagos.Include(p => p.Alumno).FirstOrDefaultAsync(p => p.Id == id);
        if (cuota == null) return NotFound("Cuota no encontrada.");
        if (dto.Monto <= 0) return BadRequest("El monto debe ser mayor a cero.");
        if (dto.MetodoPago != "Transferencia" && dto.MetodoPago != "Efectivo")
            return BadRequest("Método de pago inválido.");

        cuota.MontoAbonado += dto.Monto;
        cuota.Monto = cuota.MontoAbonado;
        cuota.MetodoPago = dto.MetodoPago;
        cuota.FechaPago = dto.Fecha.HasValue
            ? DateTime.SpecifyKind(dto.Fecha.Value, DateTimeKind.Utc)
            : DateTime.UtcNow;
        if (!string.IsNullOrWhiteSpace(dto.Comprobante)) cuota.Comprobante = dto.Comprobante;
        if (!string.IsNullOrWhiteSpace(dto.Nota))
            cuota.Notas = string.IsNullOrWhiteSpace(cuota.Notas) ? dto.Nota : $"{cuota.Notas}\n{dto.Nota}";

        var esperado = dto.MetodoPago == "Efectivo" ? cuota.MontoEsperadoEfectivo : cuota.MontoEsperadoTransferencia;
        cuota.Estado = cuota.MontoAbonado >= esperado ? "Pagado" : "Parcial";

        _context.Actividades.Add(new Actividad
        {
            Tipo = "pago",
            AlumnoId = cuota.AlumnoId,
            Fecha = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        return Ok(new
        {
            cuota.Id,
            cuota.Estado,
            cuota.MontoAbonado,
            SaldoPendiente = Math.Max(0, esperado - cuota.MontoAbonado)
        });
    }

    // GET: api/Pagos/alumno/5 — cuota del mes en curso + historial, para el portal del alumno
    [HttpGet("alumno/{alumnoId}")]
    public async Task<ActionResult<object>> GetPagosAlumno(int alumnoId)
    {
        var alumno = await _context.Alumnos.FindAsync(alumnoId);
        if (alumno == null) return NotFound("Alumno no encontrado.");

        var hoy = TimeHelper.HoyArgentina();

        var cuotas = await _context.Pagos
            .Where(p => p.AlumnoId == alumnoId)
            .OrderByDescending(p => p.AnioPago).ThenByDescending(p => p.MesPago)
            .Take(12)
            .ToListAsync();

        var datosTransferencia = await _context.ConfiguracionesSistema
            .Where(c => c.Clave.StartsWith("Transferencia"))
            .ToDictionaryAsync(c => c.Clave, c => c.Valor);

        var cuotaActual = cuotas.FirstOrDefault(p => p.AnioPago == hoy.Year && p.MesPago == hoy.Month);

        object? MapCuota(Pago? p) => p == null ? null : new
        {
            p.Id,
            p.AnioPago,
            p.MesPago,
            p.MontoEsperadoTransferencia,
            p.MontoEsperadoEfectivo,
            p.MontoAbonado,
            p.CantidadClases,
            p.EsDosVecesSemana,
            p.Detalle,
            p.Estado,
            Vencida = p.Estado != "Pagado" && hoy > p.FechaVencimiento,
            p.FechaVencimiento,
            FechaPago = p.MontoAbonado > 0 ? p.FechaPago : (DateTime?)null,
            p.MetodoPago
        };

        return Ok(new
        {
            Habilitado = alumno.PortalPagosHabilitado,
            CuotaActual = MapCuota(cuotaActual),
            Historial = cuotas.Where(p => p != cuotaActual).Select(MapCuota),
            DatosTransferencia = datosTransferencia
        });
    }

    // GET: api/Pagos/mensaje/2026/7 — texto del arancel del mes listo para pegar en WhatsApp
    [HttpGet("mensaje/{anio}/{mes}")]
    public async Task<ActionResult<object>> GetMensajeWhatsApp(int anio, int mes)
    {
        if (mes < 1 || mes > 12) return BadRequest("Mes inválido.");

        var tarifas = await _context.TarifasMensuales
            .Include(t => t.Taller)
            .Where(t => t.Anio == anio && t.Mes == mes)
            .ToListAsync();

        if (tarifas.Count == 0)
            return BadRequest("Primero cargá los aranceles del mes.");

        var turnos = await _context.Turnos.Where(t => t.Activo).ToListAsync();
        var diasSinClase = await GetDiasSinClaseDelMesAsync(anio, mes);

        // Agrupar turnos por (taller, cantidad de clases) como en los mensajes que manda la admin
        var grupos = new List<(string TallerNombre, int? TallerId, int Clases, List<string> Dias)>();
        foreach (var turno in turnos)
        {
            var clases = await ContarClasesDelMesAsync(turno, anio, mes, null, diasSinClase);
            if (clases == 0) continue;
            var tarifa = tarifas.FirstOrDefault(t => t.TallerId == turno.TallerId);
            if (tarifa == null) continue;

            var nombre = tarifa.Taller?.Nombre ?? "Taller";
            var dia = NombresDias[(int)turno.DiaSemana].ToUpperInvariant();
            var existente = grupos.FirstOrDefault(g => g.TallerId == turno.TallerId && g.Clases == clases);
            if (existente.Dias != null)
            {
                if (!existente.Dias.Contains(dia)) existente.Dias.Add(dia);
            }
            else
            {
                grupos.Add((nombre, turno.TallerId, clases, new List<string> { dia }));
            }
        }

        var datosTransf = await _context.ConfiguracionesSistema
            .Where(c => c.Clave.StartsWith("Transferencia"))
            .ToDictionaryAsync(c => c.Clave, c => c.Valor);

        var sb = new StringBuilder();
        sb.AppendLine($"Hola! Les compartimos el arancel de {NombresMeses[mes]} 🫶🏽");
        sb.AppendLine();
        sb.AppendLine("*Valores* 👇🏼");
        foreach (var g in grupos.OrderBy(g => g.TallerNombre).ThenBy(g => g.Clases))
        {
            var tarifa = tarifas.First(t => t.TallerId == g.TallerId);
            var totalTransf = g.Clases * tarifa.ValorClaseTransferencia;
            var totalEfec = g.Clases * tarifa.ValorClaseEfectivo;
            var dias = string.Join(" Y ", new[] { string.Join(", ", g.Dias.Take(g.Dias.Count - 1)), g.Dias.Last() }.Where(s => s != ""));
            sb.AppendLine($"🌿 *{g.TallerNombre} — {dias} ({g.Clases} clases): ${totalTransf:N0} TRANS / ${totalEfec:N0} EFECTIVO*");
        }
        sb.AppendLine();
        sb.AppendLine("*Importante quienes vengan al taller dos veces x semana*");
        sb.AppendLine("👉🏽 abonan ambas clases en valor con descuento como si fuese pago en efectivo y pueden realizar transferencia.");
        sb.AppendLine();
        sb.AppendLine("_Los pagos se realizan del 1 al 10 de cada mes sin excepción._");
        sb.AppendLine("_El descuento es solo en efectivo._");
        sb.AppendLine();
        sb.AppendLine("Transferencia a los siguientes datos 👇🏼");
        sb.AppendLine();
        sb.AppendLine(datosTransf.GetValueOrDefault("TransferenciaTitular", ""));
        sb.AppendLine($"CVU: {datosTransf.GetValueOrDefault("TransferenciaCVU", "")}");
        sb.AppendLine($"Alias: {datosTransf.GetValueOrDefault("TransferenciaAlias", "")}");
        sb.AppendLine($"CUIT/CUIL: {datosTransf.GetValueOrDefault("TransferenciaCUIT", "")}");
        sb.AppendLine(datosTransf.GetValueOrDefault("TransferenciaBanco", ""));
        sb.AppendLine();
        sb.AppendLine("*Por favor en el caso de realizar transferencia enviar siempre comprobante de pago por WhatsApp.*");
        sb.AppendLine();
        sb.AppendLine("Recuerden que los feriados, cancelación o recuperación de clases están en la web. Anclada en el estado del grupo.");
        sb.AppendLine();
        sb.AppendLine("Muchas gracias");

        return Ok(new { Mensaje = sb.ToString() });
    }
}
