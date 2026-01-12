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
  const [turnos, setTurnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [horasAnticipacion, setHorasAnticipacion] = useState(24);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [cancelando, setCancelando] = useState(null);
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
      const [alumnoRes, inscripcionesRes, turnosRes, configRes] = await Promise.all([
        alumnosService.getById(user.alumnoId),
        inscripcionesService.getByAlumno(user.alumnoId),
        turnosService.getAll(),
        configuracionService.get('HorasAnticipacionCancelacion')
      ]);

      setAlumnoData(alumnoRes.data);
      setInscripciones(inscripcionesRes.data || []);
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

  // Calcular la proxima fecha de una clase basada en el dia de la semana
  const getProximaFechaClase = (diaSemana, horaInicio) => {
    const ahora = new Date();
    const diaActual = ahora.getDay();
    let diasHastaClase = diaSemana - diaActual;

    if (diasHastaClase < 0) {
      diasHastaClase += 7;
    } else if (diasHastaClase === 0) {
      // Es hoy, verificar si ya paso la hora
      const [hora, minutos] = horaInicio.split(':').map(Number);
      const horaClase = new Date(ahora);
      horaClase.setHours(hora, minutos, 0, 0);

      if (ahora >= horaClase) {
        diasHastaClase = 7; // Ya paso, es la proxima semana
      }
    }

    const proximaFecha = new Date(ahora);
    proximaFecha.setDate(ahora.getDate() + diasHastaClase);
    const [hora, minutos] = horaInicio.split(':').map(Number);
    proximaFecha.setHours(hora, minutos, 0, 0);

    return proximaFecha;
  };

  // Verificar si faltan suficientes horas para cancelar
  const puedeCancelar = (diaSemana, horaInicio) => {
    const proximaFecha = getProximaFechaClase(diaSemana, horaInicio);
    const ahora = new Date();
    const horasRestantes = (proximaFecha - ahora) / (1000 * 60 * 60);
    return horasRestantes >= horasAnticipacion;
  };

  // Obtener la proxima clase (la mas cercana)
  const getProximaClase = () => {
    if (inscripciones.length === 0) return null;

    let proximaClase = null;
    let fechaMasCercana = null;

    inscripciones.forEach(insc => {
      if (insc.turno) {
        const fecha = getProximaFechaClase(insc.turno.diaSemana, insc.turno.horaInicio);
        if (!fechaMasCercana || fecha < fechaMasCercana) {
          fechaMasCercana = fecha;
          proximaClase = { ...insc, proximaFecha: fecha };
        }
      }
    });

    return proximaClase;
  };

  const handleCancelarClase = async (inscripcionId, diaSemana, horaInicio) => {
    if (!puedeCancelar(diaSemana, horaInicio)) {
      showToast(`No puedes cancelar con menos de ${horasAnticipacion} horas de anticipacion`, 'error');
      return;
    }

    try {
      setCancelando(inscripcionId);
      await inscripcionesService.cancelar(inscripcionId);
      showToast('Clase cancelada. Se agrego una clase a recuperar.', 'success');
      fetchData();
    } catch (error) {
      console.error('Error al cancelar:', error);
      showToast('Error al cancelar la clase', 'error');
    } finally {
      setCancelando(null);
    }
  };

  const handleInscribirRecuperacion = async (turnoId) => {
    if (!alumnoData || alumnoData.clasesPendientesRecuperar <= 0) {
      showToast('No tienes clases pendientes de recuperar', 'error');
      return;
    }

    try {
      setInscribiendo(turnoId);
      await inscripcionesService.inscribirRecuperacion({
        alumnoId: user.alumnoId,
        turnoId
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

  // Turnos disponibles para recuperar (excluir los turnos donde ya esta inscripto)
  const turnosDisponibles = turnos.filter(turno => {
    const yaInscripto = inscripciones.some(insc => insc.turnoId === turno.id);
    return !yaInscripto && (turno.cuposDisponibles || 0) > 0;
  });

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

      {/* Mis Clases Inscriptas */}
      <div style={{ marginTop: '2rem' }}>
        <h3 style={{
          fontSize: '1.25rem',
          fontWeight: '600',
          marginBottom: '1rem',
          color: colors.gray[900]
        }}>
          Mis Clases
        </h3>

        {inscripciones.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '2rem', color: colors.gray[500] }}>
              No estas inscripto en ninguna clase
            </div>
          </Card>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {inscripciones.map((insc) => {
              const puedeAccionar = insc.turno && puedeCancelar(insc.turno.diaSemana, insc.turno.horaInicio);
              const proximaFecha = insc.turno ? getProximaFechaClase(insc.turno.diaSemana, insc.turno.horaInicio) : null;

              return (
                <Card key={insc.id}>
                  <div style={{
                    padding: '1rem',
                    borderLeft: `4px solid ${colors.primary}`
                  }}>
                    <div style={{ fontWeight: '600', color: colors.gray[900], marginBottom: '0.5rem' }}>
                      {insc.turno ? getDiaSemana(insc.turno.diaSemana) : 'N/A'}
                    </div>
                    <div style={{ color: colors.gray[600], fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                      {insc.turno ? `${insc.turno.horaInicio} - ${insc.turno.horaFin}` : ''}
                    </div>
                    {proximaFecha && (
                      <div style={{
                        fontSize: '0.75rem',
                        color: colors.gray[500],
                        marginBottom: '1rem'
                      }}>
                        Proxima: {formatearFecha(proximaFecha)}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleCancelarClase(insc.id, insc.turno?.diaSemana, insc.turno?.horaInicio)}
                        disabled={!puedeAccionar || cancelando === insc.id}
                        style={{
                          flex: 1,
                          padding: '0.5rem',
                          backgroundColor: puedeAccionar ? colors.error : colors.gray[300],
                          color: colors.white,
                          border: 'none',
                          borderRadius: '6px',
                          cursor: puedeAccionar ? 'pointer' : 'not-allowed',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          opacity: cancelando === insc.id ? 0.7 : 1
                        }}
                        title={!puedeAccionar ? `Requiere ${horasAnticipacion}hs de anticipacion` : ''}
                      >
                        {cancelando === insc.id ? 'Cancelando...' : 'Cancelar'}
                      </button>
                    </div>
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
                  </div>
                </Card>
              );
            })}
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

        {turnosDisponibles.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '2rem', color: colors.gray[500] }}>
              No hay turnos con cupos disponibles en este momento
            </div>
          </Card>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {turnosDisponibles.map((turno) => {
              const tieneClasesPendientes = (alumnoData?.clasesPendientesRecuperar || 0) > 0;
              return (
                <Card key={turno.id}>
                  <div style={{
                    padding: '1rem',
                    borderLeft: `4px solid ${tieneClasesPendientes ? colors.success : colors.gray[300]}`
                  }}>
                    <div style={{ fontWeight: '600', color: colors.gray[900], marginBottom: '0.5rem' }}>
                      {getDiaSemana(turno.diaSemana)}
                    </div>
                    <div style={{ color: colors.gray[600], fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                      {turno.horaInicio} - {turno.horaFin}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: turno.cuposDisponibles > 3 ? colors.success : colors.warning,
                      fontWeight: '500',
                      marginBottom: '1rem'
                    }}>
                      {turno.cuposDisponibles || 0} cupos disponibles
                    </div>
                    <button
                      onClick={() => handleInscribirRecuperacion(turno.id)}
                      disabled={!tieneClasesPendientes || inscribiendo === turno.id}
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
                        opacity: inscribiendo === turno.id ? 0.7 : 1
                      }}
                    >
                      {inscribiendo === turno.id ? 'Inscribiendo...' : 'Inscribirme'}
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
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
