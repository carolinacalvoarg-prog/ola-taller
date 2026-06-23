import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Edit2, CheckCircle, Clock, AlertTriangle, X, Save, DollarSign } from 'lucide-react';
import Card from '../components/Card';
import Toast from '../components/Toast';
import { colors } from '../styles/colors';
import { pagosService } from '../services/api';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const pesos = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

const ESTADOS = {
  Pendiente: { label: 'Pendiente', color: colors.warning, bg: '#FEF3C7', icon: Clock },
  Pagado:    { label: 'Pagado',    color: colors.success, bg: '#D1FAE5', icon: CheckCircle },
  Vencido:   { label: 'Vencido',  color: colors.error,   bg: '#FEE2E2', icon: AlertTriangle },
};

function Cuotas() {
  const hoy = new Date();
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [anio, setAnio] = useState(hoy.getFullYear());

  const [cuotas, setCuotas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todos');

  const [modalEditar, setModalEditar] = useState(null);
  const [formEditar, setFormEditar] = useState({ montoFinal: '', notasAdmin: '' });
  const [guardando, setGuardando] = useState(false);

  const [modalPago, setModalPago] = useState(null);
  const [formPago, setFormPago] = useState({ metodoPago: 'Transferencia', referencia: '' });
  const [registrandoPago, setRegistrandoPago] = useState(false);

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3000);
  };

  useEffect(() => {
    fetchCuotas();
  }, [mes, anio]);

  const fetchCuotas = async () => {
    setLoading(true);
    try {
      const resp = await pagosService.getByMes(mes, anio);
      setCuotas(resp.data || []);
    } catch {
      showToast('Error al cargar cuotas', 'error');
    } finally {
      setLoading(false);
    }
  };

  const cambiarMes = (delta) => {
    let nuevoMes = mes + delta;
    let nuevoAnio = anio;
    if (nuevoMes > 12) { nuevoMes = 1; nuevoAnio++; }
    if (nuevoMes < 1) { nuevoMes = 12; nuevoAnio--; }
    setMes(nuevoMes);
    setAnio(nuevoAnio);
  };

  const abrirEditar = (cuota) => {
    setModalEditar(cuota);
    setFormEditar({ montoFinal: cuota.montoFinal, notasAdmin: cuota.notasAdmin || '' });
  };

  const guardarEdicion = async () => {
    setGuardando(true);
    try {
      await pagosService.update(modalEditar.id, {
        montoFinal: Number(formEditar.montoFinal),
        notasAdmin: formEditar.notasAdmin,
      });
      showToast('Cuota actualizada');
      setModalEditar(null);
      await fetchCuotas();
    } catch {
      showToast('Error al guardar', 'error');
    } finally {
      setGuardando(false);
    }
  };

  const abrirRegistrarPago = (cuota) => {
    setModalPago(cuota);
    setFormPago({ metodoPago: 'Transferencia', referencia: '' });
  };

  const registrarPago = async () => {
    setRegistrandoPago(true);
    try {
      await pagosService.registrarPago(modalPago.id, {
        metodoPago: formPago.metodoPago,
        referencia: formPago.referencia,
        fechaPago: new Date().toISOString(),
      });
      showToast('Pago registrado');
      setModalPago(null);
      await fetchCuotas();
    } catch {
      showToast('Error al registrar pago', 'error');
    } finally {
      setRegistrandoPago(false);
    }
  };

  const cuotasFiltradas = cuotas.filter(c => filtro === 'todos' || c.estado === filtro);

  const resumen = {
    total: cuotas.length,
    pagados: cuotas.filter(c => c.estado === 'Pagado').length,
    pendientes: cuotas.filter(c => c.estado === 'Pendiente').length,
    vencidos: cuotas.filter(c => c.estado === 'Vencido').length,
    recaudado: cuotas.filter(c => c.estado === 'Pagado').reduce((s, c) => s + c.montoFinal, 0),
    porCobrar: cuotas.filter(c => c.estado !== 'Pagado').reduce((s, c) => s + c.montoFinal, 0),
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1rem' }}>
      <Toast {...toast} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: colors.gray[800], margin: 0 }}>Cuotas</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => cambiarMes(-1)} style={btnIcon}><ChevronLeft size={16} /></button>
          <span style={{ fontWeight: '600', color: colors.gray[800], minWidth: '150px', textAlign: 'center' }}>
            {MESES[mes - 1]} {anio}
          </span>
          <button onClick={() => cambiarMes(1)} style={btnIcon}><ChevronRight size={16} /></button>
        </div>
      </div>

      {/* Resumen */}
      {!loading && cuotas.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <StatCard label="Total alumnos" value={resumen.total} />
          <StatCard label="Pagados" value={resumen.pagados} color={colors.success} />
          <StatCard label="Pendientes" value={resumen.pendientes} color={colors.warning} />
          {resumen.vencidos > 0 && <StatCard label="Vencidos" value={resumen.vencidos} color={colors.error} />}
          <StatCard label="Recaudado" value={pesos(resumen.recaudado)} color={colors.success} />
          <StatCard label="Por cobrar" value={pesos(resumen.porCobrar)} color={colors.warning} />
        </div>
      )}

      <Card>
        {/* Filtros */}
        {cuotas.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            {[['todos','Todos'], ['Pendiente','Pendientes'], ['Pagado','Pagados'], ['Vencido','Vencidos']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setFiltro(val)}
                style={{
                  padding: '0.35rem 0.9rem', borderRadius: '20px', fontSize: '0.85rem', cursor: 'pointer',
                  border: filtro === val ? 'none' : `1px solid ${colors.gray[200]}`,
                  backgroundColor: filtro === val ? colors.primary : 'white',
                  color: filtro === val ? 'white' : colors.gray[600],
                  fontWeight: filtro === val ? '600' : '400',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <p style={{ color: colors.gray[500], padding: '1rem 0' }}>Cargando cuotas...</p>
        ) : cuotas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: colors.gray[500] }}>
            <DollarSign size={40} style={{ marginBottom: '0.75rem', opacity: 0.3 }} />
            <p>No hay cuotas generadas para {MESES[mes - 1]} {anio}.</p>
            <p style={{ fontSize: '0.85rem' }}>
              Podés generarlas desde <a href="/aranceles" style={{ color: colors.primary }}>Aranceles</a>.
            </p>
          </div>
        ) : cuotasFiltradas.length === 0 ? (
          <p style={{ color: colors.gray[500] }}>No hay cuotas con ese estado.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${colors.gray[200]}` }}>
                {['Alumno', 'Talleres', 'Calculado', 'A pagar', 'Estado', 'Notas', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '0.8rem', color: colors.gray[500], fontWeight: '600' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cuotasFiltradas.map(c => {
                const est = ESTADOS[c.estado] || ESTADOS.Pendiente;
                const EstIcon = est.icon;
                return (
                  <tr key={c.id} style={{ borderBottom: `1px solid ${colors.gray[100]}` }}>
                    <td style={{ padding: '0.75rem', fontWeight: '600', color: colors.gray[800] }}>
                      {c.alumno.nombre} {c.alumno.apellido}
                      {c.aplicaDescuentoMultiple && (
                        <span title="Descuento por 2+ clases/semana" style={{ marginLeft: '0.4rem', fontSize: '0.7rem', backgroundColor: '#EDE9FE', color: '#5B21B6', padding: '0.1rem 0.4rem', borderRadius: '8px' }}>
                          2×semana
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: colors.gray[600] }}>
                      {c.talleres?.join(', ') || '—'}
                    </td>
                    <td style={{ padding: '0.75rem', color: colors.gray[500], fontSize: '0.9rem' }}>
                      {pesos(c.montoCalculado)}
                    </td>
                    <td style={{ padding: '0.75rem', fontWeight: '700', color: colors.gray[800] }}>
                      {pesos(c.montoFinal)}
                      {c.montoFinal !== c.montoCalculado && (
                        <span title={`Calculado: ${pesos(c.montoCalculado)}`} style={{ marginLeft: '0.4rem', fontSize: '0.7rem', color: colors.warning }}>✎</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                        backgroundColor: est.bg, color: est.color,
                        padding: '0.25rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600'
                      }}>
                        <EstIcon size={12} /> {est.label}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: colors.gray[500], maxWidth: '150px' }}>
                      {c.notasAdmin || '—'}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button onClick={() => abrirEditar(c)} title="Editar monto" style={btnIconSm}>
                          <Edit2 size={13} />
                        </button>
                        {c.estado !== 'Pagado' && (
                          <button onClick={() => abrirRegistrarPago(c)} title="Registrar pago" style={{ ...btnIconSm, backgroundColor: colors.success, color: 'white', border: 'none' }}>
                            <CheckCircle size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {/* Modal editar cuota */}
      {modalEditar && (
        <Modal titulo={`Editar cuota — ${modalEditar.alumno.nombre} ${modalEditar.alumno.apellido}`} onClose={() => setModalEditar(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Monto a pagar</label>
              <input
                type="number"
                value={formEditar.montoFinal}
                onChange={e => setFormEditar(f => ({ ...f, montoFinal: e.target.value }))}
                style={inputFullStyle}
              />
              <p style={{ fontSize: '0.8rem', color: colors.gray[500], marginTop: '0.25rem' }}>
                Calculado por el sistema: {pesos(modalEditar.montoCalculado)}
              </p>
            </div>
            <div>
              <label style={labelStyle}>Nota (opcional)</label>
              <input
                type="text"
                value={formEditar.notasAdmin}
                onChange={e => setFormEditar(f => ({ ...f, notasAdmin: e.target.value }))}
                placeholder="Ej: Beca 20%, descuento especial..."
                style={inputFullStyle}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setModalEditar(null)} style={btnSecondary}>Cancelar</button>
              <button onClick={guardarEdicion} disabled={guardando} style={btnPrimary}>
                <Save size={14} /> {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal registrar pago */}
      {modalPago && (
        <Modal titulo={`Registrar pago — ${modalPago.alumno.nombre} ${modalPago.alumno.apellido}`} onClose={() => setModalPago(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ color: colors.gray[600], margin: 0 }}>
              Monto: <strong>{pesos(modalPago.montoFinal)}</strong>
            </p>
            <div>
              <label style={labelStyle}>Método de pago</label>
              <select
                value={formPago.metodoPago}
                onChange={e => setFormPago(f => ({ ...f, metodoPago: e.target.value }))}
                style={inputFullStyle}
              >
                <option value="Transferencia">Transferencia</option>
                <option value="Efectivo">Efectivo</option>
                <option value="MercadoPago">Mercado Pago</option>
              </select>
            </div>
            {formPago.metodoPago !== 'Efectivo' && (
              <div>
                <label style={labelStyle}>Referencia / Nro. comprobante (opcional)</label>
                <input
                  type="text"
                  value={formPago.referencia}
                  onChange={e => setFormPago(f => ({ ...f, referencia: e.target.value }))}
                  placeholder="Ej: 1234567890"
                  style={inputFullStyle}
                />
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setModalPago(null)} style={btnSecondary}>Cancelar</button>
              <button onClick={registrarPago} disabled={registrandoPago} style={btnPrimary}>
                <CheckCircle size={14} /> {registrandoPago ? 'Registrando...' : 'Confirmar pago'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ backgroundColor: 'white', border: `1px solid ${colors.gray[200]}`, borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
      <div style={{ fontSize: '1.3rem', fontWeight: '700', color: color || colors.gray[800] }}>{value}</div>
      <div style={{ fontSize: '0.8rem', color: colors.gray[500], marginTop: '0.2rem' }}>{label}</div>
    </div>
  );
}

function Modal({ titulo, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem', width: '100%', maxWidth: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: colors.gray[800] }}>{titulo}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.gray[400] }}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '0.85rem', fontWeight: '600', color: colors.gray[700], marginBottom: '0.35rem' };
const inputFullStyle = { width: '100%', padding: '0.5rem 0.75rem', border: `1px solid ${colors.gray[300]}`, borderRadius: '6px', fontSize: '0.9rem', boxSizing: 'border-box' };
const btnPrimary = { display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: colors.primary, color: 'white', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', fontSize: '0.85rem', cursor: 'pointer', fontWeight: '600' };
const btnSecondary = { display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: 'white', color: colors.gray[700], border: `1px solid ${colors.gray[300]}`, borderRadius: '6px', padding: '0.5rem 0.75rem', fontSize: '0.85rem', cursor: 'pointer' };
const btnIcon = { backgroundColor: 'white', color: colors.gray[600], border: `1px solid ${colors.gray[200]}`, borderRadius: '6px', padding: '0.35rem 0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center' };
const btnIconSm = { backgroundColor: 'white', color: colors.gray[600], border: `1px solid ${colors.gray[200]}`, borderRadius: '4px', padding: '0.25rem 0.4rem', cursor: 'pointer', display: 'flex', alignItems: 'center' };

export default Cuotas;
