import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import Card from '../components/Card';
import Toast from '../components/Toast';
import { colors } from '../styles/colors';
import { turnosService, diasSinClaseService, inscripcionesService, alumnosService, configuracionService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function Calendario() {
  const { hasRole, user } = useAuth();
  const esAdmin = hasRole(['Admin']);
  const esAlumno = hasRole(['Alumno']);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [turnos, setTurnos] = useState([]);
  const [diasSinClase, setDiasSinClase] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [togglingDay, setTogglingDay] = useState(null);

  // Estado alumno
  const [inscripciones, setInscripciones] = useState([]);
  const [alumnoData, setAlumnoData] = useState(null);
  const [horasAnticipacion, setHorasAnticipacion] = useState(24);
  const [cancelandoId, setCancelandoId] = useState(null);
  const [inscribiendoTurnoId, setInscribiendoTurnoId] = useState(null);

  useEffect(() => {
    fetchDatos();
  }, [anio, mes]);

  const fetchDatos = async () => {
    try {
      setLoading(true);
      if (esAlumno && user?.alumnoId) {
        const [inscRes, turnosRes, diasRes, alumnoRes, configRes] = await Promise.all([
          inscripcionesService.getByAlumno(user.alumnoId),
          turnosService.getAllConFechas(),
          diasSinClaseService.getByMes(anio, mes),
          alumnosService.getById(user.alumnoId),
          configuracionService.get('HorasAnticipacionCancelacion')
        ]);
        setInscripciones(inscRes.data || []);
        setTurnos(turnosRes.data || []);
        setDiasSinClase(diasRes.data || []);
        setAlumnoData(alumnoRes.data);
        setHorasAnticipacion(parseInt(configRes.data.valor) || 24);
      } else {
        const [turnosRes, diasRes] = await Promise.all([
          turnosService.getAll(),
          diasSinClaseService.getByMes(anio, mes)
        ]);
        setTurnos(turnosRes.data || []);
        setDiasSinClase(diasRes.data || []);
      }
    } catch (error) {
      console.error('Error al cargar calendario:', error);
      setToast({ show: true, message: 'Error al cargar el calendario', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const setToastAndClose = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  const parseFechaBackend = (fechaStr) => {
    const solo = fechaStr.slice(0, 10);
    return new Date(solo + 'T00:00:00');
  };

  // Lookup: mis clases por fecha
  const misClasesPorFecha = useMemo(() => {
    const mapa = {};
    inscripciones.forEach(insc => {
      if (!insc.proximasFechas || !insc.turno) return;
      insc.proximasFechas.forEach(f => {
        const fechaStr = f.slice(0, 10);
        if (!mapa[fechaStr]) mapa[fechaStr] = [];
        mapa[fechaStr].push({
          inscripcionId: insc.id,
          turnoId: insc.turnoId,
          horaInicio: insc.turno.horaInicio,
          horaFin: insc.turno.horaFin,
          fechaStr: f
        });
      });
    });
    return mapa;
  }, [inscripciones]);

  // Lookup: turnos disponibles por fecha (usa cupos por fecha del backend)
  const turnosDisponiblesPorFecha = useMemo(() => {
    const mapa = {};
    turnos.forEach(turno => {
      if (!turno.proximasFechas) return;
      turno.proximasFechas.forEach(pf => {
        if ((pf.cuposDisponibles || 0) <= 0) return;
        const fechaStr = pf.fecha.slice(0, 10);
        const yaInscriptoEnFecha = (misClasesPorFecha[fechaStr] || []).some(c => c.turnoId === turno.id);
        if (yaInscriptoEnFecha) return;
        if (!mapa[fechaStr]) mapa[fechaStr] = [];
        mapa[fechaStr].push({
          turnoId: turno.id,
          horaInicio: turno.horaInicio,
          horaFin: turno.horaFin,
          cuposDisponibles: pf.cuposDisponibles,
          fechaStr
        });
      });
    });
    return mapa;
  }, [turnos, misClasesPorFecha]);

  // Handlers alumno
  const handleCancelar = async (inscripcionId, fecha) => {
    try {
      setCancelandoId(inscripcionId);
      await inscripcionesService.cancelarProximas(inscripcionId, 1, fecha);
      setToastAndClose('Clase cancelada. Se agregó una clase a recuperar.');
      fetchDatos();
    } catch (error) {
      console.error('Error al cancelar:', error);
      setToastAndClose(error.response?.data?.message || 'Error al cancelar la clase', 'error');
    } finally {
      setCancelandoId(null);
    }
  };

  const handleRecuperar = async (turnoId, fecha) => {
    if (!alumnoData || alumnoData.clasesPendientesRecuperar <= 0) {
      setToastAndClose('No tenés clases pendientes de recuperar', 'error');
      return;
    }
    try {
      setInscribiendoTurnoId(`${turnoId}-${fecha}`);
      await inscripcionesService.inscribirRecuperacion({
        alumnoId: user.alumnoId,
        turnoId,
        fecha
      });
      setToastAndClose('Inscripción a clase de recuperación exitosa');
      fetchDatos();
    } catch (error) {
      console.error('Error al inscribir:', error);
      setToastAndClose(error.response?.data || 'Error al inscribirse a la clase', 'error');
    } finally {
      setInscribiendoTurnoId(null);
    }
  };

  const diasSinClaseSet = new Set(
    diasSinClase.map(d => d.fecha.slice(0, 10))
  );

  const getClasesDelDia = (fecha) => {
    const d = new Date(fecha + 'T00:00:00');
    const dayOfWeek = d.getDay();
    return turnos.filter(t => t.diaSemana === dayOfWeek && t.activo);
  };

  const handleToggleDiaSinClase = async (fechaStr) => {
    if (!esAdmin) return;
    const existente = diasSinClase.find(d => d.fecha.slice(0, 10) === fechaStr);
    setTogglingDay(fechaStr);
    try {
      if (existente) {
        await diasSinClaseService.delete(existente.id);
        setToastAndClose('Se quitó el día sin clase');
      } else {
        await diasSinClaseService.create({
          fecha: fechaStr + 'T12:00:00Z',
          motivo: ''
        });
        setToastAndClose('Se marcó como día sin clase');
      }
      fetchDatos();
    } catch (error) {
      console.error('Error:', error);
      setToastAndClose(error.response?.data || 'Error al actualizar', 'error');
    } finally {
      setTogglingDay(null);
    }
  };

  const primerDia = new Date(anio, mes - 1, 1);
  const ultimoDia = new Date(anio, mes, 0);
  const diasEnMes = ultimoDia.getDate();
  const inicioSemana = primerDia.getDay();
  const hoy = new Date();
  const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

  const celdas = [];
  for (let i = 0; i < inicioSemana; i++) {
    celdas.push({ tipo: 'vacio', key: `e-${i}` });
  }
  for (let dia = 1; dia <= diasEnMes; dia++) {
    const fechaStr = `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    const esSinClase = diasSinClaseSet.has(fechaStr);
    const clases = getClasesDelDia(fechaStr);
    celdas.push({
      tipo: 'dia',
      key: fechaStr,
      dia,
      fechaStr,
      esSinClase,
      clases,
      esHoy: fechaStr === hoyStr
    });
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: colors.gray[600] }}>
        Cargando calendario...
      </div>
    );
  }

  const clasesPendientes = alumnoData?.clasesPendientesRecuperar || 0;

  return (
    <div>
      <h2 style={{
        fontSize: '1.5rem',
        fontWeight: '600',
        marginBottom: '1rem',
        color: colors.gray[900],
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <CalendarIcon size={24} />
        Calendario del mes
      </h2>

      {esAdmin && (
        <p style={{
          fontSize: '0.875rem',
          color: colors.gray[600],
          marginBottom: '1rem'
        }}>
          Hacé clic en un día para marcarlo o desmarcarlo como día sin clase (feriado, sábado sin clase, etc.).
        </p>
      )}

      {esAlumno && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
          flexWrap: 'wrap',
          marginBottom: '1rem',
          fontSize: '0.8rem',
          color: colors.gray[700]
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{
              width: 10, height: 10, borderRadius: '50%',
              backgroundColor: colors.primary, display: 'inline-block'
            }} />
            Mi clase
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{
              width: 10, height: 10, borderRadius: '50%',
              backgroundColor: colors.success, display: 'inline-block'
            }} />
            Turno disponible
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{
              width: 10, height: 10, borderRadius: '50%',
              backgroundColor: colors.error, display: 'inline-block'
            }} />
            Sin clase
          </span>
          <span style={{
            marginLeft: 'auto',
            fontWeight: '600',
            color: clasesPendientes > 0 ? colors.primary : colors.gray[500]
          }}>
            Clases a recuperar: {clasesPendientes}
          </span>
        </div>
      )}

      <Card>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          <button
            onClick={() => {
              if (mes === 1) { setMes(12); setAnio(a => a - 1); } else setMes(m => m - 1);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.5rem',
              backgroundColor: colors.gray[100],
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              color: colors.gray[700]
            }}
          >
            <ChevronLeft size={20} />
          </button>
          <span style={{ fontSize: '1.25rem', fontWeight: '600', color: colors.gray[900] }}>
            {nombresMeses[mes - 1]} {anio}
          </span>
          <button
            onClick={() => {
              if (mes === 12) { setMes(1); setAnio(a => a + 1); } else setMes(m => m + 1);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.5rem',
              backgroundColor: colors.gray[100],
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              color: colors.gray[700]
            }}
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '2px',
          fontSize: '0.875rem'
        }}>
          {diasSemana.map(d => (
            <div
              key={d}
              style={{
                padding: '0.5rem',
                fontWeight: '600',
                color: colors.gray[600],
                textAlign: 'center'
              }}
            >
              {d}
            </div>
          ))}
          {celdas.map((celda) => {
            if (celda.tipo === 'vacio') {
              return <div key={celda.key} style={{ minHeight: '80px', backgroundColor: colors.gray[50], borderRadius: '4px' }} />;
            }
            const { dia, fechaStr, esSinClase, clases, esHoy } = celda;
            const isLoading = togglingDay === fechaStr;

            // Datos alumno para esta celda
            const misClases = esAlumno ? (misClasesPorFecha[fechaStr] || []) : [];
            const turnosDisp = esAlumno ? (turnosDisponiblesPorFecha[fechaStr] || []) : [];

            return (
              <div
                key={celda.key}
                onClick={() => esAdmin && !isLoading && handleToggleDiaSinClase(fechaStr)}
                style={{
                  minHeight: '80px',
                  padding: '0.35rem',
                  backgroundColor: esSinClase ? colors.error + '20' : esHoy ? colors.primary + '15' : misClases.length > 0 ? colors.primary + '10' : colors.gray[50],
                  border: esHoy ? `2px solid ${colors.primary}` : `1px solid ${colors.gray[200]}`,
                  borderRadius: '6px',
                  cursor: esAdmin ? 'pointer' : 'default',
                  opacity: isLoading ? 0.7 : 1
                }}
              >
                <div style={{
                  fontWeight: esHoy ? '700' : '600',
                  color: esSinClase ? colors.error : colors.gray[800],
                  marginBottom: '0.25rem'
                }}>
                  {dia}
                </div>

                {/* Admin view */}
                {!esAlumno && (
                  <>
                    {esSinClase && (
                      <div style={{ fontSize: '0.65rem', color: colors.error, fontWeight: '600' }}>
                        Sin clase
                      </div>
                    )}
                    {!esSinClase && clases.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                        {clases.slice(0, 3).map(t => (
                          <div key={t.id} style={{ fontSize: '0.65rem', color: colors.gray[600] }}>
                            {t.horaInicio}
                          </div>
                        ))}
                        {clases.length > 3 && (
                          <div style={{ fontSize: '0.6rem', color: colors.gray[500] }}>+{clases.length - 3}</div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Alumno view */}
                {esAlumno && (
                  <>
                    {esSinClase && (
                      <div style={{ fontSize: '0.65rem', color: colors.error, fontWeight: '600' }}>
                        Sin clase
                      </div>
                    )}
                    {!esSinClase && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {/* Mis clases */}
                        {misClases.map(c => {
                          const fechaClase = parseFechaBackend(c.fechaStr);
                          if (c.horaInicio) {
                            const [h, m] = c.horaInicio.split(':').map(Number);
                            fechaClase.setHours(h, m, 0, 0);
                          }
                          const horasRestantes = (fechaClase - new Date()) / (1000 * 60 * 60);
                          const puedeCancelar = horasRestantes >= horasAnticipacion;
                          const estaCancelando = cancelandoId === c.inscripcionId;

                          return (
                            <div key={`mi-${c.inscripcionId}`} style={{
                              display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.6rem'
                            }}>
                              <span style={{
                                width: 6, height: 6, borderRadius: '50%',
                                backgroundColor: colors.primary, flexShrink: 0
                              }} />
                              <span style={{ color: colors.gray[700], flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {c.horaInicio}
                              </span>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleCancelar(c.inscripcionId, c.fechaStr); }}
                                disabled={!puedeCancelar || estaCancelando}
                                title={puedeCancelar ? 'Cancelar clase' : `Requiere ${horasAnticipacion}hs de anticipación`}
                                style={{
                                  width: 16, height: 16, padding: 0,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  backgroundColor: puedeCancelar ? colors.error : colors.gray[300],
                                  color: colors.white,
                                  border: 'none', borderRadius: '50%',
                                  cursor: puedeCancelar ? 'pointer' : 'not-allowed',
                                  fontSize: '0.55rem', fontWeight: '700', lineHeight: 1,
                                  flexShrink: 0,
                                  opacity: estaCancelando ? 0.5 : 1
                                }}
                              >
                                x
                              </button>
                            </div>
                          );
                        })}

                        {/* Turnos disponibles */}
                        {turnosDisp.map(t => {
                          const itemKey = `${t.turnoId}-${t.fechaStr}`;
                          const estaInscribiendo = inscribiendoTurnoId === itemKey;
                          return (
                            <div key={`disp-${t.turnoId}`} style={{
                              display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.6rem'
                            }}>
                              <span style={{
                                width: 6, height: 6, borderRadius: '50%',
                                backgroundColor: colors.success, flexShrink: 0
                              }} />
                              <span style={{ color: colors.gray[600], flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {t.horaInicio}
                              </span>
                              {clasesPendientes > 0 && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleRecuperar(t.turnoId, t.fechaStr); }}
                                  disabled={estaInscribiendo}
                                  title="Inscribirme a recuperación"
                                  style={{
                                    width: 16, height: 16, padding: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    backgroundColor: colors.success,
                                    color: colors.white,
                                    border: 'none', borderRadius: '50%',
                                    cursor: 'pointer',
                                    fontSize: '0.65rem', fontWeight: '700', lineHeight: 1,
                                    flexShrink: 0,
                                    opacity: estaInscribiendo ? 0.5 : 1
                                  }}
                                >
                                  +
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}
    </div>
  );
}

export default Calendario;
