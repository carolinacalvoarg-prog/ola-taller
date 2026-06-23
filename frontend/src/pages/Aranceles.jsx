import { useState, useEffect } from 'react';
import { DollarSign, Edit2, Save, X, Copy, Check, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import Card from '../components/Card';
import Toast from '../components/Toast';
import { colors } from '../styles/colors';
import { preciosTallerService, pagosService, diasSinClaseService, talleresService } from '../services/api';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS_SEMANA = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

const pesos = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

function Aranceles() {
  const hoy = new Date();
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [anio, setAnio] = useState(hoy.getFullYear());

  const [precios, setPrecios] = useState([]);
  const [preview, setPreview] = useState(null);
  const [feriados, setFeriados] = useState([]);
  const [loadingPrecios, setLoadingPrecios] = useState(true);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const [editandoPrecio, setEditandoPrecio] = useState(null);
  const [formPrecio, setFormPrecio] = useState({ precioTransferencia: '', precioEfectivo: '' });
  const [guardandoPrecio, setGuardandoPrecio] = useState(false);

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3000);
  };

  useEffect(() => {
    fetchPrecios();
  }, []);

  useEffect(() => {
    fetchPreview();
  }, [mes, anio]);

  const fetchPrecios = async () => {
    setLoadingPrecios(true);
    try {
      const resp = await preciosTallerService.getActuales();
      setPrecios(resp.data || []);
    } catch {
      showToast('Error al cargar precios', 'error');
    } finally {
      setLoadingPrecios(false);
    }
  };

  const fetchPreview = async () => {
    setLoadingPreview(true);
    try {
      const [previewResp, feriadosResp] = await Promise.all([
        pagosService.getPreview(mes, anio),
        diasSinClaseService.getByMes(anio, mes),
      ]);
      setPreview(previewResp.data || null);
      setFeriados(feriadosResp.data || []);
    } catch {
      showToast('Error al cargar preview', 'error');
    } finally {
      setLoadingPreview(false);
    }
  };

  const abrirEditPrecio = (precio) => {
    setEditandoPrecio(precio.tallerId);
    setFormPrecio({
      precioTransferencia: precio.precioTransferencia,
      precioEfectivo: precio.precioEfectivo,
    });
  };

  const guardarPrecio = async (tallerId) => {
    setGuardandoPrecio(true);
    try {
      await preciosTallerService.setPrecio(tallerId, {
        precioTransferencia: Number(formPrecio.precioTransferencia),
        precioEfectivo: Number(formPrecio.precioEfectivo),
        vigenteDesde: `${anio}-${String(mes).padStart(2, '0')}-01`,
      });
      showToast('Precio actualizado');
      setEditandoPrecio(null);
      await fetchPrecios();
      await fetchPreview();
    } catch {
      showToast('Error al guardar precio', 'error');
    } finally {
      setGuardandoPrecio(false);
    }
  };

  const generarCuotas = async () => {
    if (!window.confirm(`¿Generar cuotas para ${MESES[mes - 1]} ${anio}? Esta acción creará una cuota para cada alumno activo.`)) return;
    setGenerando(true);
    try {
      await pagosService.generar(mes, anio);
      showToast(`Cuotas de ${MESES[mes - 1]} ${anio} generadas`);
      await fetchPreview();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Error al generar cuotas';
      showToast(msg, 'error');
    } finally {
      setGenerando(false);
    }
  };

  const copiarTexto = () => {
    if (!preview) return;
    const lineas = [
      `Hola! Les compartimos el arancel de ${MESES[mes - 1].toUpperCase()} ${anio} 🫶`,
      '',
      'Valores 👇',
      '',
    ];
    preview.talleres.forEach(t => {
      const dias = DIAS_SEMANA[t.diaSemana] || t.tallerNombre;
      lineas.push(`🌿 ${dias.toUpperCase()} (${t.cantidadClases} clases): ${pesos(t.totalTransferencia)} TRANS / ${pesos(t.totalEfectivo)} EFECTIVO`);
    });
    lineas.push('');
    lineas.push('Los pagos se realizan del 1 al 10 de cada mes sin excepción.');
    lineas.push('El descuento es solo en efectivo.');
    navigator.clipboard.writeText(lineas.join('\n'));
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const cambiarMes = (delta) => {
    let nuevoMes = mes + delta;
    let nuevoAnio = anio;
    if (nuevoMes > 12) { nuevoMes = 1; nuevoAnio++; }
    if (nuevoMes < 1) { nuevoMes = 12; nuevoAnio--; }
    setMes(nuevoMes);
    setAnio(nuevoAnio);
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
      <Toast {...toast} />

      <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: colors.gray[800], marginBottom: '2rem' }}>
        Aranceles
      </h1>

      {/* Precios por taller */}
      <Card style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '600', color: colors.gray[700], marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <DollarSign size={18} /> Precio por clase según taller
        </h2>

        {loadingPrecios ? (
          <p style={{ color: colors.gray[500] }}>Cargando...</p>
        ) : precios.length === 0 ? (
          <p style={{ color: colors.gray[500] }}>No hay precios configurados aún.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${colors.gray[200]}` }}>
                {['Taller', 'Transferencia / clase', 'Efectivo / clase', 'Vigente desde', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '0.8rem', color: colors.gray[500], fontWeight: '600' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {precios.map(p => (
                <tr key={p.tallerId} style={{ borderBottom: `1px solid ${colors.gray[100]}` }}>
                  <td style={{ padding: '0.75rem', fontWeight: '600', color: colors.gray[800] }}>{p.tallerNombre}</td>

                  {editandoPrecio === p.tallerId ? (
                    <>
                      <td style={{ padding: '0.5rem 0.75rem' }}>
                        <input
                          type="number"
                          value={formPrecio.precioTransferencia}
                          onChange={e => setFormPrecio(f => ({ ...f, precioTransferencia: e.target.value }))}
                          style={inputStyle}
                        />
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem' }}>
                        <input
                          type="number"
                          value={formPrecio.precioEfectivo}
                          onChange={e => setFormPrecio(f => ({ ...f, precioEfectivo: e.target.value }))}
                          style={inputStyle}
                        />
                      </td>
                      <td style={{ padding: '0.75rem', color: colors.gray[500], fontSize: '0.85rem' }}>
                        {formatFecha(p.vigenteDesde)}
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => guardarPrecio(p.tallerId)} disabled={guardandoPrecio} style={btnPrimary}>
                            <Save size={14} /> Guardar
                          </button>
                          <button onClick={() => setEditandoPrecio(null)} style={btnSecondary}>
                            <X size={14} />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ padding: '0.75rem', color: colors.gray[700] }}>{pesos(p.precioTransferencia)}</td>
                      <td style={{ padding: '0.75rem', color: colors.gray[700] }}>{pesos(p.precioEfectivo)}</td>
                      <td style={{ padding: '0.75rem', color: colors.gray[500], fontSize: '0.85rem' }}>
                        {formatFecha(p.vigenteDesde)}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <button onClick={() => abrirEditPrecio(p)} style={btnSecondary}>
                          <Edit2 size={14} /> Editar
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Preview mensual */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '600', color: colors.gray[700], margin: 0 }}>
            Preview de cuotas
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button onClick={() => cambiarMes(-1)} style={btnIcon}><ChevronLeft size={16} /></button>
            <span style={{ fontWeight: '600', color: colors.gray[800], minWidth: '140px', textAlign: 'center' }}>
              {MESES[mes - 1]} {anio}
            </span>
            <button onClick={() => cambiarMes(1)} style={btnIcon}><ChevronRight size={16} /></button>
          </div>
        </div>

        {feriados.length > 0 && (
          <div style={{ backgroundColor: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '6px', padding: '0.6rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: '#92400E', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <AlertCircle size={15} style={{ marginTop: '1px', flexShrink: 0 }} />
            <span>
              Feriados en {MESES[mes - 1]}: {feriados.map(f => new Date(f.fecha).getDate()).join(', ')}.
              Esos días se descuentan del conteo de clases.
            </span>
          </div>
        )}

        {loadingPreview ? (
          <p style={{ color: colors.gray[500] }}>Calculando...</p>
        ) : !preview ? (
          <p style={{ color: colors.gray[500] }}>No se pudo calcular el preview.</p>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.25rem' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${colors.gray[200]}` }}>
                  {['Taller / Día', 'Días del mes', 'Clases', 'Total transfer.', 'Total efectivo', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '0.8rem', color: colors.gray[500], fontWeight: '600' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.talleres.map(t => (
                  <tr key={t.tallerId} style={{ borderBottom: `1px solid ${colors.gray[100]}` }}>
                    <td style={{ padding: '0.75rem', fontWeight: '600', color: colors.gray[800] }}>
                      {t.tallerNombre}
                      {t.diaSemana != null && (
                        <span style={{ fontWeight: '400', color: colors.gray[500], fontSize: '0.85rem' }}> — {DIAS_SEMANA[t.diaSemana]}</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: colors.gray[600] }}>
                      {t.diasDelMes?.join(', ')}
                    </td>
                    <td style={{ padding: '0.75rem', fontWeight: '700', color: colors.gray[800] }}>
                      {t.cantidadClases}
                    </td>
                    <td style={{ padding: '0.75rem', color: colors.gray[700] }}>{pesos(t.totalTransferencia)}</td>
                    <td style={{ padding: '0.75rem', color: colors.gray[700] }}>{pesos(t.totalEfectivo)}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{ fontSize: '0.8rem', color: colors.gray[500] }}>
                        {t.alumnosInscriptos} alumnos
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {preview.yaGeneradas ? (
              <div style={{ backgroundColor: '#D1FAE5', border: '1px solid #6EE7B7', borderRadius: '6px', padding: '0.75rem 1rem', fontSize: '0.9rem', color: '#065F46' }}>
                ✅ Las cuotas de {MESES[mes - 1]} {anio} ya fueron generadas ({preview.totalAlumnos} alumnos).{' '}
                <a href="/cuotas" style={{ color: colors.primary, textDecoration: 'underline' }}>Ver cuotas →</a>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button onClick={copiarTexto} style={btnSecondary}>
                  {copiado ? <><Check size={15} /> ¡Copiado!</> : <><Copy size={15} /> Copiar texto para WhatsApp</>}
                </button>
                <button onClick={generarCuotas} disabled={generando} style={btnPrimary}>
                  {generando ? 'Generando...' : `Generar cuotas de ${MESES[mes - 1]}`}
                </button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

const formatFecha = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

const inputStyle = {
  width: '110px',
  padding: '0.3rem 0.5rem',
  border: `1px solid ${colors.gray[300]}`,
  borderRadius: '4px',
  fontSize: '0.9rem',
};

const btnPrimary = {
  display: 'flex', alignItems: 'center', gap: '0.4rem',
  backgroundColor: colors.primary, color: 'white',
  border: 'none', borderRadius: '6px',
  padding: '0.5rem 1rem', fontSize: '0.85rem',
  cursor: 'pointer', fontWeight: '600',
};

const btnSecondary = {
  display: 'flex', alignItems: 'center', gap: '0.4rem',
  backgroundColor: 'white', color: colors.gray[700],
  border: `1px solid ${colors.gray[300]}`, borderRadius: '6px',
  padding: '0.5rem 0.75rem', fontSize: '0.85rem',
  cursor: 'pointer',
};

const btnIcon = {
  backgroundColor: 'white', color: colors.gray[600],
  border: `1px solid ${colors.gray[200]}`, borderRadius: '6px',
  padding: '0.35rem 0.5rem', cursor: 'pointer',
  display: 'flex', alignItems: 'center',
};

export default Aranceles;
