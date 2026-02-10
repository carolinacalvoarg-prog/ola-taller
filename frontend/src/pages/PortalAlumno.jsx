import { useState, useEffect } from 'react';
import { Calendar, UserCheck, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import Card from '../components/Card';
import Toast from '../components/Toast';
import { colors } from '../styles/colors';
import { turnosService, inscripcionesService, alumnosService, configuracionService } from '../services/api';
import { useAuth } from '../context/AuthContext';

function PortalAlumno() {
  const { user } = useAuth();
  const [alumnoData, setAlumnoData] = useState(null);
  const [inscripciones, setInscripciones] = useState([]);
  const [recuperaciones, setRecuperaciones] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [horasAnticipacion, setHorasAnticipacion] = useState(24);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [cancelandoN, setCancelandoN] = useState(null);
  const [inscribiendo, setInscribiendo] = useState(null);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user?.alumnoId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [alumnoRes, inscripcionesRes, turnosRes, configRes, recuperacionesRes] = await Promise.all([
        alumnosService.getById(user.alumnoId),
        inscripcionesService.getByAlumno(user.alumnoId),
        turnosService.getAllConFechas(),
        configuracionService.get('HorasAnticipacionCancelacion'),
        inscripcionesService.getRecuperacionesByAlumno(user.alumnoId)
      ]);

      setAlumnoData(alumnoRes.data);
      setInscripciones(inscripcionesRes.data || []);
      setRecuperaciones(recuperacionesRes.data || []);
      setTurnos(turnosRes.data || []);
      setHorasAnticipacion(parseInt(configRes.data.valor) || 24);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      showToast('Error al cargar los datos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  const getDiaSemana = (dia) => {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
    return dias[dia];
  };

  // Parsear fecha del backend como local (evita desfase UTC)
  const parseFechaBackend = (fechaStr) => {
    const solo = fechaStr.slice(0, 10);
    return new Date(solo + 'T00:00:00');
  };

  const formatearFechaCorta = (fecha) => {
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return `${dias[fecha.getDay()]} ${fecha.getDate()}/${fecha.getMonth() + 1}`;
  };

  // Obtener la proxima clase (la mas cercana) usando datos del backend
  const getProximaClase = () => {
    if (inscripciones.length === 0) return null;

    let proximaClase = null;
    let fechaMasCercana = null;

    inscripciones.forEach(insc => {
      if (!insc.proximasFechas || insc.proximasFechas.length === 0) return;
      const fecha = parseFechaBackend(insc.proximasFechas[0]);
      if (insc.turno?.horaInicio) {
        const [h, m] = insc.turno.horaInicio.split(':').map(Number);
        fecha.setHours(h, m, 0, 0);
      }
      if (!fechaMasCercana || fecha < fechaMasCercana) {
        fechaMasCercana = fecha;
        proximaClase = { ...insc, proximaFecha: fecha };
      }
    });

    return proximaClase;
  };

  const handleCancelarClase = async (inscripcionId, fecha) => {
    try {
      setCancelandoN({ inscripcionId, cantidad: 1 });
      await inscripcionesService.cancelarProximas(inscripcionId, 1, fecha);
      showToast('Clase cancelada. Se agrego una clase a recuperar.', 'success');
      fetchData();
    } catch (error) {
      console.error('Error al cancelar:', error);
      showToast(error.response?.data?.message || 'Error al cancelar la clase', 'error');
    } finally {
      setCancelandoN(null);
    }
  };

  const handleInscribirRecuperacion = async (turnoId, fecha) => {
    if (!alumnoData || alumnoData.clasesPendientesRecuperar <= 0) {
      showToast('No tienes clases pendientes de recuperar', 'error');
      return;
    }

    try {
      setInscribiendo(`${turnoId}-${fecha}`);
      await inscripcionesService.inscribirRecuperacion({
        alumnoId: user.alumnoId,
        turnoId,
        fecha
      });
      showToast('Inscripcion a clase de recuperacion exitosa', 'success');
      fetchData();
    } catch (error) {
      console.error('Error al inscribir:', error);
      const mensaje = error.response?.data || 'Error al inscribirse a la clase';
      showToast(mensaje, 'error');
    } finally {
      setInscribiendo(null);
    }
  };

  const handleCancelarRecuperacion = async (recupId) => {
    try {
      setCancelandoN(recupId);
      await inscripcionesService.cancelarRecuperacion(recupId);
      showToast('Recuperacion cancelada. Se devolvio la clase pendiente.', 'success');
      fetchData();
    } catch (error) {
      console.error('Error al cancelar recuperacion:', error);
      showToast(error.response?.data || 'Error al cancelar la recuperacion', 'error');
    } finally {
      setCancelandoN(null);
    }
  };

  const formatearFecha = (fecha) => {
    const opciones = { weekday: 'long', day: 'numeric', month: 'long' };
    return fecha.toLocaleDateString('es-AR', opciones);
  };

  const formatearHorasRestantes = (fecha) => {
    const ahora = new Date();
    const horas = Math.floor((fecha - ahora) / (1000 * 60 * 60));
    const dias = Math.floor(horas / 24);

    if (dias > 0) {
      return `en ${dias} dia${dias > 1 ? 's' : ''}`;
    }
    return `en ${horas} hora${horas > 1 ? 's' : ''}`;
  };

  const proximaClase = getProximaClase();

  // Set de turnoIds en los que el alumno tiene inscripción fija
  const turnosFijos = new Set(inscripciones.map(i => i.turnoId));

  // Set de "turnoId-fecha" donde el alumno ya está inscripto
  const inscriptoPorTurnoYFecha = new Set();
  inscripciones.forEach(insc => {
    if (!insc.proximasFechas) return;
    insc.proximasFechas.forEach(f => {
      inscriptoPorTurnoYFecha.add(`${insc.turnoId}-${f.slice(0, 10)}`);
    });
  });

  // Turnos que tienen al menos una fecha con cupos disponibles
  const turnosConCupos = turnos.filter(turno =>
    turno.proximasFechas?.some(pf => (pf.cuposDisponibles || 0) > 0)
  );

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: colors.gray[600] }}>
        Cargando...
      </div>
    );
  }

  if (!user?.alumnoId) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: colors.gray[600] }}>
        No se encontro informacion del alumno. Por favor, cierra sesion y vuelve a ingresar.
      </div>
    );
  }

  return (
    <div>
      <h2 style={{
        fontSize: '1.5rem',
        fontWeight: '600',
        marginBottom: '1.5rem',
        color: colors.gray[900]
      }}>
        Mi Panel
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.5rem'
      }}>
        {/* Proxima Clase */}
        <Card title="Proxima Clase">
          {proximaClase ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{
                display: 'inline-flex',
                padding: '0.25rem 0.75rem',
                backgroundColor: colors.primary + '20',
                color: colors.primary,
                borderRadius: '999px',
                fontSize: '0.875rem',
                fontWeight: '600',
                alignSelf: 'flex-start'
              }}>
                {formatearHorasRestantes(proximaClase.proximaFecha)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={18} style={{ color: colors.primary }} />
                <span style={{ fontWeight: '600' }}>
                  {formatearFecha(proximaClase.proximaFecha)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={18} style={{ color: colors.gray[400] }} />
                <span style={{ color: colors.gray[600] }}>
                  {proximaClase.turno.horaInicio} - {proximaClase.turno.horaFin}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '1rem', color: colors.gray[500] }}>
              No tienes clases programadas
            </div>
          )}
        </Card>

        {/* Clases a Recuperar */}
        <Card title="Clases a Recuperar">
          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{
              fontSize: '3rem',
              fontWeight: '700',
              color: alumnoData?.clasesPendientesRecuperar > 0 ? colors.primary : colors.gray[400],
              marginBottom: '0.5rem'
            }}>
              {alumnoData?.clasesPendientesRecuperar || 0}
            </div>
            <div style={{ color: colors.gray[600], fontSize: '0.875rem' }}>
              clases disponibles para recuperar
            </div>
          </div>
        </Card>
      </div>

      {/* Mi Clase Fija */}
      {inscripciones.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <Card title="Mi Clase Fija">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {inscripciones.map(insc => (
                <div key={insc.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  backgroundColor: colors.primary + '08',
                  borderRadius: '8px',
                  borderLeft: `4px solid ${colors.primary}`
                }}>
                  <Calendar size={18} style={{ color: colors.primary, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: '600', color: colors.gray[900] }}>
                      {getDiaSemana(insc.turno?.diaSemana)} {insc.turno?.horaInicio} - {insc.turno?.horaFin}
                    </div>
                  </div>
                </div>
              ))}
              <div style={{ fontSize: '0.8rem', color: colors.gray[500], marginTop: '0.25rem' }}>
                Tus clases se reservan automaticamente en este turno
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Mis Clases */}
      <div style={{ marginTop: '2rem' }}>
        <h3 style={{
          fontSize: '1.25rem',
          fontWeight: '600',
          marginBottom: '1rem',
          color: colors.gray[900]
        }}>
          Mis Clases
        </h3>

        {inscripciones.length === 0 && recuperaciones.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '2rem', color: colors.gray[500] }}>
              No estas inscripta en ninguna clase
            </div>
          </Card>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {(() => {
              // Clases regulares
              const regulares = inscripciones.flatMap((insc) => {
                if (!insc.turno || !insc.proximasFechas) return [];
                return insc.proximasFechas.map((f) => ({
                  tipo: 'regular', insc, fecha: parseFechaBackend(f), fechaStr: f,
                  turno: insc.turno
                }));
              });
              // Clases canceladas
              const canceladas = inscripciones.flatMap((insc) => {
                if (!insc.turno || !insc.fechasCanceladas) return [];
                return insc.fechasCanceladas.map((f) => ({
                  tipo: 'cancelada', insc, fecha: parseFechaBackend(f), fechaStr: f,
                  turno: insc.turno
                }));
              });
              // Clases de recuperación (excluir las que coinciden con turno fijo)
              const recups = recuperaciones
                .filter(r => !turnosFijos.has(r.turnoId))
                .map((r) => ({
                  tipo: 'recuperacion', insc: null, fecha: parseFechaBackend(r.fecha), fechaStr: r.fecha,
                  turno: r.turno, recupId: r.id
                }));

              return [...regulares, ...canceladas, ...recups]
                .sort((a, b) => a.fecha - b.fecha)
                .slice(0, 8)
                .map((item, idx) => {
                  const borderColor = item.tipo === 'cancelada' ? colors.error
                    : item.tipo === 'recuperacion' ? colors.warning
                    : colors.primary;

                  return (
                    <Card key={`${item.tipo}-${idx}`}>
                      <div style={{
                        padding: '1rem',
                        borderLeft: `4px solid ${borderColor}`,
                        opacity: item.tipo === 'cancelada' ? 0.7 : 1
                      }}>
                        {/* Badge */}
                        {item.tipo !== 'regular' && (
                          <div style={{
                            display: 'inline-block',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.65rem',
                            fontWeight: '700',
                            marginBottom: '0.5rem',
                            backgroundColor: item.tipo === 'cancelada' ? colors.error + '20' : colors.warning + '20',
                            color: item.tipo === 'cancelada' ? colors.error : colors.warning
                          }}>
                            {item.tipo === 'cancelada' ? 'Cancelada' : 'Recuperacion'}
                          </div>
                        )}
                        <div style={{
                          fontWeight: '600',
                          color: colors.gray[900],
                          marginBottom: '0.25rem',
                          textDecoration: item.tipo === 'cancelada' ? 'line-through' : 'none'
                        }}>
                          {formatearFechaCorta(item.fecha)}
                        </div>
                        <div style={{ color: colors.gray[600], fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                          {item.turno.horaInicio} - {item.turno.horaFin}
                        </div>
                        {(item.tipo === 'regular' || item.tipo === 'recuperacion') && (() => {
                          const ahora = new Date();
                          const horasRestantes = (item.fecha - ahora) / (1000 * 60 * 60);
                          const puedeAccionar = horasRestantes >= horasAnticipacion;
                          const esRecup = item.tipo === 'recuperacion';
                          return (
                            <>
                              <button
                                onClick={() => esRecup
                                  ? handleCancelarRecuperacion(item.recupId)
                                  : handleCancelarClase(item.insc.id, item.fechaStr)
                                }
                                disabled={!puedeAccionar}
                                style={{
                                  width: '100%',
                                  padding: '0.5rem',
                                  backgroundColor: puedeAccionar ? colors.error : colors.gray[300],
                                  color: colors.white,
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: puedeAccionar ? 'pointer' : 'not-allowed',
                                  fontSize: '0.75rem',
                                  fontWeight: '500'
                                }}
                              >
                                {esRecup ? 'Cancelar recuperacion' : 'Cancelar clase'}
                              </button>
                              {!puedeAccionar && (
                                <div style={{
                                  marginTop: '0.5rem',
                                  fontSize: '0.7rem',
                                  color: colors.gray[500],
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem'
                                }}>
                                  <AlertCircle size={12} />
                                  Requiere {horasAnticipacion}hs de anticipacion
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </Card>
                  );
                });
            })()}
          </div>
        )}
      </div>

      {/* Turnos Disponibles */}
      <div style={{ marginTop: '2rem' }}>
        <h3 style={{
          fontSize: '1.25rem',
          fontWeight: '600',
          marginBottom: '1rem',
          color: colors.gray[900]
        }}>
          Turnos Disponibles
        </h3>

        {(alumnoData?.clasesPendientesRecuperar || 0) <= 0 && (
          <div style={{
            padding: '1rem',
            marginBottom: '1rem',
            backgroundColor: colors.success + '15',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <CheckCircle size={20} style={{ color: colors.success }} />
            <span style={{ color: colors.gray[700], fontSize: '0.875rem' }}>
              No tienes clases pendientes de recuperar
            </span>
          </div>
        )}

        {(() => {
          const items = turnosConCupos.flatMap((turno) => {
            if (!turno.proximasFechas) return [];
            return turno.proximasFechas
              .filter(pf => (pf.cuposDisponibles || 0) > 0)
              .filter(pf => !inscriptoPorTurnoYFecha.has(`${turno.id}-${pf.fecha.slice(0, 10)}`))
              .map((pf) => ({ turno, fecha: parseFechaBackend(pf.fecha), fechaISO: pf.fecha.slice(0, 10), cuposDisponibles: pf.cuposDisponibles }));
          }).sort((a, b) => a.fecha - b.fecha).slice(0, 5);
          return items.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '2rem', color: colors.gray[500] }}>
              No hay turnos con cupos disponibles en este momento
            </div>
          </Card>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {items.map(({ turno, fecha, fechaISO, cuposDisponibles }, idx) => {
              const tieneClasesPendientes = (alumnoData?.clasesPendientesRecuperar || 0) > 0;
              const itemKey = `${turno.id}-${fechaISO}`;
              return (
                <Card key={`${turno.id}-${idx}`}>
                  <div style={{
                    padding: '1rem',
                    borderLeft: `4px solid ${tieneClasesPendientes ? colors.success : colors.gray[300]}`
                  }}>
                    <div style={{ fontWeight: '600', color: colors.gray[900], marginBottom: '0.25rem' }}>
                      {formatearFechaCorta(fecha)}
                    </div>
                    <div style={{ color: colors.gray[600], fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                      {turno.horaInicio} - {turno.horaFin}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: cuposDisponibles > 3 ? colors.success : colors.warning,
                      fontWeight: '500',
                      marginBottom: '0.75rem'
                    }}>
                      {cuposDisponibles} cupo{cuposDisponibles !== 1 ? 's' : ''} disponible{cuposDisponibles !== 1 ? 's' : ''}
                    </div>
                    <button
                      onClick={() => handleInscribirRecuperacion(turno.id, fechaISO)}
                      disabled={!tieneClasesPendientes || inscribiendo === itemKey}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        backgroundColor: tieneClasesPendientes ? colors.success : colors.gray[300],
                        color: colors.white,
                        border: 'none',
                        borderRadius: '6px',
                        cursor: tieneClasesPendientes ? 'pointer' : 'not-allowed',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        opacity: inscribiendo === itemKey ? 0.7 : 1
                      }}
                    >
                      {inscribiendo === itemKey ? 'Inscribiendo...' : 'Inscribirme'}
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        );
        })()}
      </div>

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

export default PortalAlumno;
