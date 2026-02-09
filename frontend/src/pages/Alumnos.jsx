import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { alumnosService, turnosService, inscripcionesService } from '../services/api';
import Card from '../components/Card';
import Toast from '../components/Toast';
import { colors } from '../styles/colors';
import { Users, Pencil, Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Calendar, X, Check, MessageCircle, Trash2 } from 'lucide-react';

const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function Alumnos() {
  const navigate = useNavigate();
  const [alumnos, setAlumnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAlumno, setEditingAlumno] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    fechaNacimiento: '',
    clasesPendientesRecuperar: 0,
  });
  const [toast, setToast] = useState(null);

  // Estados para búsqueda, ordenamiento y paginación
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'nombre', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Estados para asignación de turnos
  const [showTurnosModal, setShowTurnosModal] = useState(false);
  const [selectedAlumno, setSelectedAlumno] = useState(null);
  const [turnos, setTurnos] = useState([]);
  const [inscripcionesAlumno, setInscripcionesAlumno] = useState([]);
  const [loadingTurnos, setLoadingTurnos] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    fetchAlumnos();
  }, []);

  // Reset página cuando cambia la búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Filtrar alumnos por búsqueda
  const filteredAlumnos = alumnos.filter(alumno => {
    const searchLower = searchTerm.toLowerCase();
    return (
      alumno.nombre.toLowerCase().includes(searchLower) ||
      alumno.apellido.toLowerCase().includes(searchLower) ||
      alumno.email.toLowerCase().includes(searchLower) ||
      (alumno.telefono && alumno.telefono.toLowerCase().includes(searchLower))
    );
  });

  // Ordenar alumnos
  const sortedAlumnos = [...filteredAlumnos].sort((a, b) => {
    let aValue = a[sortConfig.key] || '';
    let bValue = b[sortConfig.key] || '';

    if (sortConfig.key === 'nombre') {
      aValue = `${a.nombre} ${a.apellido}`.toLowerCase();
      bValue = `${b.nombre} ${b.apellido}`.toLowerCase();
    } else {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Paginación
  const totalPages = Math.ceil(sortedAlumnos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAlumnos = sortedAlumnos.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) {
      return <ChevronUp size={14} style={{ opacity: 0.3 }} />;
    }
    return sortConfig.direction === 'asc'
      ? <ChevronUp size={14} />
      : <ChevronDown size={14} />;
  };

  const fetchAlumnos = async () => {
    try {
      setLoading(true);
      const response = await alumnosService.getAll();
      setAlumnos(response.data);
    } catch (error) {
      console.error('Error al cargar alumnos:', error);
      showToast('Error al cargar la lista de alumnos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ nombre: '', apellido: '', email: '', telefono: '', fechaNacimiento: '', clasesPendientesRecuperar: 0 });
    setEditingAlumno(null);
    setShowForm(false);
  };

  const handleEdit = (alumno) => {
    setEditingAlumno(alumno);
    setFormData({
      nombre: alumno.nombre,
      apellido: alumno.apellido,
      email: alumno.email,
      telefono: alumno.telefono || '',
      fechaNacimiento: alumno.fechaNacimiento ? alumno.fechaNacimiento.slice(0, 10) : '',
      clasesPendientesRecuperar: alumno.clasesPendientesRecuperar || 0,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingAlumno) {
        await alumnosService.update(editingAlumno.id, {
          id: editingAlumno.id,
          nombre: formData.nombre,
          apellido: formData.apellido,
          email: formData.email,
          telefono: formData.telefono,
          fechaNacimiento: formData.fechaNacimiento || null,
          clasesPendientesRecuperar: parseInt(formData.clasesPendientesRecuperar) || 0,
          activo: true
        });
        showToast('Alumno actualizado exitosamente', 'success');
      } else {
        await alumnosService.create({
          nombre: formData.nombre,
          apellido: formData.apellido,
          email: formData.email,
          telefono: formData.telefono,
          fechaNacimiento: formData.fechaNacimiento || null
        });
        showToast('Alumno creado exitosamente', 'success');
      }
      resetForm();
      fetchAlumnos();
    } catch (error) {
      console.error('Error al guardar alumno:', error);
      let errorMsg = editingAlumno ? 'Error al actualizar el alumno' : 'Error al crear el alumno';

      // Extraer mensaje de error del backend
      if (error.response?.data) {
        const data = error.response.data;
        if (typeof data === 'string') {
          if (data.includes('UNIQUE constraint failed: Alumnos.Email')) {
            errorMsg = 'Ya existe un alumno con ese email';
          } else {
            errorMsg = data;
          }
        } else if (data.title) {
          errorMsg = data.title;
        } else if (data.detail) {
          errorMsg = data.detail;
        }
      }

      showToast(errorMsg, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este alumno?')) {
      try {
        await alumnosService.delete(id);
        showToast('Alumno eliminado exitosamente', 'success');
        fetchAlumnos();
      } catch (error) {
        console.error('Error al eliminar alumno:', error);
        showToast('Error al eliminar el alumno', 'error');
      }
    }
  };

  // Funciones para asignación de turnos
  const openTurnosModal = async (alumno) => {
    setSelectedAlumno(alumno);
    setShowTurnosModal(true);
    setLoadingTurnos(true);

    try {
      const [turnosRes, inscripcionesRes] = await Promise.all([
        turnosService.getAll(),
        inscripcionesService.getByAlumno(alumno.id)
      ]);
      setTurnos(turnosRes.data || []);
      setInscripcionesAlumno(inscripcionesRes.data || []);
    } catch (error) {
      console.error('Error al cargar turnos:', error);
      showToast('Error al cargar los turnos', 'error');
    } finally {
      setLoadingTurnos(false);
    }
  };

  const closeTurnosModal = () => {
    setShowTurnosModal(false);
    setSelectedAlumno(null);
    setTurnos([]);
    setInscripcionesAlumno([]);
  };

  const isInscrito = (turnoId) => {
    return inscripcionesAlumno.some(i => i.turnoId === turnoId);
  };

  const getInscripcionId = (turnoId) => {
    const inscripcion = inscripcionesAlumno.find(i => i.turnoId === turnoId);
    return inscripcion ? inscripcion.id : null;
  };

  const handleToggleInscripcion = async (turno) => {
    if (!selectedAlumno) return;

    try {
      if (isInscrito(turno.id)) {
        // Desinscribir
        const inscripcionId = getInscripcionId(turno.id);
        if (inscripcionId) {
          await inscripcionesService.cancelar(inscripcionId);
          setInscripcionesAlumno(prev => prev.filter(i => i.id !== inscripcionId));
          showToast(`${selectedAlumno.nombre} fue removido de ${diasSemana[turno.diaSemana]} ${turno.horaInicio}`, 'success');
        }
      } else {
        // Inscribir
        if (turno.cuposDisponibles <= 0) {
          showToast('No hay cupos disponibles en esta clase', 'error');
          return;
        }
        const response = await inscripcionesService.create({
          alumnoId: selectedAlumno.id,
          turnoId: turno.id
        });
        setInscripcionesAlumno(prev => [...prev, response.data]);
        showToast(`${selectedAlumno.nombre} fue inscrito en ${diasSemana[turno.diaSemana]} ${turno.horaInicio}`, 'success');
      }
      // Refrescar turnos para actualizar cupos
      const turnosRes = await turnosService.getAll();
      setTurnos(turnosRes.data || []);
    } catch (error) {
      console.error('Error al modificar inscripción:', error);
      let errorMsg = 'Error al modificar la inscripción';
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMsg = error.response.data;
        } else if (error.response.data.title) {
          errorMsg = error.response.data.title;
        }
      }
      showToast(errorMsg, 'error');
    }
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

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem'
      }}>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: '600',
          color: colors.gray[900]
        }}>
          Alumnos
        </h2>
        <button
          onClick={() => {
            if (showForm) {
              resetForm();
            } else {
              setEditingAlumno(null);
              setFormData({ nombre: '', apellido: '', email: '', telefono: '', fechaNacimiento: '', clasesPendientesRecuperar: 0 });
              setShowForm(true);
            }
          }}
          style={{
            backgroundColor: colors.primary,
            color: colors.white,
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '0.875rem',
            transition: 'background-color 0.2s',
          }}
        >
          {showForm ? 'Cancelar' : '+ Nuevo Alumno'}
        </button>
      </div>

      {/* Barra de búsqueda */}
      {!showForm && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{
            position: 'relative',
            maxWidth: '320px'
          }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: colors.gray[400]
              }}
            />
            <input
              type="text"
              placeholder="Buscar por nombre, email o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem 0.625rem 2.5rem',
                border: `1px solid ${colors.gray[300]}`,
                borderRadius: '6px',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
          </div>
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <Card style={{ marginBottom: '1.5rem' }}>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: colors.gray[900],
            marginBottom: '1rem'
          }}>
            {editingAlumno ? 'Editar Alumno' : 'Nuevo Alumno'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '1rem',
              marginBottom: '1.5rem'
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
              <div>
                <label style={labelStyle}>Fecha de nacimiento</label>
                <input
                  type="date"
                  value={formData.fechaNacimiento}
                  onChange={(e) => setFormData({ ...formData, fechaNacimiento: e.target.value })}
                  style={inputStyle}
                />
              </div>
              {editingAlumno && (
                <div>
                  <label style={labelStyle}>Clases pendientes de recuperar</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.clasesPendientesRecuperar}
                    onChange={(e) => setFormData({ ...formData, clasesPendientesRecuperar: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                style={{
                  backgroundColor: colors.primary,
                  color: colors.white,
                  padding: '0.75rem 1.5rem',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                }}
              >
                {editingAlumno ? 'Actualizar Alumno' : 'Guardar Alumno'}
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Lista de Alumnos */}
      <Card>
        {alumnos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <Users size={48} style={{ color: colors.gray[400], margin: '0 auto' }} />
            <h3 style={{
              marginTop: '0.75rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: colors.gray[900]
            }}>
              No hay alumnos
            </h3>
            <p style={{
              marginTop: '0.25rem',
              fontSize: '0.875rem',
              color: colors.gray[500]
            }}>
              Comienza agregando un nuevo alumno.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: colors.gray[50] }}>
                  <th
                    onClick={() => handleSort('nombre')}
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: colors.gray[500],
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      Nombre
                      <SortIcon columnKey="nombre" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('email')}
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: colors.gray[500],
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      Email
                      <SortIcon columnKey="email" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('telefono')}
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: colors.gray[500],
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      Teléfono
                      <SortIcon columnKey="telefono" />
                    </div>
                  </th>
                  <th style={{
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: colors.gray[500],
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedAlumnos.map((alumno, idx) => (
                  <tr
                    key={alumno.id}
                    style={{
                      borderBottom: idx < paginatedAlumnos.length - 1 ? `1px solid ${colors.gray[200]}` : 'none'
                    }}
                  >
                    <td style={{ padding: '1rem' }}>
                      <div
                        onClick={() => navigate(`/alumnos/${alumno.id}`)}
                        style={{
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          color: colors.primary,
                          cursor: 'pointer',
                          textDecoration: 'none'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                        onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                      >
                        {alumno.nombre} {alumno.apellido}
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontSize: '0.875rem', color: colors.gray[600] }}>
                        {alumno.email}
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontSize: '0.875rem', color: colors.gray[600] }}>
                        {alumno.telefono || '-'}
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button
                          onClick={() => openTurnosModal(alumno)}
                          title="Clases"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '32px',
                            height: '32px',
                            backgroundColor: colors.success + '15',
                            borderRadius: '6px',
                            color: colors.success,
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          <Calendar size={16} />
                        </button>
                        <button
                          onClick={() => handleEdit(alumno)}
                          title="Editar"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '32px',
                            height: '32px',
                            backgroundColor: colors.primary + '15',
                            borderRadius: '6px',
                            color: colors.primary,
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(alumno.id)}
                          title="Eliminar"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '32px',
                            height: '32px',
                            backgroundColor: colors.error + '15',
                            borderRadius: '6px',
                            color: colors.error,
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                        {alumno.telefono && (
                          <a
                            href={`https://wa.me/${alumno.telefono.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="WhatsApp"
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
                          >
                            <MessageCircle size={16} />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Paginador */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                borderTop: `1px solid ${colors.gray[200]}`,
              }}>
                <div style={{
                  fontSize: '0.875rem',
                  color: colors.gray[600]
                }}>
                  Mostrando {startIndex + 1}-{Math.min(startIndex + itemsPerPage, sortedAlumnos.length)} de {sortedAlumnos.length} alumnos
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '32px',
                      height: '32px',
                      border: `1px solid ${colors.gray[300]}`,
                      borderRadius: '6px',
                      backgroundColor: currentPage === 1 ? colors.gray[100] : colors.white,
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      color: currentPage === 1 ? colors.gray[400] : colors.gray[700],
                    }}
                  >
                    <ChevronLeft size={18} />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      if (totalPages <= 5) return true;
                      if (page === 1 || page === totalPages) return true;
                      if (Math.abs(page - currentPage) <= 1) return true;
                      return false;
                    })
                    .map((page, idx, arr) => (
                      <span key={page}>
                        {idx > 0 && arr[idx - 1] !== page - 1 && (
                          <span style={{ color: colors.gray[400], padding: '0 0.25rem' }}>...</span>
                        )}
                        <button
                          onClick={() => setCurrentPage(page)}
                          style={{
                            minWidth: '32px',
                            height: '32px',
                            padding: '0 0.5rem',
                            border: currentPage === page ? 'none' : `1px solid ${colors.gray[300]}`,
                            borderRadius: '6px',
                            backgroundColor: currentPage === page ? colors.primary : colors.white,
                            color: currentPage === page ? colors.white : colors.gray[700],
                            cursor: 'pointer',
                            fontWeight: currentPage === page ? '500' : '400',
                            fontSize: '0.875rem',
                          }}
                        >
                          {page}
                        </button>
                      </span>
                    ))}

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '32px',
                      height: '32px',
                      border: `1px solid ${colors.gray[300]}`,
                      borderRadius: '6px',
                      backgroundColor: currentPage === totalPages ? colors.gray[100] : colors.white,
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                      color: currentPage === totalPages ? colors.gray[400] : colors.gray[700],
                    }}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Modal de Asignación de Turnos */}
      {showTurnosModal && selectedAlumno && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: colors.white,
            borderRadius: '12px',
            padding: '1.5rem',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            {/* Header del Modal */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
              paddingBottom: '1rem',
              borderBottom: `1px solid ${colors.gray[200]}`
            }}>
              <div>
                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: colors.gray[900],
                  margin: 0
                }}>
                  Asignar Clases
                </h3>
                <p style={{
                  fontSize: '0.875rem',
                  color: colors.gray[600],
                  margin: '0.25rem 0 0 0'
                }}>
                  {selectedAlumno.nombre} {selectedAlumno.apellido}
                </p>
              </div>
              <button
                onClick={closeTurnosModal}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: colors.gray[500],
                  padding: '0.25rem'
                }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Contenido del Modal */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {loadingTurnos ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: colors.gray[600] }}>
                  Cargando clases...
                </div>
              ) : turnos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: colors.gray[500] }}>
                  No hay clases disponibles. Crea clases primero.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {turnos.map(turno => {
                    const inscrito = isInscrito(turno.id);
                    const sinCupos = turno.cuposDisponibles <= 0 && !inscrito;

                    return (
                      <div
                        key={turno.id}
                        onClick={() => !sinCupos && handleToggleInscripcion(turno)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '1rem',
                          backgroundColor: inscrito ? colors.primary + '10' : colors.gray[50],
                          borderRadius: '8px',
                          cursor: sinCupos ? 'not-allowed' : 'pointer',
                          border: inscrito ? `2px solid ${colors.primary}` : '2px solid transparent',
                          opacity: sinCupos ? 0.5 : 1,
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '4px',
                            border: inscrito ? 'none' : `2px solid ${colors.gray[300]}`,
                            backgroundColor: inscrito ? colors.primary : colors.white,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {inscrito && <Check size={16} color={colors.white} />}
                          </div>
                          <div>
                            <div style={{
                              fontWeight: '500',
                              color: colors.gray[900],
                              fontSize: '0.9375rem'
                            }}>
                              {diasSemana[turno.diaSemana]}
                            </div>
                            <div style={{
                              fontSize: '0.875rem',
                              color: colors.gray[600]
                            }}>
                              {turno.horaInicio} - {turno.horaFin}
                            </div>
                          </div>
                        </div>
                        <div style={{
                          textAlign: 'right',
                          fontSize: '0.875rem'
                        }}>
                          <div style={{
                            color: turno.cuposDisponibles > 3 ? colors.success : turno.cuposDisponibles > 0 ? colors.warning : colors.error,
                            fontWeight: '500'
                          }}>
                            {turno.cuposDisponibles} cupos
                          </div>
                          <div style={{ color: colors.gray[500], fontSize: '0.75rem' }}>
                            de {turno.cuposMaximos}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer del Modal */}
            <div style={{
              marginTop: '1rem',
              paddingTop: '1rem',
              borderTop: `1px solid ${colors.gray[200]}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ fontSize: '0.875rem', color: colors.gray[600] }}>
                {inscripcionesAlumno.length} clase{inscripcionesAlumno.length !== 1 ? 's' : ''} asignada{inscripcionesAlumno.length !== 1 ? 's' : ''}
              </div>
              <button
                onClick={closeTurnosModal}
                style={{
                  backgroundColor: colors.primary,
                  color: colors.white,
                  padding: '0.75rem 1.5rem',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                }}
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

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

export default Alumnos;
