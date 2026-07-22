import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Copy, RefreshCw, Pencil, DollarSign } from 'lucide-react';
import Card from '../components/Card';
import Toast from '../components/Toast';
import { colors } from '../styles/colors';
import { pagosService } from '../services/api';

const nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const formatMonto = (v) => `$${Number(v || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;

const inputStyle = {
  padding: '0.5rem',
  border: `1px solid ${colors.gray[300]}`,
  borderRadius: '6px',
  fontSize: '0.875rem',
  width: '110px'
};

const btnStyle = (bg, disabled = false) => ({
  padding: '0.5rem 0.9rem',
  backgroundColor: disabled ? colors.gray[300] : bg,
  color: colors.white,
  border: 'none',
  borderRadius: '6px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontSize: '0.8rem',
  fontWeight: '500',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.4rem'
});

function Cobros() {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [tarifasData, setTarifasData] = useState(null);
  const [valores, setValores] = useState({}); // key: tallerId|'general' -> {transf, efectivo}
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [soloDeudoras, setSoloDeudoras] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Modales
  const [cuotaPago, setCuotaPago] = useState(null);   // cuota para registrar pago
  const [cuotaAjuste, setCuotaAjuste] = useState(null); // cuota para ajustar montos
  const [formPago, setFormPago] = useState({ monto: '', metodoPago: 'Transferencia', fecha: '', nota: '' });
  const [formAjuste, setFormAjuste] = useState({ transf: '', efectivo: '', nota: '' });

  useEffect(() => {
    fetchData();
  }, [anio, mes]);

  const showToast = (message, type = 'success') => setToast({ show: true, message, type });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tarifasRes, resumenRes] = await Promise.all([
        pagosService.getTarifas(anio, mes),
        pagosService.getResumen(anio, mes)
      ]);
      setTarifasData(tarifasRes.data);
      setResumen(resumenRes.data);

      const vals = {};
      (tarifasRes.data.tarifas || []).forEach(t => {
        vals[t.tallerId ?? 'general'] = {
          transf: t.valorClaseTransferencia,
          efectivo: t.valorClaseEfectivo
        };
      });
      setValores(vals);
    } catch (error) {
      console.error('Error al cargar cobros:', error);
      showToast('Error al cargar los datos de cobros', 'error');
    } finally {
      setLoading(false);
    }
  };

  const cambiarMes = (delta) => {
    let m = mes + delta;
    let a = anio;
    if (m < 1) { m = 12; a--; }
    if (m > 12) { m = 1; a++; }
    setMes(m);
    setAnio(a);
  };

  const handleGuardarTarifas = async () => {
    const dtos = Object.entries(valores)
      .filter(([, v]) => v.transf !== '' && v.efectivo !== '')
      .map(([key, v]) => ({
        tallerId: key === 'general' ? null : parseInt(key),
        valorClaseTransferencia: parseFloat(v.transf) || 0,
        valorClaseEfectivo: parseFloat(v.efectivo) || 0
      }));
    if (dtos.length === 0) {
      showToast('Cargá al menos una tarifa', 'error');
      return;
    }
    try {
      setGuardando(true);
      await pagosService.saveTarifas(anio, mes, dtos);
      showToast('Aranceles guardados');
      fetchData();
    } catch (error) {
      showToast(error.response?.data || 'Error al guardar los aranceles', 'error');
    } finally {
      setGuardando(false);
    }
  };

  const handleGenerarCuotas = async () => {
    try {
      setGenerando(true);
      const res = await pagosService.generarCuotas(anio, mes);
      const { generadas, actualizadas, sinCambios, alumnosSinTarifa } = res.data;
      let msg = `Cuotas: ${generadas} generadas, ${actualizadas} actualizadas, ${sinCambios} sin cambios.`;
      if (alumnosSinTarifa?.length > 0) msg += ` Sin tarifa: ${alumnosSinTarifa.join(', ')}`;
      showToast(msg, alumnosSinTarifa?.length > 0 ? 'error' : 'success');
      fetchData();
    } catch (error) {
      showToast(error.response?.data || 'Error al generar las cuotas', 'error');
    } finally {
      setGenerando(false);
    }
  };

  const handleCopiarMensaje = async () => {
    try {
      const res = await pagosService.getMensajeWhatsApp(anio, mes);
      await navigator.clipboard.writeText(res.data.mensaje);
      showToast('Mensaje copiado. Pegalo en WhatsApp.');
    } catch (error) {
      showToast(error.response?.data || 'Error al generar el mensaje', 'error');
    }
  };

  const abrirModalPago = (cuota) => {
    const esperado = cuota.esDosVecesSemana ? cuota.montoEsperadoEfectivo : cuota.montoEsperadoTransferencia;
    setFormPago({
      monto: Math.max(0, esperado - cuota.montoAbonado),
      metodoPago: 'Transferencia',
      fecha: new Date().toISOString().slice(0, 10),
      nota: ''
    });
    setCuotaPago(cuota);
  };

  const cambiarMetodoPago = (metodo) => {
    if (!cuotaPago) return;
    const esperado = metodo === 'Efectivo' || cuotaPago.esDosVecesSemana
      ? cuotaPago.montoEsperadoEfectivo
      : cuotaPago.montoEsperadoTransferencia;
    setFormPago(f => ({ ...f, metodoPago: metodo, monto: Math.max(0, esperado - cuotaPago.montoAbonado) }));
  };

  const handleRegistrarPago = async () => {
    if (!formPago.monto || parseFloat(formPago.monto) <= 0) {
      showToast('Ingresá un monto válido', 'error');
      return;
    }
    try {
      const res = await pagosService.registrarPago(cuotaPago.id, {
        monto: parseFloat(formPago.monto),
        metodoPago: formPago.metodoPago,
        fecha: formPago.fecha || undefined,
        nota: formPago.nota || undefined
      });
      const { estado, saldoPendiente } = res.data;
      showToast(estado === 'Pagado'
        ? 'Pago registrado. Cuota completa.'
        : `Pago parcial registrado. Saldo pendiente: ${formatMonto(saldoPendiente)}`);
      setCuotaPago(null);
      fetchData();
    } catch (error) {
      showToast(error.response?.data || 'Error al registrar el pago', 'error');
    }
  };

  const abrirModalAjuste = (cuota) => {
    setFormAjuste({
      transf: cuota.montoEsperadoTransferencia,
      efectivo: cuota.montoEsperadoEfectivo,
      nota: cuota.notas || ''
    });
    setCuotaAjuste(cuota);
  };

  const handleAjustarCuota = async () => {
    try {
      await pagosService.ajustarCuota(cuotaAjuste.id, {
        montoEsperadoTransferencia: parseFloat(formAjuste.transf) || 0,
        montoEsperadoEfectivo: parseFloat(formAjuste.efectivo) || 0,
        notas: formAjuste.nota || undefined
      });
      showToast('Montos ajustados');
      setCuotaAjuste(null);
      fetchData();
    } catch (error) {
      showToast(error.response?.data || 'Error al ajustar la cuota', 'error');
    }
  };

  const estadoChip = (cuota) => {
    let bg, color, texto;
    if (cuota.estado === 'Pagado') {
      bg = colors.success + '20'; color = colors.success;
      texto = `✓ Pagó · ${cuota.metodoPago === 'Efectivo' ? 'efectivo' : 'transf.'}`;
    } else if (cuota.estado === 'Parcial') {
      bg = colors.warning + '20'; color = colors.warning;
      texto = `Parcial · abonó ${formatMonto(cuota.montoAbonado)}`;
    } else if (cuota.vencida) {
      bg = colors.error + '20'; color = colors.error;
      texto = 'Vencida';
    } else {
      bg = colors.warning + '20'; color = colors.warning;
      texto = 'Pendiente · vence el 10';
    }
    return (
      <span style={{
        display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '999px',
        fontSize: '0.72rem', fontWeight: '700', backgroundColor: bg, color
      }}>
        {texto}
      </span>
    );
  };

  // Agrupar el resumen de turnos por taller para la vista de tarifas
  const gruposTarifa = (() => {
    if (!tarifasData) return [];
    const grupos = [];
    (tarifasData.talleres || []).forEach(t => {
      grupos.push({
        key: String(t.id),
        nombre: t.nombre,
        turnos: (tarifasData.resumenTurnos || []).filter(rt => rt.tallerId === t.id)
      });
    });
    if (tarifasData.hayTurnosSinTaller) {
      grupos.push({
        key: 'general',
        nombre: 'General (turnos sin taller)',
        turnos: (tarifasData.resumenTurnos || []).filter(rt => rt.tallerId == null)
      });
    }
    return grupos.filter(g => g.turnos.length > 0);
  })();

  const cuotasVisibles = (resumen?.cuotas || []).filter(c => !soloDeudoras || c.estado !== 'Pagado');

  if (loading && !resumen) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: colors.gray[600] }}>Cargando...</div>;
  }

  const modalOverlay = {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
  };
  const modalBox = {
    backgroundColor: colors.white, borderRadius: '12px', padding: '1.5rem',
    width: '100%', maxWidth: '400px', margin: '1rem'
  };

  return (
    <div>
      {/* Header con navegación de mes */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: colors.gray[900], margin: 0 }}>Cobros</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => cambiarMes(-1)} style={{ ...btnStyle(colors.white), color: colors.gray[600], border: `1px solid ${colors.gray[300]}` }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontWeight: '700', fontSize: '1.05rem', minWidth: '140px', textAlign: 'center' }}>
            {nombresMeses[mes - 1]} {anio}
          </span>
          <button onClick={() => cambiarMes(1)} style={{ ...btnStyle(colors.white), color: colors.gray[600], border: `1px solid ${colors.gray[300]}` }}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Aranceles del mes */}
      <Card title="Aranceles del mes (valor por clase)">
        {gruposTarifa.length === 0 ? (
          <div style={{ color: colors.gray[500], fontSize: '0.875rem' }}>No hay turnos activos.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            {gruposTarifa.map(grupo => {
              const val = valores[grupo.key] || { transf: '', efectivo: '' };
              return (
                <div key={grupo.key} style={{ border: `1px solid ${colors.gray[200]}`, borderRadius: '8px', padding: '1rem' }}>
                  <div style={{ fontWeight: '600', marginBottom: '0.75rem' }}>{grupo.nombre}</div>
                  <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.7rem', color: colors.gray[500], marginBottom: '0.25rem' }}>Transferencia</label>
                      <input
                        type="number"
                        value={val.transf}
                        onChange={e => setValores(v => ({ ...v, [grupo.key]: { ...val, transf: e.target.value } }))}
                        style={inputStyle}
                        placeholder="$ por clase"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.7rem', color: colors.gray[500], marginBottom: '0.25rem' }}>Efectivo</label>
                      <input
                        type="number"
                        value={val.efectivo}
                        onChange={e => setValores(v => ({ ...v, [grupo.key]: { ...val, efectivo: e.target.value } }))}
                        style={inputStyle}
                        placeholder="$ por clase"
                      />
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: colors.gray[600], display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    {grupo.turnos.map(t => (
                      <div key={t.turnoId}>
                        {t.diaNombre} {t.horaInicio} → {t.cantidadClases} clase{t.cantidadClases !== 1 ? 's' : ''}
                        {val.transf && val.efectivo ? (
                          <strong style={{ color: colors.gray[900] }}>
                            {' = '}{formatMonto(t.cantidadClases * val.transf)} / {formatMonto(t.cantidadClases * val.efectivo)}
                          </strong>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <button onClick={handleGuardarTarifas} disabled={guardando} style={btnStyle(colors.primary, guardando)}>
            {guardando ? 'Guardando...' : 'Guardar aranceles'}
          </button>
          <button onClick={handleGenerarCuotas} disabled={generando} style={btnStyle(colors.success, generando)}>
            <RefreshCw size={14} />
            {generando ? 'Generando...' : 'Generar cuotas del mes'}
          </button>
          <button onClick={handleCopiarMensaje} style={btnStyle(colors.white)} className="btn-outline">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: colors.primary }}>
              <Copy size={14} /> Copiar mensaje de WhatsApp
            </span>
          </button>
        </div>
        <div style={{ fontSize: '0.72rem', color: colors.gray[500], marginTop: '0.5rem' }}>
          La cantidad de clases sale del calendario del mes y descuenta feriados. Al generar cuotas se aplica la regla de 2 veces por semana y el prorrateo de altas a mitad de mes.
        </div>
      </Card>

      {/* KPIs */}
      {resumen && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Cobrado', valor: formatMonto(resumen.kpis.cobrado), color: colors.success },
            { label: 'Por cobrar', valor: formatMonto(resumen.kpis.porCobrar), color: colors.warning },
            { label: 'Deuda meses anteriores', valor: formatMonto(resumen.kpis.deudaMesesAnteriores), color: colors.error },
            { label: 'Al día', valor: `${resumen.kpis.alumnasAlDia} / ${resumen.kpis.totalAlumnas}`, color: colors.gray[900] }
          ].map(kpi => (
            <div key={kpi.label} style={{ backgroundColor: colors.white, borderRadius: '8px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '1.3rem', fontWeight: '700', color: kpi.color }}>{kpi.valor}</div>
              <div style={{ fontSize: '0.7rem', color: colors.gray[500], textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>{kpi.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabla de cuotas */}
      <Card title={`Cuotas de ${nombresMeses[mes - 1]}`}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.8rem', color: colors.gray[600], display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={soloDeudoras} onChange={e => setSoloDeudoras(e.target.checked)} />
            Ver solo deudoras
          </label>
        </div>
        {cuotasVisibles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: colors.gray[500] }}>
            {(resumen?.cuotas || []).length === 0
              ? 'Todavía no se generaron cuotas para este mes. Cargá los aranceles y usá "Generar cuotas del mes".'
              : 'No hay deudoras. 🎉'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  {['Alumna', 'Clases', 'Monto', 'Estado', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '0.6rem 0.75rem', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: colors.gray[500], borderBottom: `1px solid ${colors.gray[200]}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cuotasVisibles.map(cuota => (
                  <tr key={cuota.id}>
                    <td style={{ padding: '0.6rem 0.75rem', borderBottom: `1px solid ${colors.gray[100]}` }}>
                      <div style={{ fontWeight: '600' }}>{cuota.alumnoNombre}</div>
                      <div style={{ fontSize: '0.72rem', color: colors.gray[500] }}>
                        {cuota.dias}{cuota.esDosVecesSemana ? ' · 2x por semana' : ''}
                      </div>
                      {cuota.deudaAnterior && (
                        <div style={{ fontSize: '0.72rem', color: colors.error, fontWeight: '600' }}>
                          Debe {cuota.deudaAnterior.meses.join(', ')} ({formatMonto(cuota.deudaAnterior.monto)})
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', borderBottom: `1px solid ${colors.gray[100]}`, whiteSpace: 'nowrap' }}>
                      {cuota.cantidadClases}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', borderBottom: `1px solid ${colors.gray[100]}`, whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: '600' }}>
                        {cuota.esDosVecesSemana
                          ? `${formatMonto(cuota.montoEsperadoEfectivo)}`
                          : `${formatMonto(cuota.montoEsperadoTransferencia)}`}
                        {cuota.montoAjustadoManual && (
                          <span title="Monto ajustado a mano" style={{ color: colors.warning, marginLeft: '0.3rem' }}>✎</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: colors.gray[500] }}>
                        {cuota.esDosVecesSemana
                          ? 'precio efectivo por 2x'
                          : `${formatMonto(cuota.montoEsperadoEfectivo)} en efectivo`}
                      </div>
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', borderBottom: `1px solid ${colors.gray[100]}`, whiteSpace: 'nowrap' }}>
                      {estadoChip(cuota)}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', borderBottom: `1px solid ${colors.gray[100]}`, whiteSpace: 'nowrap', textAlign: 'right' }}>
                      {cuota.estado !== 'Pagado' && (
                        <button onClick={() => abrirModalPago(cuota)} style={{ ...btnStyle(colors.success), padding: '0.4rem 0.7rem', fontSize: '0.75rem', marginRight: '0.4rem' }}>
                          <DollarSign size={13} /> Registrar pago
                        </button>
                      )}
                      <button onClick={() => abrirModalAjuste(cuota)} title="Ajustar montos" style={{ ...btnStyle(colors.white), padding: '0.4rem 0.5rem', border: `1px solid ${colors.gray[300]}` }}>
                        <Pencil size={13} color={colors.gray[600]} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal registrar pago */}
      {cuotaPago && (
        <div style={modalOverlay} onClick={() => setCuotaPago(null)}>
          <div style={modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem' }}>Registrar pago</h3>
            <div style={{ fontSize: '0.85rem', color: colors.gray[600], marginBottom: '1rem' }}>
              {cuotaPago.alumnoNombre} · {nombresMeses[mes - 1]} {anio}
              {cuotaPago.montoAbonado > 0 && ` · ya abonó ${formatMonto(cuotaPago.montoAbonado)}`}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: colors.gray[600], marginBottom: '0.25rem' }}>Método</label>
                <select value={formPago.metodoPago} onChange={e => cambiarMetodoPago(e.target.value)} style={{ ...inputStyle, width: '100%' }}>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Efectivo">Efectivo</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: colors.gray[600], marginBottom: '0.25rem' }}>Monto</label>
                <input type="number" value={formPago.monto} onChange={e => setFormPago(f => ({ ...f, monto: e.target.value }))} style={{ ...inputStyle, width: '100%' }} />
                <div style={{ fontSize: '0.7rem', color: colors.gray[500], marginTop: '0.25rem' }}>
                  Si es menor al esperado queda como pago parcial.
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: colors.gray[600], marginBottom: '0.25rem' }}>Fecha</label>
                <input type="date" value={formPago.fecha} onChange={e => setFormPago(f => ({ ...f, fecha: e.target.value }))} style={{ ...inputStyle, width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: colors.gray[600], marginBottom: '0.25rem' }}>Nota (opcional)</label>
                <input type="text" value={formPago.nota} onChange={e => setFormPago(f => ({ ...f, nota: e.target.value }))} placeholder="ej: comprobante por WhatsApp" style={{ ...inputStyle, width: '100%' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.5rem' }}>
                <button onClick={() => setCuotaPago(null)} style={{ ...btnStyle(colors.white), flex: 1, color: colors.gray[600], border: `1px solid ${colors.gray[300]}`, justifyContent: 'center' }}>Cancelar</button>
                <button onClick={handleRegistrarPago} style={{ ...btnStyle(colors.success), flex: 1, justifyContent: 'center' }}>Registrar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal ajustar montos */}
      {cuotaAjuste && (
        <div style={modalOverlay} onClick={() => setCuotaAjuste(null)}>
          <div style={modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem' }}>Ajustar montos</h3>
            <div style={{ fontSize: '0.85rem', color: colors.gray[600], marginBottom: '1rem' }}>
              {cuotaAjuste.alumnoNombre} · el sistema calculó {formatMonto(cuotaAjuste.montoEsperadoTransferencia)} transf. / {formatMonto(cuotaAjuste.montoEsperadoEfectivo)} efectivo
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: colors.gray[600], marginBottom: '0.25rem' }}>Monto por transferencia</label>
                <input type="number" value={formAjuste.transf} onChange={e => setFormAjuste(f => ({ ...f, transf: e.target.value }))} style={{ ...inputStyle, width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: colors.gray[600], marginBottom: '0.25rem' }}>Monto en efectivo</label>
                <input type="number" value={formAjuste.efectivo} onChange={e => setFormAjuste(f => ({ ...f, efectivo: e.target.value }))} style={{ ...inputStyle, width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: colors.gray[600], marginBottom: '0.25rem' }}>Nota (opcional)</label>
                <input type="text" value={formAjuste.nota} onChange={e => setFormAjuste(f => ({ ...f, nota: e.target.value }))} placeholder="motivo del ajuste" style={{ ...inputStyle, width: '100%' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.5rem' }}>
                <button onClick={() => setCuotaAjuste(null)} style={{ ...btnStyle(colors.white), flex: 1, color: colors.gray[600], border: `1px solid ${colors.gray[300]}`, justifyContent: 'center' }}>Cancelar</button>
                <button onClick={handleAjustarCuota} style={{ ...btnStyle(colors.primary), flex: 1, justifyContent: 'center' }}>Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />
      )}
    </div>
  );
}

export default Cobros;
