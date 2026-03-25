import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MessageCircle, Users, X, UserPlus } from 'lucide-react';
import Card from '../components/Card';
import Toast from '../components/Toast';
import { colors } from '../styles/colors';
import { turnosService, diasSinClaseService, inscripcionesService, alumnosService, configuracionService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const diasSemanaLargo = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function Calendario() {
  const navigate = useNavigate();
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

  // Estado admin modal
  const [selectedFecha, setSelectedFecha] = useState(null);
  const [selectedClaseDetalle, setSelectedClaseDetalle] = useState(null);
  const [alumnosClase, setAlumnosClase] = useState([]);
  const [loadingAlumnos, setLoadingAlumnos] = useState(false);

  // Estado form recuperación manual admin
  const [mostrarFormRecup, setMostrarFormRecup] = useState(false);
  const [alumnosLista, setAlumnosLista] = useState([]);
  const [alumnoRecupId, setAlumnoRecupId] = useState('');
  const [asignandoRecup, setAsignandoRecup] = useState(false);

  // Estado alumno
  const [inscripciones, setInscripciones] = useState([]);
  const [recuperaciones, setRecuperaciones] = useState([]);
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
        const [inscRes, turnosRes, diasRes, alumnoRes, configRes, recupRes] = await Promise.all([
          inscripcionesService.getByAlumno(user.alumnoId),
          turnosService.getAllConFechas(),
          diasSinClaseService.getByMes(anio, mes),
          alumnosService.getById(user.alumnoId),
          configuracionService.get('HorasAnticipacionCancelacion'),
          inscripcionesService.getRecuperacionesByAlumno(user.alumnoId)
        ]);
        setInscripciones(inscRes.data || []);
        setRecuperaciones(recupRes.data || []);
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

  // Lookup: mis clases canceladas por fecha
  const misCanceladasPorFecha = useMemo(() => {
    const mapa = {};
    inscripciones.forEach(insc => {
      if (!insc.fechasCanceladas || !insc.turno) return;
      insc.fechasCanceladas.forEach(f => {
        const fechaStr = f.slice(0, 10);
        if (!mapa[fechaStr]) mapa[fechaStr] = [];
        mapa[fechaStr].push({
          turnoId: insc.turnoId,
          horaInicio: insc.turno.horaInicio,
          horaFin: insc.turno.horaFin
        });
      });
    });
    return mapa;
  }, [inscripciones]);

  // Set de turnoIds fijos del alumno
  const turnosFijos = useMemo(() => new Set(inscripciones.map(i => i.turnoId)), [inscripciones]);

  // Lookup: mis recuperaciones por fecha (excluir las que coinciden con turno fijo)
  const misRecuperacionesPorFecha = useMemo(() => {
    const mapa = {};
    recuperaciones.forEach(r => {
      if (!r.turno || turnosFijos.has(r.turnoId)) return;
      const fechaStr = r.fecha.slice(0, 10);
      if (!mapa[fechaStr]) mapa[fechaStr] = [];
      mapa[fechaStr].push({
        recupId: r.id,
        turnoId: r.turnoId,
        horaInicio: r.turno.horaInicio,
        horaFin: r.turno.horaFin
      });
    });
    return mapa;
  }, [recuperaciones, turnosFijos]);

  // Lookup: turnos por fecha (incluye llenos para mostrar "Completo")
  const turnosDisponiblesPorFecha = useMemo(() => {
    const mapa = {};
    turnos.forEach(turno => {
      if (!turno.proximasFechas) return;
      turno.proximasFechas.forEach(pf => {
        const fechaStr = pf.fecha.slice(0, 10);
        const yaInscriptoEnFecha = (misClasesPorFecha[fechaStr] || []).some(c => c.turnoId === turno.id);
        if (yaInscriptoEnFecha) return;
        const yaRecuperandoEnFecha = (misRecuperacionesPorFecha[fechaStr] || []).some(r => r.turnoId === turno.id);
        if (yaRecuperandoEnFecha) return;
        if (!mapa[fechaStr]) mapa[fechaStr] = [];
        mapa[fechaStr].push({
          turnoId: turno.id,
          horaInicio: turno.horaInicio,
          horaFin: turno.horaFin,
          cuposDisponibles: pf.cuposDisponibles || 0,
          fechaStr
        });
      });
    });
    return mapa;
  }, [turnos, misClasesPorFecha, misRecuperacionesPorFecha]);

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

  const handleCancelarRecuperacion = async (recupId) => {
    try {
      setCancelandoId(recupId);
      await inscripcionesService.cancelarRecuperacion(recupId);
      setToastAndClose('Recuperacion cancelada. Se devolvio la clase pendiente.');
      fetchDatos();
    } catch (error) {
      console.error('Error al cancelar recuperacion:', error);
      setToastAndClose(error.response?.data || 'Error al cancelar', 'error');
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
    return turnos.filter(t => {
      if (!t.activo) return false;
      if (t.usarFechasManuales && (t.fechasManuales || []).length > 0) {
        // Solo aparece si la fecha está en su lista de fechas manuales
        return t.fechasManuales.some(f => f.fecha.slice(0, 10) === fecha);
      }
      // Sin fechas manuales cargadas (o modo automático): usar día de semana
      return t.diaSemana === dayOfWeek;
    });
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

  // Admin modal helpers
  const formatFechaModal = (fechaStr) => {
    const d = new Date(fechaStr + 'T00:00:00');
    return `${diasSemanaLargo[d.getDay()]} ${d.getDate()} de ${nombresMeses[d.getMonth()]} ${d.getFullYear()}`;
  };

  const closeModal = () => {
    setSelectedFecha(null);
    setSelectedClaseDetalle(null);
    setAlumnosClase([]);
    setMostrarFormRecup(false);
    setAlumnoRecupId('');
    setAlumnosLista([]);
  };

  const handleAbrirFormRecup = async () => {
    setMostrarFormRecup(true);
    if (alumnosLista.length === 0) {
      try {
        const res = await alumnosService.getAll();
        const lista = (res.data || []).sort((a, b) => a.apellido.localeCompare(b.apellido));
        setAlumnosLista(lista);
      } catch {
        setToastAndClose('Error al cargar la lista de alumnos', 'error');
      }
    }
  };

  const handleAsignarRecuperacionAdmin = async () => {
    if (!alumnoRecupId || !selectedClaseDetalle || !selectedFecha) return;
    try {
      setAsignandoRecup(true);
      await inscripcionesService.inscribirRecuperacionAdmin({
        alumnoId: parseInt(alumnoRecupId),
        turnoId: selectedClaseDetalle.id,
        fecha: selectedFecha
      });
      setToastAndClose('Recuperación asignada correctamente');
      setMostrarFormRecup(false);
      setAlumnoRecupId('');
      // Recargar lista de alumnos de la clase
      fetchAlumnosClase(selectedClaseDetalle, selectedFecha);
    } catch (error) {
      setToastAndClose(error.response?.data || 'Error al asignar la recuperación', 'error');
    } finally {
      setAsignandoRecup(false);
    }
  };

  const fetchAlumnosClase = async (clase, fecha) => {
    setSelectedClaseDetalle(clase);
    setLoadingAlumnos(true);
    try {
      const response = await inscripcionesService.getAlumnosPorTurnoYFecha(clase.id, fecha);
      const alumnos = response.data || [];
      const orden = { regular: 0, recuperacion: 1, ausente: 2 };
      alumnos.sort((a, b) => (orden[a.tipo] ?? 99) - (orden[b.tipo] ?? 99));
      setAlumnosClase(alumnos);
    } catch (error) {
      console.error('Error al cargar alumnos:', error);
      setToastAndClose('Error al cargar los alumnos de la clase', 'error');
    } finally {
      setLoadingAlumnos(false);
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
          Hacé clic en un día para ver las clases o marcarlo como día sin clase.
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
              backgroundColor: colors.error, display: 'inline-block'
            }} />
            Cancelada
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{
              width: 10, height: 10, borderRadius: '50%',
              backgroundColor: colors.warning, display: 'inline-block'
            }} />
            Recuperacion
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{
              width: 10, height: 10, borderRadius: '50%',
              backgroundColor: colors.success, display: 'inline-block'
            }} />
            Disponible
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{
              width: 10, height: 10, borderRadius: '50%',
              backgroundColor: colors.gray[400], display: 'inline-block'
            }} />
            Completo
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
            const misCanceladas = esAlumno ? (misCanceladasPorFecha[fechaStr] || []) : [];
            const misRecups = esAlumno ? (misRecuperacionesPorFecha[fechaStr] || []) : [];
            const turnosDisp = esAlumno ? (turnosDisponiblesPorFecha[fechaStr] || []) : [];
            const tieneAlgo = misClases.length > 0 || misCanceladas.length > 0 || misRecups.length > 0;

            return (
              <div
                key={celda.key}
                onClick={() => esAdmin && setSelectedFecha(fechaStr)}
                style={{
                  minHeight: '80px',
                  padding: '0.35rem',
                  backgroundColor: esSinClase ? colors.error + '20' : esHoy ? colors.primary + '15' : tieneAlgo ? colors.primary + '10' : colors.gray[50],
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

                        {/* Clases canceladas */}
                        {misCanceladas.map((c, i) => (
                          <div key={`canc-${i}`} style={{
                            display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.6rem'
                          }}>
                            <span style={{
                              width: 6, height: 6, borderRadius: '50%',
                              backgroundColor: colors.error, flexShrink: 0
                            }} />
                            <span style={{
                              color: colors.gray[500], flex: 1, textDecoration: 'line-through',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                            }}>
                              {c.horaInicio}
                            </span>
                          </div>
                        ))}

                        {/* Recuperaciones */}
                        {misRecups.map((r, i) => {
                          const fechaRecup = parseFechaBackend(fechaStr);
                          if (r.horaInicio) {
                            const [h, m] = r.horaInicio.split(':').map(Number);
                            fechaRecup.setHours(h, m, 0, 0);
                          }
                          const horasRest = (fechaRecup - new Date()) / (1000 * 60 * 60);
                          const puedeCancelarRecup = horasRest >= horasAnticipacion;
                          return (
                            <div key={`recup-${i}`} style={{
                              display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.6rem'
                            }}>
                              <span style={{
                                width: 6, height: 6, borderRadius: '50%',
                                backgroundColor: colors.warning, flexShrink: 0
                              }} />
                              <span style={{
                                color: colors.warning, flex: 1, fontWeight: '600',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                              }}>
                                {r.horaInicio}
                              </span>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleCancelarRecuperacion(r.recupId); }}
                                disabled={!puedeCancelarRecup}
                                title={puedeCancelarRecup ? 'Cancelar recuperacion' : `Requiere ${horasAnticipacion}hs`}
                                style={{
                                  width: 16, height: 16, padding: 0,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  backgroundColor: puedeCancelarRecup ? colors.error : colors.gray[300],
                                  color: colors.white,
                                  border: 'none', borderRadius: '50%',
                                  cursor: puedeCancelarRecup ? 'pointer' : 'not-allowed',
                                  fontSize: '0.55rem', fontWeight: '700', lineHeight: 1,
                                  flexShrink: 0
                                }}
                              >
                                x
                              </button>
                            </div>
                          );
                        })}

                        {/* Turnos disponibles y completos */}
                        {turnosDisp.map(t => {
                          const disponible = t.cuposDisponibles > 0;
                          const itemKey = `${t.turnoId}-${t.fechaStr}`;
                          const estaInscribiendo = inscribiendoTurnoId === itemKey;
                          return (
                            <div key={`disp-${t.turnoId}`} style={{
                              display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.6rem'
                            }}>
                              <span style={{
                                width: 6, height: 6, borderRadius: '50%',
                                backgroundColor: disponible ? colors.success : colors.gray[400], flexShrink: 0
                              }} />
                              <span style={{
                                color: disponible ? colors.gray[600] : colors.gray[400],
                                flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                              }}>
                                {t.horaInicio}
                              </span>
                              {disponible && clasesPendientes > 0 && (
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
                              {!disponible && (
                                <span style={{
                                  fontSize: '0.5rem', color: colors.gray[400], fontWeight: '600', flexShrink: 0
                                }}>
                                  Completo
                                </span>
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

      {/* Modal admin: opciones del día */}
      {esAdmin && selectedFecha && (
        <div
          onClick={closeModal}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.white,
              borderRadius: '12px',
              padding: '1.5rem',
              width: '90%',
              maxWidth: '500px',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              {selectedClaseDetalle ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    onClick={() => { setSelectedClaseDetalle(null); setAlumnosClase([]); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: colors.gray[500],
                      padding: '0.25rem',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <h3 style={{ margin: 0, color: colors.gray[900] }}>
                    Alumnos - {selectedClaseDetalle.horaInicio}
                  </h3>
                </div>
              ) : (
                <h3 style={{ margin: 0, color: colors.gray[900], fontSize: '1rem' }}>
                  {formatFechaModal(selectedFecha)}
                </h3>
              )}
              <button
                onClick={closeModal}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: colors.gray[500],
                  flexShrink: 0
                }}
              >
                <X size={24} />
              </button>
            </div>

            {selectedClaseDetalle ? (
              // Vista detalle alumnos
              loadingAlumnos ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: colors.gray[500] }}>
                  Cargando alumnos...
                </div>
              ) : alumnosClase.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: colors.gray[500] }}>
                  <Users size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                  <p>No hay alumnos inscriptos en esta clase</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {alumnosClase.map((alumno) => {
                    const telefono = alumno.telefono;
                    const telefonoLimpio = telefono ? telefono.replace(/\D/g, '') : '';
                    const esAusente = alumno.tipo === 'ausente';
                    const esRecuperacion = alumno.tipo === 'recuperacion';

                    return (
                      <div
                        key={`${alumno.tipo}-${alumno.id}`}
                        style={{
                          padding: '0.75rem 1rem',
                          backgroundColor: colors.gray[50],
                          borderRadius: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          opacity: esAusente ? 0.5 : 1
                        }}
                      >
                        <div>
                          <div style={{
                            fontWeight: '500',
                            color: colors.gray[900],
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}>
                            {alumno.nombre} {alumno.apellido}
                            {esAusente && (
                              <span style={{
                                fontSize: '0.625rem',
                                fontWeight: '600',
                                padding: '0.125rem 0.5rem',
                                borderRadius: '9999px',
                                backgroundColor: '#FEE2E2',
                                color: '#DC2626'
                              }}>Ausente</span>
                            )}
                            {esRecuperacion && (
                              <span style={{
                                fontSize: '0.625rem',
                                fontWeight: '600',
                                padding: '0.125rem 0.5rem',
                                borderRadius: '9999px',
                                backgroundColor: '#FEF3C7',
                                color: '#D97706'
                              }}>Recupera</span>
                            )}
                          </div>
                          {telefono && (
                            <div style={{ fontSize: '0.75rem', color: colors.gray[500] }}>
                              {telefono}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          {telefonoLimpio && (
                            <a
                              href={`https://wa.me/${telefonoLimpio}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '32px',
                                height: '32px',
                                backgroundColor: '#25D366',
                                borderRadius: '6px',
                                color: 'white',
                                textDecoration: 'none'
                              }}
                              title="Enviar WhatsApp"
                            >
                              <MessageCircle size={18} />
                            </a>
                          )}
                          <button
                            onClick={() => navigate(`/alumnos/${alumno.id}`)}
                            style={{
                              padding: '0.375rem 0.75rem',
                              backgroundColor: colors.white,
                              color: colors.primary,
                              border: `1px solid ${colors.primary}`,
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: '500'
                            }}
                          >
                            Ver Ficha
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <div style={{
                    marginTop: '0.5rem',
                    paddingTop: '0.75rem',
                    borderTop: `1px solid ${colors.gray[200]}`,
                    fontSize: '0.875rem',
                    color: colors.gray[600],
                    textAlign: 'center'
                  }}>
                    {(() => {
                      const asistentes = alumnosClase.filter(a => a.tipo !== 'ausente').length;
                      const total = alumnosClase.length;
                      return `Asisten: ${asistentes} de ${total} alumno${total !== 1 ? 's' : ''}`;
                    })()}
                  </div>

                  {/* Recuperación manual admin */}
                  {!mostrarFormRecup ? (
                    <button
                      onClick={handleAbrirFormRecup}
                      style={{
                        marginTop: '0.75rem',
                        width: '100%',
                        padding: '0.5rem',
                        backgroundColor: colors.primary + '15',
                        color: colors.primary,
                        border: `1px solid ${colors.primary}`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      <UserPlus size={14} />
                      Asignar recuperación manual
                    </button>
                  ) : (
                    <div style={{
                      marginTop: '0.75rem',
                      padding: '0.75rem',
                      backgroundColor: colors.gray[50],
                      borderRadius: '8px',
                      border: `1px solid ${colors.gray[200]}`
                    }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: '600', color: colors.gray[700], marginBottom: '0.5rem' }}>
                        Asignar recuperación manual
                      </div>
                      <select
                        value={alumnoRecupId}
                        onChange={(e) => setAlumnoRecupId(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          borderRadius: '6px',
                          border: `1px solid ${colors.gray[300]}`,
                          fontSize: '0.875rem',
                          marginBottom: '0.5rem',
                          backgroundColor: colors.white
                        }}
                      >
                        <option value="">— Seleccionar alumno —</option>
                        {alumnosLista.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.apellido}, {a.nombre}
                          </option>
                        ))}
                      </select>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={handleAsignarRecuperacionAdmin}
                          disabled={!alumnoRecupId || asignandoRecup}
                          style={{
                            flex: 1,
                            padding: '0.5rem',
                            backgroundColor: alumnoRecupId ? colors.primary : colors.gray[300],
                            color: colors.white,
                            border: 'none',
                            borderRadius: '6px',
                            cursor: alumnoRecupId ? 'pointer' : 'not-allowed',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            opacity: asignandoRecup ? 0.7 : 1
                          }}
                        >
                          {asignandoRecup ? 'Asignando...' : 'Confirmar'}
                        </button>
                        <button
                          onClick={() => { setMostrarFormRecup(false); setAlumnoRecupId(''); }}
                          style={{
                            padding: '0.5rem 0.75rem',
                            backgroundColor: colors.gray[100],
                            color: colors.gray[700],
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.8rem'
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            ) : (
              // Vista principal: opciones del día
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Botón marcar/desmarcar día sin clase */}
                <button
                  onClick={() => {
                    handleToggleDiaSinClase(selectedFecha);
                    closeModal();
                  }}
                  disabled={togglingDay === selectedFecha}
                  style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: diasSinClaseSet.has(selectedFecha) ? colors.success : colors.error + '15',
                    color: diasSinClaseSet.has(selectedFecha) ? colors.white : colors.error,
                    border: diasSinClaseSet.has(selectedFecha) ? 'none' : `1px solid ${colors.error}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    opacity: togglingDay === selectedFecha ? 0.7 : 1
                  }}
                >
                  {diasSinClaseSet.has(selectedFecha)
                    ? 'Desmarcar día sin clase'
                    : 'Marcar como día sin clase'}
                </button>

                {/* Lista de clases del día */}
                {(() => {
                  const clasesDelDia = getClasesDelDia(selectedFecha);
                  if (clasesDelDia.length === 0) {
                    return (
                      <div style={{
                        textAlign: 'center',
                        padding: '1.5rem',
                        color: colors.gray[500],
                        fontSize: '0.875rem'
                      }}>
                        No hay clases este día
                      </div>
                    );
                  }
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        color: colors.gray[700],
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Clases del día
                      </div>
                      {clasesDelDia
                        .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
                        .map((clase) => (
                        <div
                          key={clase.id}
                          style={{
                            padding: '0.75rem 1rem',
                            backgroundColor: colors.gray[50],
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem'
                          }}
                        >
                          {/* Taller */}
                          <div style={{ minWidth: '120px' }}>
                            {clase.tallerNombre ? (
                              <span style={{
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                color: colors.primary,
                                backgroundColor: colors.primary + '18',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '999px',
                                whiteSpace: 'nowrap'
                              }}>
                                {clase.tallerNombre}
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: colors.gray[400] }}>—</span>
                            )}
                          </div>
                          {/* Horario */}
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '600', color: colors.gray[900], fontSize: '0.9rem' }}>
                              {clase.horaInicio} - {clase.horaFin}
                            </div>
                            {clase.profesor && (
                              <div style={{ fontSize: '0.8rem', color: colors.gray[600], marginTop: '0.125rem' }}>
                                Prof. {clase.profesor.nombre} {clase.profesor.apellido}
                              </div>
                            )}
                          </div>
                          {/* Cupos */}
                          <div style={{ fontSize: '0.875rem', color: colors.gray[600], whiteSpace: 'nowrap' }}>
                            {clase.cuposOcupados || 0}/{clase.cuposMaximos}
                          </div>
                          {/* Ver detalle */}
                          <button
                            onClick={() => fetchAlumnosClase(clase, selectedFecha)}
                            style={{
                              padding: '0.375rem 0.75rem',
                              backgroundColor: colors.primary,
                              color: colors.white,
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            Ver Detalle
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
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

export default Calendario;
