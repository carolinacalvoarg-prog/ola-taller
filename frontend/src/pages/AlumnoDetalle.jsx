import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { alumnosService, inscripcionesService } from '../services/api';
import Card from '../components/Card';
import Toast from '../components/Toast';
import { colors } from '../styles/colors';
import { ArrowLeft, Save, MessageCircle, Calendar, Pencil, X, Activity, Filter } from 'lucide-react';

const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function AlumnoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [alumno, setAlumno] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    notas: ''
  });
  const [inscripciones, setInscripciones] = useState([]);
  const [actividades, setActividades] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');
  const [loadingActividades, setLoadingActividades] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    fetchAlumno();
    fetchActividades();
  }, [id]);

  useEffect(() => {
    fetchActividades();
  }, [filtroTipo, filtroFechaDesde, filtroFechaHasta]);

  const fetchAlumno = async () => {
    try {
      setLoading(true);
      const [alumnoRes, inscripcionesRes] = await Promise.all([
        alumnosService.getById(id),
        inscripcionesService.getByAlumno(id)
      ]);

      const alumnoData = alumnoRes.data;
      setAlumno(alumnoData);
      setFormData({
        nombre: alumnoData.nombre || '',
        apellido: alumnoData.apellido || '',
        email: alumnoData.email || '',
        telefono: alumnoData.telefono || '',
        notas: alumnoData.notas || ''
      });
      setInscripciones(inscripcionesRes.data || []);
    } catch (error) {
      console.error('Error al cargar alumno:', error);
      showToast('Error al cargar los datos del alumno', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchActividades = async () => {
    if (!id) return;
    try {
      setLoadingActividades(true);
      const response = await inscripcionesService.getActividadesByAlumno(id, {
        limit: 10,
        tipo: filtroTipo,
        fechaDesde: filtroFechaDesde,
        fechaHasta: filtroFechaHasta
      });
      setActividades(response.data || []);
    } catch (error) {
      console.error('Error al cargar actividades:', error);
    } finally {
      setLoadingActividades(false);
    }
  };

  const formatFecha = (fecha) => {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTipoLabel = (tipo) => {
    switch (tipo) {
      case 'inscripcion': return 'Inscripcion';
      case 'cancelacion': return 'Cancelacion';
      case 'recuperacion': return 'Recuperacion';
      case 'asistencia': return 'Presente';
      case 'inasistencia': return 'Ausente';
      default: return tipo;
    }
  };

  const getTipoColor = (tipo) => {
    switch (tipo) {
      case 'inscripcion': return colors.success;
      case 'cancelacion': return colors.error;
      case 'recuperacion': return colors.primary;
      case 'asistencia': return colors.success;
      case 'inasistencia': return colors.error;
      default: return colors.gray[500];
    }
  };

  const limpiarFiltros = () => {
    setFiltroTipo('');
    setFiltroFechaDesde('');
    setFiltroFechaHasta('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await alumnosService.update(id, {
        id: parseInt(id),
        ...formData,
        activo: true
      });
      // Actualizar el estado del alumno con los nuevos datos
      setAlumno(prev => ({ ...prev, ...formData }));
      showToast('Alumno actualizado exitosamente', 'success');
      setIsEditing(false);
    } catch (error) {
      console.error('Error al guardar:', error);
      showToast('Error al guardar los cambios', 'error');
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    // Restaurar los datos originales del alumno
    setFormData({
      nombre: alumno.nombre || '',
      apellido: alumno.apellido || '',
      email: alumno.email || '',
      telefono: alumno.telefono || '',
      notas: alumno.notas || ''
    });
    setIsEditing(false);
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    border: `1px solid ${colors.gray[300]}`,
    borderRadius: '6px',
    fontSize: '0.875rem',
    outline: 'none',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: colors.gray[700],
    marginBottom: '0.5rem',
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '16rem'
      }}>
        <div style={{ color: colors.gray[600], fontSize: '1.125rem' }}>Cargando...</div>
      </div>
    );
  }

  if (!alumno) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ color: colors.gray[600] }}>Alumno no encontrado</p>
        <button
          onClick={() => navigate('/alumnos')}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            backgroundColor: colors.primary,
            color: colors.white,
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Volver a Alumnos
        </button>
      </div>
    );
  }

  const telefonoLimpio = formData.telefono ? formData.telefono.replace(/\D/g, '') : '';

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <button
          onClick={() => navigate('/alumnos')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            backgroundColor: colors.gray[100],
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            color: colors.gray[600]
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: colors.gray[900],
            margin: 0
          }}>
            {alumno.nombre} {alumno.apellido}
          </h2>
          <p style={{
            fontSize: '0.875rem',
            color: colors.gray[500],
            margin: '0.25rem 0 0 0'
          }}>
            Ficha del alumno
          </p>
        </div>
        {telefonoLimpio && (
          <a
            href={`https://wa.me/${telefonoLimpio}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#25D366',
              borderRadius: '6px',
              color: 'white',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            <MessageCircle size={18} />
            WhatsApp
          </a>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Datos del Alumno */}
        <Card>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <h3 style={{
              fontSize: '1rem',
              fontWeight: '600',
              color: colors.gray[900],
              margin: 0
            }}>
              Datos del Alumno
            </h3>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                title="Editar"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: colors.primary,
                  color: colors.white,
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                <Pencil size={16} />
                Editar
              </button>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleSubmit}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '1rem',
                marginBottom: '1rem'
              }}>
                <div>
                  <label style={labelStyle}>Nombre *</label>
                  <input
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Apellido *</label>
                  <input
                    type="text"
                    required
                    value={formData.apellido}
                    onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Teléfono</label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={labelStyle}>Notas</label>
                <textarea
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  rows={4}
                  placeholder="Anotaciones sobre el alumno..."
                  style={{
                    ...inputStyle,
                    resize: 'vertical',
                    minHeight: '100px'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={cancelEdit}
                  style={{
                    backgroundColor: colors.gray[100],
                    color: colors.gray[700],
                    padding: '0.75rem 1.5rem',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: '500',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <X size={16} />
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    backgroundColor: colors.primary,
                    color: colors.white,
                    padding: '0.75rem 1.5rem',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontWeight: '500',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    opacity: saving ? 0.7 : 1
                  }}
                >
                  <Save size={16} />
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          ) : (
            <div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '1rem',
                marginBottom: '1rem'
              }}>
                <div>
                  <label style={labelStyle}>Nombre</label>
                  <div style={{ fontSize: '0.875rem', color: colors.gray[900] }}>
                    {alumno.nombre}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Apellido</label>
                  <div style={{ fontSize: '0.875rem', color: colors.gray[900] }}>
                    {alumno.apellido}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <div style={{ fontSize: '0.875rem', color: colors.gray[900] }}>
                    {alumno.email}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Teléfono</label>
                  <div style={{ fontSize: '0.875rem', color: colors.gray[900] }}>
                    {alumno.telefono || '-'}
                  </div>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Notas</label>
                <div style={{
                  fontSize: '0.875rem',
                  color: alumno.notas ? colors.gray[900] : colors.gray[400],
                  whiteSpace: 'pre-wrap',
                  minHeight: '60px',
                  padding: '0.75rem',
                  backgroundColor: colors.gray[50],
                  borderRadius: '6px'
                }}>
                  {alumno.notas || 'Sin notas'}
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Clases inscriptas */}
        <Card>
          <h3 style={{
            fontSize: '1rem',
            fontWeight: '600',
            color: colors.gray[900],
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Calendar size={18} />
            Clases Inscriptas
          </h3>
          {inscripciones.length === 0 ? (
            <p style={{
              color: colors.gray[500],
              fontSize: '0.875rem',
              textAlign: 'center',
              padding: '1rem'
            }}>
              No esta inscripto en ninguna clase
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {inscripciones.map((inscripcion) => (
                <div
                  key={inscripcion.id}
                  style={{
                    padding: '0.75rem',
                    backgroundColor: colors.gray[50],
                    borderRadius: '6px'
                  }}
                >
                  <div style={{ fontWeight: '500', color: colors.gray[900] }}>
                    {inscripcion.turno ? diasSemana[inscripcion.turno.diaSemana] : 'Clase'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: colors.gray[500] }}>
                    {inscripcion.turno?.horaInicio} - {inscripcion.turno?.horaFin}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Actividades */}
      <div style={{ marginTop: '1.5rem' }}>
        <Card>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <h3 style={{
              fontSize: '1rem',
              fontWeight: '600',
              color: colors.gray[900],
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Activity size={18} />
              Actividades
            </h3>
          </div>

          {/* Filtros */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            marginBottom: '1rem',
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
                Tipo
              </label>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                style={{
                  padding: '0.5rem',
                  border: `1px solid ${colors.gray[300]}`,
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  minWidth: '140px'
                }}
              >
                <option value="">Todos</option>
                <option value="inscripcion">Inscripcion</option>
                <option value="cancelacion">Cancelacion</option>
                <option value="recuperacion">Recuperacion</option>
                <option value="asistencia">Presente</option>
                <option value="inasistencia">Ausente</option>
              </select>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '0.75rem',
                color: colors.gray[600],
                marginBottom: '0.25rem'
              }}>
                Desde
              </label>
              <input
                type="date"
                value={filtroFechaDesde}
                onChange={(e) => setFiltroFechaDesde(e.target.value)}
                style={{
                  padding: '0.5rem',
                  border: `1px solid ${colors.gray[300]}`,
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '0.75rem',
                color: colors.gray[600],
                marginBottom: '0.25rem'
              }}>
                Hasta
              </label>
              <input
                type="date"
                value={filtroFechaHasta}
                onChange={(e) => setFiltroFechaHasta(e.target.value)}
                style={{
                  padding: '0.5rem',
                  border: `1px solid ${colors.gray[300]}`,
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            {(filtroTipo || filtroFechaDesde || filtroFechaHasta) && (
              <button
                onClick={limpiarFiltros}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: colors.gray[100],
                  color: colors.gray[700],
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                <X size={14} />
                Limpiar
              </button>
            )}
          </div>

          {/* Lista de actividades */}
          {loadingActividades ? (
            <div style={{ textAlign: 'center', padding: '1rem', color: colors.gray[500] }}>
              Cargando actividades...
            </div>
          ) : actividades.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1rem', color: colors.gray[500], fontSize: '0.875rem' }}>
              No hay actividades registradas
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {actividades.map((actividad) => (
                <div
                  key={actividad.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem',
                    backgroundColor: colors.gray[50],
                    borderRadius: '6px',
                    borderLeft: `4px solid ${getTipoColor(actividad.tipo)}`
                  }}
                >
                  <div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '0.25rem'
                    }}>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: getTipoColor(actividad.tipo),
                        textTransform: 'uppercase'
                      }}>
                        {getTipoLabel(actividad.tipo)}
                      </span>
                      {actividad.turno && (
                        <span style={{ fontSize: '0.875rem', color: colors.gray[700] }}>
                          - {diasSemana[actividad.turno.diaSemana]} {actividad.turno.horaInicio}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: colors.gray[500] }}>
                      {formatFecha(actividad.fecha)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default AlumnoDetalle;
