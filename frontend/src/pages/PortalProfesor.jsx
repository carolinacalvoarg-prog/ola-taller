import { useState, useEffect } from 'react';
import Card from '../components/Card';
import Toast from '../components/Toast';
import { colors } from '../styles/colors';
import { turnosService, asistenciasService, inscripcionesService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Calendar, Clock, Users, Check, X } from 'lucide-react';

const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

function PortalProfesor() {
  const { user } = useAuth();
  const [turnos, setTurnos] = useState([]);
  const [turnoSeleccionado, setTurnoSeleccionado] = useState(null);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date().toISOString().split('T')[0]);
  const [asistencias, setAsistencias] = useState({});
  const [asistenciasExistentes, setAsistenciasExistentes] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    if (user) {
      fetchTurnos();
    }
  }, [user]);

  useEffect(() => {
    if (turnoSeleccionado) {
      fetchAsistenciasExistentes();
      fetchHistorial();
    }
  }, [turnoSeleccionado, fechaSeleccionada]);

  const fetchTurnos = async () => {
    try {
      setLoading(true);
      let turnosData = [];

      if (user.profesorId) {
        // Profesor: obtener solo sus turnos
        const response = await turnosService.getByProfesor(user.profesorId);
        turnosData = response.data || [];
      } else {
        // Admin: obtener todos los turnos con alumnos
        const response = await turnosService.getAll();
        const turnosBasicos = response.data || [];

        // Cargar alumnos de cada turno
        turnosData = await Promise.all(
          turnosBasicos.map(async (turno) => {
            try {
              const inscripcionesRes = await inscripcionesService.getByTurno(turno.id);
              const alumnos = (inscripcionesRes.data || [])
                .filter(i => i.alumno)
                .map(i => ({
                  id: i.alumno.id,
                  nombre: i.alumno.nombre,
                  apellido: i.alumno.apellido
                }));
              return { ...turno, alumnos };
            } catch {
              return { ...turno, alumnos: [] };
            }
          })
        );
      }

      setTurnos(turnosData);

      // Seleccionar el turno actual si existe
      const turnoActual = detectarTurnoActual(turnosData);
      if (turnoActual) {
        setTurnoSeleccionado(turnoActual);
      } else if (turnosData.length > 0) {
        setTurnoSeleccionado(turnosData[0]);
      }
    } catch (error) {
      console.error('Error al cargar turnos:', error);
      showToast('Error al cargar los turnos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const detectarTurnoActual = (turnosData) => {
    const ahora = new Date();
    const diaActual = ahora.getDay();
    const horaActual = ahora.getHours() * 60 + ahora.getMinutes();

    // Buscar turno que coincida con el día y hora actual (con margen de 30 min antes y después)
    for (const turno of turnosData) {
      if (turno.diaSemana === diaActual) {
        const [horaInicio, minInicio] = turno.horaInicio.split(':').map(Number);
        const [horaFin, minFin] = turno.horaFin.split(':').map(Number);
        const inicioMinutos = horaInicio * 60 + minInicio - 30; // 30 min antes
        const finMinutos = horaFin * 60 + minFin + 30; // 30 min después

        if (horaActual >= inicioMinutos && horaActual <= finMinutos) {
          return turno;
        }
      }
    }

    // Si no hay turno actual, buscar el próximo turno del día
    for (const turno of turnosData) {
      if (turno.diaSemana === diaActual) {
        const [horaInicio, minInicio] = turno.horaInicio.split(':').map(Number);
        const inicioMinutos = horaInicio * 60 + minInicio;

        if (horaActual < inicioMinutos) {
          return turno;
        }
      }
    }

    return null;
  };

  const fetchAsistenciasExistentes = async () => {
    if (!turnoSeleccionado) return;

    try {
      const response = await asistenciasService.getByTurnoYFecha(turnoSeleccionado.id, fechaSeleccionada);
      const asistenciasData = response.data || [];
      setAsistenciasExistentes(asistenciasData);

      // Cargar las asistencias existentes al estado
      const asistenciasMap = {};
      asistenciasData.forEach(a => {
        asistenciasMap[a.alumnoId] = a.presente;
      });
      setAsistencias(asistenciasMap);
    } catch (error) {
      console.error('Error al cargar asistencias:', error);
      setAsistencias({});
    }
  };

  const fetchHistorial = async () => {
    if (!turnoSeleccionado) return;

    try {
      const response = await asistenciasService.getHistorialByTurno(turnoSeleccionado.id);
      setHistorial(response.data || []);
    } catch (error) {
      console.error('Error al cargar historial:', error);
      setHistorial([]);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  const marcarAsistencia = (alumnoId, presente) => {
    setAsistencias(prev => ({
      ...prev,
      [alumnoId]: presente
    }));
  };

  const guardarAsistencias = async () => {
    if (!turnoSeleccionado || Object.keys(asistencias).length === 0) {
      showToast('No hay asistencias para guardar', 'error');
      return;
    }

    const asistenciasArray = Object.entries(asistencias).map(([alumnoId, presente]) => ({
      alumnoId: parseInt(alumnoId),
      turnoId: turnoSeleccionado.id,
      fecha: fechaSeleccionada,
      presente: presente,
      observaciones: ''
    }));

    try {
      setSaving(true);
      await asistenciasService.marcarMultiple(asistenciasArray);
      showToast('Asistencias guardadas correctamente', 'success');
      fetchAsistenciasExistentes();
      fetchHistorial();
    } catch (error) {
      console.error('Error al guardar asistencias:', error);
      showToast('Error al guardar las asistencias', 'error');
    } finally {
      setSaving(false);
    }
  };

  const formatFecha = (fecha) => {
    const date = new Date(fecha + 'T00:00:00');
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const esTurnoActual = (turno) => {
    const ahora = new Date();
    const diaActual = ahora.getDay();
    const horaActual = ahora.getHours() * 60 + ahora.getMinutes();

    if (turno.diaSemana !== diaActual) return false;

    const [horaInicio, minInicio] = turno.horaInicio.split(':').map(Number);
    const [horaFin, minFin] = turno.horaFin.split(':').map(Number);
    const inicioMinutos = horaInicio * 60 + minInicio - 30;
    const finMinutos = horaFin * 60 + minFin + 30;

    return horaActual >= inicioMinutos && horaActual <= finMinutos;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: colors.gray[600] }}>
        Cargando...
      </div>
    );
  }

  if (turnos.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: colors.gray[600] }}>
        No tienes clases asignadas.
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
        {user?.profesorId ? 'Portal del Profesor' : 'Registro de Asistencias'}
      </h2>

      {/* Selector de Clase */}
      <Card>
        <div style={{
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'flex-end'
        }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.75rem',
              color: colors.gray[600],
              marginBottom: '0.25rem'
            }}>
              Clase
            </label>
            <select
              value={turnoSeleccionado?.id || ''}
              onChange={(e) => {
                const turno = turnos.find(t => t.id === parseInt(e.target.value));
                setTurnoSeleccionado(turno);
                setAsistencias({});
              }}
              style={{
                padding: '0.5rem',
                border: `1px solid ${colors.gray[300]}`,
                borderRadius: '6px',
                fontSize: '0.875rem',
                minWidth: '200px'
              }}
            >
              {turnos.map(turno => (
                <option key={turno.id} value={turno.id}>
                  {diasSemana[turno.diaSemana]} {turno.horaInicio} - {turno.horaFin}
                  {esTurnoActual(turno) ? ' (ACTUAL)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '0.75rem',
              color: colors.gray[600],
              marginBottom: '0.25rem'
            }}>
              Fecha
            </label>
            <input
              type="date"
              value={fechaSeleccionada}
              onChange={(e) => {
                setFechaSeleccionada(e.target.value);
                setAsistencias({});
              }}
              style={{
                padding: '0.5rem',
                border: `1px solid ${colors.gray[300]}`,
                borderRadius: '6px',
                fontSize: '0.875rem'
              }}
            />
          </div>

          {turnoSeleccionado && esTurnoActual(turnoSeleccionado) && fechaSeleccionada === new Date().toISOString().split('T')[0] && (
            <div style={{
              padding: '0.5rem 1rem',
              backgroundColor: colors.success + '20',
              color: colors.success,
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Clock size={16} />
              Clase en curso
            </div>
          )}
        </div>
      </Card>

      {/* Lista de Alumnos */}
      {turnoSeleccionado && (
        <div style={{ marginTop: '1.5rem' }}>
          <Card title={`Alumnos - ${diasSemana[turnoSeleccionado.diaSemana]} ${turnoSeleccionado.horaInicio}`}>
            {turnoSeleccionado.alumnos?.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1rem', color: colors.gray[500] }}>
                No hay alumnos inscriptos en esta clase
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {turnoSeleccionado.alumnos?.map(alumno => (
                    <div key={alumno.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '1rem',
                      backgroundColor: colors.gray[50],
                      borderRadius: '6px',
                      borderLeft: `4px solid ${
                        asistencias[alumno.id] === true ? colors.success :
                        asistencias[alumno.id] === false ? colors.error :
                        colors.gray[300]
                      }`
                    }}>
                      <div>
                        <div style={{ fontWeight: '500', color: colors.gray[900] }}>
                          {alumno.nombre} {alumno.apellido}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => marcarAsistencia(alumno.id, true)}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: asistencias[alumno.id] === true ? colors.success : colors.white,
                            color: asistencias[alumno.id] === true ? colors.white : colors.success,
                            border: `2px solid ${colors.success}`,
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          <Check size={16} />
                          Presente
                        </button>
                        <button
                          onClick={() => marcarAsistencia(alumno.id, false)}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: asistencias[alumno.id] === false ? colors.error : colors.white,
                            color: asistencias[alumno.id] === false ? colors.white : colors.error,
                            border: `2px solid ${colors.error}`,
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          <X size={16} />
                          Ausente
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={guardarAsistencias}
                  disabled={saving || Object.keys(asistencias).length === 0}
                  style={{
                    marginTop: '1.5rem',
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: Object.keys(asistencias).length > 0 ? colors.primary : colors.gray[300],
                    color: colors.white,
                    border: 'none',
                    borderRadius: '6px',
                    cursor: Object.keys(asistencias).length > 0 ? 'pointer' : 'not-allowed',
                    fontSize: '1rem',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                    opacity: saving ? 0.7 : 1
                  }}
                >
                  {saving ? 'Guardando...' : 'Guardar Asistencias'}
                </button>
              </>
            )}
          </Card>
        </div>
      )}

      {/* Historial de Asistencia */}
      {turnoSeleccionado && (
        <div style={{ marginTop: '1.5rem' }}>
          <Card title="Historial de Asistencia (Ultimo Mes)">
            {historial.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1rem', color: colors.gray[500] }}>
                No hay registros de asistencia
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {historial.map((registro, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem',
                    backgroundColor: colors.gray[50],
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    const fecha = new Date(registro.fecha).toISOString().split('T')[0];
                    setFechaSeleccionada(fecha);
                  }}
                  >
                    <div>
                      <div style={{ fontWeight: '500', color: colors.gray[900] }}>
                        Clase del {formatFecha(registro.fecha)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem' }}>
                      <div>
                        <span style={{ color: colors.gray[600] }}>Presentes: </span>
                        <span style={{ fontWeight: '600', color: colors.success }}>
                          {registro.presentes}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: colors.gray[600] }}>Ausentes: </span>
                        <span style={{ fontWeight: '600', color: colors.error }}>
                          {registro.ausentes}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

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

export default PortalProfesor;
