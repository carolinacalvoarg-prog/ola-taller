import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, CreditCard, Clock, MessageCircle, X, Settings, Save, ChevronLeft } from 'lucide-react';
import Card from '../components/Card';
import Toast from '../components/Toast';
import { colors } from '../styles/colors';
import { alumnosService, turnosService, configuracionService, inscripcionesService } from '../services/api';

const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

function Administracion() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalAlumnos: 0,
    clasesHoy: 0,
    pagosPendientes: 0,
    turnosDisponibles: 0
  });
  const [alumnos, setAlumnos] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [clasesHoy, setClasesHoy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showClasesHoyModal, setShowClasesHoyModal] = useState(false);
  const [configuraciones, setConfiguraciones] = useState([]);
  const [editingConfig, setEditingConfig] = useState({});
  const [savingConfig, setSavingConfig] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [actividades, setActividades] = useState([]);
  const [selectedClase, setSelectedClase] = useState(null);
  const [alumnosClase, setAlumnosClase] = useState([]);
  const [loadingAlumnos, setLoadingAlumnos] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchConfiguraciones();
    fetchActividades();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const [alumnosResponse, turnosResponse] = await Promise.all([
        alumnosService.getAll(),
        turnosService.getAll()
      ]);

      const alumnosData = alumnosResponse.data || [];
      const turnosData = turnosResponse.data || [];

      // Obtener dia de la semana actual (0 = Domingo, 1 = Lunes, etc.)
      const hoy = new Date().getDay();
      const clasesDeHoy = turnosData.filter(t => t.diaSemana === hoy);

      setAlumnos(alumnosData);
      setTurnos(turnosData);
      setClasesHoy(clasesDeHoy);
      setStats({
        totalAlumnos: alumnosData.length,
        clasesHoy: clasesDeHoy.length,
        pagosPendientes: 12, // TODO: Obtener de la API
        turnosDisponibles: turnosData.filter(t => (t.cuposDisponibles || 0) > 0).length
      });
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConfiguraciones = async () => {
    try {
      const response = await configuracionService.getAll();
      setConfiguraciones(response.data || []);
      // Inicializar valores de edicion
      const initialEdit = {};
      (response.data || []).forEach(config => {
        initialEdit[config.clave] = config.valor;
      });
      setEditingConfig(initialEdit);
    } catch (error) {
      console.error('Error al cargar configuraciones:', error);
    }
  };

  const fetchActividades = async () => {
    try {
      const response = await inscripcionesService.getActividades(5);
      setActividades(response.data || []);
    } catch (error) {
      console.error('Error al cargar actividades:', error);
    }
  };

  const fetchAlumnosClase = async (clase) => {
    setSelectedClase(clase);
    setLoadingAlumnos(true);
    try {
      const response = await inscripcionesService.getByTurno(clase.id);
      setAlumnosClase(response.data || []);
    } catch (error) {
      console.error('Error al cargar alumnos:', error);
      showToast('Error al cargar los alumnos de la clase', 'error');
    } finally {
      setLoadingAlumnos(false);
    }
  };

  const closeClaseDetalle = () => {
    setSelectedClase(null);
    setAlumnosClase([]);
  };

  const handleSaveConfig = async (clave) => {
    try {
      setSavingConfig(clave);
      await configuracionService.update(clave, editingConfig[clave]);
      showToast('Configuracion guardada correctamente', 'success');
      fetchConfiguraciones();
    } catch (error) {
      console.error('Error al guardar configuracion:', error);
      showToast('Error al guardar la configuracion', 'error');
    } finally {
      setSavingConfig(null);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  const getConfigLabel = (clave) => {
    const labels = {
      'HorasAnticipacionCancelacion': 'Horas de anticipacion para cancelar clase'
    };
    return labels[clave] || clave;
  };

  const statsData = [
    { label: 'Total Alumnos', value: loading ? '...' : stats.totalAlumnos, icon: Users, color: colors.primary, link: '/alumnos' },
    { label: 'Clases Hoy', value: loading ? '...' : stats.clasesHoy, icon: Calendar, color: colors.success, onClick: () => setShowClasesHoyModal(true) },
    { label: 'Clases Disponibles', value: loading ? '...' : stats.turnosDisponibles, icon: Clock, color: colors.primary, link: '/turnos' }
  ];

  const formatTiempoTranscurrido = (fecha) => {
    const ahora = new Date();
    const fechaActividad = new Date(fecha);
    const diffMs = ahora - fechaActividad;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMins / 60);
    const diffDias = Math.floor(diffHoras / 24);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHoras < 24) return `Hace ${diffHoras} hora${diffHoras > 1 ? 's' : ''}`;
    return `Hace ${diffDias} dia${diffDias > 1 ? 's' : ''}`;
  };

  const getTextoActividad = (actividad) => {
    const nombreAlumno = actividad.alumno ? `${actividad.alumno.nombre} ${actividad.alumno.apellido}` : 'Alumno';
    const diaTurno = actividad.turno ? diasSemana[actividad.turno.diaSemana] : '';
    const horaTurno = actividad.turno ? actividad.turno.horaInicio : '';

    switch (actividad.tipo) {
      case 'inscripcion':
        return `${nombreAlumno} se inscribio en ${diaTurno} ${horaTurno}`;
      case 'cancelacion':
        return `${nombreAlumno} cancelo su clase del ${diaTurno} ${horaTurno}`;
      case 'recuperacion':
        return `${nombreAlumno} agendo recuperacion para ${diaTurno} ${horaTurno}`;
      default:
        return `${nombreAlumno} - ${actividad.tipo}`;
    }
  };

  return (
    <div>
      <h2 style={{ 
        fontSize: '1.5rem', 
        fontWeight: '600', 
        marginBottom: '1.5rem', 
        color: colors.gray[900] 
      }}>
        Panel de Administración
      </h2>
      
      {/* Estadísticas */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '1.5rem', 
        marginBottom: '2rem' 
      }}>
        {statsData.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ 
                    fontSize: '0.875rem', 
                    color: colors.gray[600], 
                    marginBottom: '0.25rem' 
                  }}>
                    {stat.label}
                  </div>
                  <div style={{ 
                    fontSize: '2rem', 
                    fontWeight: '700', 
                    color: colors.gray[900] 
                  }}>
                    {stat.value}
                  </div>
                </div>
                {(stat.link || stat.onClick) ? (
                  <button
                    onClick={() => stat.link ? navigate(stat.link) : stat.onClick?.()}
                    title={`Ver ${stat.label}`}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '8px',
                      backgroundColor: stat.color + '20',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = stat.color + '40'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = stat.color + '20'}
                  >
                    <Icon size={24} style={{ color: stat.color }} />
                  </button>
                ) : (
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '8px',
                    backgroundColor: stat.color + '20',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Icon size={24} style={{ color: stat.color }} />
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Sección inferior con Acciones y Notificaciones */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Acciones Rápidas */}
        <Card title="Acciones Rápidas">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              onClick={() => navigate('/alumnos')}
              style={{
              padding: '0.75rem',
              backgroundColor: colors.primary,
              color: colors.white,
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}>
              <Users size={18} />
              Alumnos
            </button>
            <button
              onClick={() => navigate('/turnos')}
              style={{
              padding: '0.75rem',
              backgroundColor: colors.primary,
              color: colors.white,
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}>
              <Calendar size={18} />
              Clases
            </button>
          </div>
        </Card>

        {/* Últimas Notificaciones */}
        <Card title="Ultimas Actividades">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {actividades.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1rem', color: colors.gray[500], fontSize: '0.875rem' }}>
                No hay actividades recientes
              </div>
            ) : (
              actividades.map((actividad, idx) => (
                <div key={actividad.id} style={{
                  fontSize: '0.875rem',
                  paddingBottom: '0.75rem',
                  borderBottom: idx < actividades.length - 1 ? `1px solid ${colors.gray[200]}` : 'none'
                }}>
                  <div style={{ color: colors.gray[900] }}>{getTextoActividad(actividad)}</div>
                  <div style={{
                    color: colors.gray[500],
                    fontSize: '0.75rem',
                    marginTop: '0.25rem'
                  }}>
                    {formatTiempoTranscurrido(actividad.fecha)}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Listado de Alumnos */}
      <div style={{ marginTop: '2rem' }}>
        <Card title="Alumnos Recientes">
          {alumnos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: colors.gray[500] }}>
              No hay alumnos registrados
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {alumnos.slice(0, 5).map((alumno) => (
                <div key={alumno.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  backgroundColor: colors.gray[50],
                  borderRadius: '6px'
                }}>
                  <div>
                    <div style={{ fontWeight: '500', color: colors.gray[900] }}>
                      {alumno.nombre} {alumno.apellido}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: colors.gray[600], marginTop: '0.25rem' }}>
                      {alumno.email}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    {alumno.telefono && (
                      <a
                        href={`https://wa.me/${alumno.telefono.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '36px',
                          height: '36px',
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
                        padding: '0.5rem 1rem',
                        backgroundColor: colors.white,
                        color: colors.primary,
                        border: `1px solid ${colors.primary}`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500'
                      }}
                    >
                      Ver Detalle
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Configuraciones Generales */}
      <div style={{ marginTop: '2rem' }}>
        <Card title="Configuraciones Generales">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {configuraciones.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1rem', color: colors.gray[500] }}>
                Cargando configuraciones...
              </div>
            ) : (
              configuraciones.map((config) => (
                <div
                  key={config.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem',
                    backgroundColor: colors.gray[50],
                    borderRadius: '8px',
                    gap: '1rem'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500', color: colors.gray[900], marginBottom: '0.25rem' }}>
                      {getConfigLabel(config.clave)}
                    </div>
                    {config.descripcion && (
                      <div style={{ fontSize: '0.75rem', color: colors.gray[500] }}>
                        {config.descripcion}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="number"
                      min="0"
                      value={editingConfig[config.clave] || ''}
                      onChange={(e) => setEditingConfig({
                        ...editingConfig,
                        [config.clave]: e.target.value
                      })}
                      style={{
                        width: '80px',
                        padding: '0.5rem',
                        border: `1px solid ${colors.gray[300]}`,
                        borderRadius: '6px',
                        fontSize: '1rem',
                        textAlign: 'center'
                      }}
                    />
                    <span style={{ color: colors.gray[600], fontSize: '0.875rem' }}>hs</span>
                    <button
                      onClick={() => handleSaveConfig(config.clave)}
                      disabled={savingConfig === config.clave || editingConfig[config.clave] === config.valor}
                      style={{
                        padding: '0.5rem',
                        backgroundColor: editingConfig[config.clave] !== config.valor ? colors.success : colors.gray[300],
                        color: colors.white,
                        border: 'none',
                        borderRadius: '6px',
                        cursor: editingConfig[config.clave] !== config.valor ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: savingConfig === config.clave ? 0.7 : 1
                      }}
                      title="Guardar"
                    >
                      <Save size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Modal Clases de Hoy */}
      {showClasesHoyModal && (
        <div style={{
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
        }}>
          <div style={{
            backgroundColor: colors.white,
            borderRadius: '12px',
            padding: '1.5rem',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              {selectedClase ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      onClick={closeClaseDetalle}
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
                      Alumnos - {selectedClase.horaInicio}
                    </h3>
                  </div>
                </>
              ) : (
                <h3 style={{ margin: 0, color: colors.gray[900] }}>
                  Clases de Hoy ({diasSemana[new Date().getDay()]})
                </h3>
              )}
              <button
                onClick={() => {
                  setShowClasesHoyModal(false);
                  closeClaseDetalle();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: colors.gray[500]
                }}
              >
                <X size={24} />
              </button>
            </div>

            {selectedClase ? (
              // Vista de alumnos de la clase seleccionada
              loadingAlumnos ? (
                <div style={{
                  textAlign: 'center',
                  padding: '2rem',
                  color: colors.gray[500]
                }}>
                  Cargando alumnos...
                </div>
              ) : alumnosClase.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '2rem',
                  color: colors.gray[500]
                }}>
                  <Users size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                  <p>No hay alumnos inscriptos en esta clase</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {alumnosClase.map((inscripcion) => {
                    const telefono = inscripcion.alumno?.telefono;
                    const telefonoLimpio = telefono ? telefono.replace(/\D/g, '') : '';

                    return (
                      <div
                        key={inscripcion.id}
                        style={{
                          padding: '0.75rem 1rem',
                          backgroundColor: colors.gray[50],
                          borderRadius: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{
                            fontWeight: '500',
                            color: colors.gray[900]
                          }}>
                            {inscripcion.alumno?.nombre} {inscripcion.alumno?.apellido}
                          </div>
                          {telefono && (
                            <div style={{
                              fontSize: '0.75rem',
                              color: colors.gray[500]
                            }}>
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
                            onClick={() => navigate(`/alumnos/${inscripcion.alumno?.id}`)}
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
                    Total: {alumnosClase.length} alumno{alumnosClase.length !== 1 ? 's' : ''}
                  </div>
                </div>
              )
            ) : clasesHoy.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '2rem',
                color: colors.gray[500]
              }}>
                No hay clases programadas para hoy
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {clasesHoy
                  .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
                  .map((clase) => (
                  <div
                    key={clase.id}
                    style={{
                      padding: '1rem',
                      backgroundColor: colors.gray[50],
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{
                        fontWeight: '600',
                        color: colors.gray[900],
                        fontSize: '1rem'
                      }}>
                        {clase.horaInicio} - {clase.horaFin}
                      </div>
                      {clase.profesor && (
                        <div style={{
                          fontSize: '0.875rem',
                          color: colors.gray[600],
                          marginTop: '0.25rem'
                        }}>
                          Prof. {clase.profesor.nombre} {clase.profesor.apellido}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        fontSize: '0.875rem',
                        color: colors.gray[600]
                      }}>
                        {clase.cuposOcupados || 0}/{clase.cuposMaximos}
                      </div>
                      <button
                        onClick={() => fetchAlumnosClase(clase)}
                        style={{
                          padding: '0.375rem 0.75rem',
                          backgroundColor: colors.primary,
                          color: colors.white,
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: '500'
                        }}
                      >
                        Ver Detalle
                      </button>
                    </div>
                  </div>
                ))}
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

export default Administracion;
