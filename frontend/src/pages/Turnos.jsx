import { useState, useEffect } from 'react';
import { turnosService, inscripcionesService, alumnosService } from '../services/api';
import Card from '../components/Card';
import Toast from '../components/Toast';
import { colors } from '../styles/colors';
import { Calendar, Trash2, Pencil, Users, X, MessageCircle, UserPlus, Check, Search } from 'lucide-react';

const diasSemana = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
];

function Turnos() {
  const [turnos, setTurnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTurno, setEditingTurno] = useState(null);
  const [formData, setFormData] = useState({
    diaSemana: 1,
    horaInicio: '09:00',
    horaFin: '11:00',
    cuposMaximos: 8,
  });
  const [toast, setToast] = useState(null);
  const [conflictModal, setConflictModal] = useState(null);
  const [alumnosModal, setAlumnosModal] = useState(null);
  const [alumnosClase, setAlumnosClase] = useState([]);
  const [loadingAlumnos, setLoadingAlumnos] = useState(false);
  const [showAddAlumnos, setShowAddAlumnos] = useState(false);
  const [allAlumnos, setAllAlumnos] = useState([]);
  const [searchAlumno, setSearchAlumno] = useState('');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    fetchTurnos();
  }, []);

  const fetchTurnos = async () => {
    try {
      setLoading(true);
      const response = await turnosService.getAll();
      setTurnos(response.data || []);
    } catch (error) {
      console.error('Error al cargar turnos:', error);
      showToast('Error al cargar la lista de clases', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      diaSemana: 1,
      horaInicio: '09:00',
      horaFin: '11:00',
      cuposMaximos: 8,
    });
    setEditingTurno(null);
    setShowForm(false);
  };

  const checkConflict = (diaSemana, horaInicio) => {
    return turnos.find(t =>
      t.diaSemana === parseInt(diaSemana) &&
      t.horaInicio === horaInicio + ':00' &&
      (!editingTurno || t.id !== editingTurno.id)
    );
  };

  const handleEdit = (turno) => {
    setEditingTurno(turno);
    setFormData({
      diaSemana: turno.diaSemana,
      horaInicio: turno.horaInicio.substring(0, 5),
      horaFin: turno.horaFin.substring(0, 5),
      cuposMaximos: turno.cuposMaximos,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const diaSemana = parseInt(formData.diaSemana);
    const horaInicio = formData.horaInicio;

    // Verificar conflicto solo al crear nuevo turno
    if (!editingTurno) {
      const turnoExistente = checkConflict(diaSemana, horaInicio);
      if (turnoExistente) {
        setConflictModal({
          turnoExistente,
          nuevosDatos: { ...formData }
        });
        return;
      }
    }

    await saveTurno();
  };

  const saveTurno = async () => {
    try {
      const turnoData = {
        diaSemana: parseInt(formData.diaSemana),
        horaInicio: formData.horaInicio + ':00',
        horaFin: formData.horaFin + ':00',
        cuposMaximos: parseInt(formData.cuposMaximos),
      };

      if (editingTurno) {
        await turnosService.update(editingTurno.id, {
          id: editingTurno.id,
          ...turnoData,
          activo: true
        });
        showToast('Clase actualizada exitosamente', 'success');
      } else {
        await turnosService.create(turnoData);
        showToast('Clase creada exitosamente', 'success');
      }

      resetForm();
      fetchTurnos();
    } catch (error) {
      console.error('Error al guardar clase:', error);
      showToast(editingTurno ? 'Error al actualizar la clase' : 'Error al crear la clase', 'error');
    }
  };

  const handleEditExisting = () => {
    const { turnoExistente } = conflictModal;
    setConflictModal(null);
    handleEdit(turnoExistente);
  };

  const handleChangeNewData = () => {
    setConflictModal(null);
    // El formulario ya tiene los datos, el usuario puede modificarlos
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta clase?')) {
      try {
        await turnosService.delete(id);
        showToast('Clase eliminada exitosamente', 'success');
        fetchTurnos();
      } catch (error) {
        console.error('Error al eliminar clase:', error);
        showToast('Error al eliminar la clase', 'error');
      }
    }
  };

  const getDiaSemanaLabel = (dia) => {
    const diaObj = diasSemana.find(d => d.value === dia);
    return diaObj ? diaObj.label : '';
  };

  const openAlumnosModal = async (clase) => {
    setAlumnosModal(clase);
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

  const closeAlumnosModal = () => {
    setAlumnosModal(null);
    setAlumnosClase([]);
    setShowAddAlumnos(false);
    setAllAlumnos([]);
    setSearchAlumno('');
  };

  const removeAlumnoFromClase = async (inscripcionId) => {
    try {
      await inscripcionesService.cancelar(inscripcionId);
      setAlumnosClase(prev => prev.filter(i => i.id !== inscripcionId));
      showToast('Alumno removido de la clase', 'success');
      fetchTurnos(); // Actualizar cupos
    } catch (error) {
      console.error('Error al remover alumno:', error);
      showToast('Error al remover el alumno', 'error');
    }
  };

  const openAddAlumnos = async () => {
    setShowAddAlumnos(true);
    try {
      const response = await alumnosService.getAll();
      setAllAlumnos(response.data || []);
    } catch (error) {
      console.error('Error al cargar alumnos:', error);
      showToast('Error al cargar la lista de alumnos', 'error');
    }
  };

  const addAlumnoToClase = async (alumno) => {
    if (!alumnosModal) return;

    // Verificar si ya está inscrito
    if (isAlumnoInClase(alumno.id)) {
      showToast('El alumno ya está inscrito en esta clase', 'error');
      return;
    }

    try {
      const response = await inscripcionesService.create({
        alumnoId: alumno.id,
        turnoId: alumnosModal.id
      });
      // Agregar a la lista con los datos del alumno
      setAlumnosClase(prev => [...prev, {
        ...response.data,
        alumno: {
          id: alumno.id,
          nombre: alumno.nombre,
          apellido: alumno.apellido,
          email: alumno.email,
          telefono: alumno.telefono
        }
      }]);
      showToast(`${alumno.nombre} ${alumno.apellido} agregado a la clase`, 'success');
      fetchTurnos(); // Actualizar cupos
    } catch (error) {
      console.error('Error al agregar alumno:', error);
      let errorMsg = 'Error al agregar el alumno';
      if (error.response?.data) {
        const data = error.response.data;
        if (typeof data === 'string') {
          errorMsg = data;
        } else if (data.title) {
          errorMsg = data.title;
        } else if (data.detail) {
          errorMsg = data.detail;
        } else if (data.errors) {
          errorMsg = Object.values(data.errors).flat().join(', ');
        }
      }
      showToast(errorMsg, 'error');
    }
  };

  const isAlumnoInClase = (alumnoId) => {
    return alumnosClase.some(i => (i.alumnoId || i.AlumnoId) === alumnoId);
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
          Clases
        </h2>
        <button
          onClick={() => {
            if (showForm) {
              resetForm();
            } else {
              setEditingTurno(null);
              setFormData({
                diaSemana: 1,
                horaInicio: '09:00',
                horaFin: '11:00',
                cuposMaximos: 8,
              });
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
          }}
        >
          {showForm ? 'Cancelar' : '+ Nueva Clase'}
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <Card style={{ marginBottom: '1.5rem' }}>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: colors.gray[900],
            marginBottom: '1rem'
          }}>
            {editingTurno ? 'Editar Clase' : 'Nueva Clase'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}>
              <div>
                <label style={labelStyle}>Día de la Semana *</label>
                <select
                  required
                  value={formData.diaSemana}
                  onChange={(e) => setFormData({ ...formData, diaSemana: e.target.value })}
                  style={inputStyle}
                >
                  {diasSemana.map((dia) => (
                    <option key={dia.value} value={dia.value}>
                      {dia.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Cupos Máximos *</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="20"
                  value={formData.cuposMaximos}
                  onChange={(e) => setFormData({ ...formData, cuposMaximos: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Hora Inicio *</label>
                <input
                  type="time"
                  required
                  value={formData.horaInicio}
                  onChange={(e) => setFormData({ ...formData, horaInicio: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Hora Fin *</label>
                <input
                  type="time"
                  required
                  value={formData.horaFin}
                  onChange={(e) => setFormData({ ...formData, horaFin: e.target.value })}
                  style={inputStyle}
                />
              </div>
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
                {editingTurno ? 'Actualizar Clase' : 'Guardar Clase'}
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Lista de Turnos */}
      {turnos.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <Calendar size={48} style={{ color: colors.gray[400], margin: '0 auto' }} />
            <h3 style={{
              marginTop: '0.75rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: colors.gray[900]
            }}>
              No hay clases
            </h3>
            <p style={{
              marginTop: '0.25rem',
              fontSize: '0.875rem',
              color: colors.gray[500]
            }}>
              Comienza agregando una nueva clase.
            </p>
          </div>
        </Card>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1rem'
        }}>
          {turnos.map((turno) => (
            <Card key={turno.id}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '1rem'
              }}>
                <div>
                  <h3 style={{
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: colors.gray[900]
                  }}>
                    {getDiaSemanaLabel(turno.diaSemana)}
                  </h3>
                  <p style={{
                    fontSize: '0.875rem',
                    color: colors.gray[600],
                    marginTop: '0.25rem'
                  }}>
                    {turno.horaInicio} - {turno.horaFin}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => openAlumnosModal(turno)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: colors.success,
                      padding: '0.25rem'
                    }}
                    title="Ver alumnos"
                  >
                    <Users size={18} />
                  </button>
                  <button
                    onClick={() => handleEdit(turno)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: colors.primary,
                      padding: '0.25rem'
                    }}
                    title="Editar clase"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(turno.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: colors.error,
                      padding: '0.25rem'
                    }}
                    title="Eliminar clase"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.875rem',
                  marginBottom: '0.5rem'
                }}>
                  <span style={{ color: colors.gray[600] }}>Cupos:</span>
                  <span style={{ fontWeight: '500', color: colors.gray[900] }}>
                    {turno.cuposOcupados || 0} / {turno.cuposMaximos}
                  </span>
                </div>
                <div style={{
                  width: '100%',
                  backgroundColor: colors.gray[200],
                  borderRadius: '999px',
                  height: '8px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    backgroundColor: colors.primary,
                    height: '100%',
                    borderRadius: '999px',
                    width: `${((turno.cuposOcupados || 0) / turno.cuposMaximos) * 100}%`,
                    transition: 'width 0.3s'
                  }} />
                </div>
                <div style={{
                  fontSize: '0.875rem',
                  color: turno.cuposDisponibles > 3 ? colors.success : colors.warning,
                  marginTop: '0.5rem',
                  fontWeight: '500'
                }}>
                  {turno.cuposDisponibles ?? turno.cuposMaximos} cupos disponibles
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Alumnos de la Clase */}
      {alumnosModal && (
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
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: colors.gray[900]
              }}>
                Alumnos - {getDiaSemanaLabel(alumnosModal.diaSemana)} {alumnosModal.horaInicio}
              </h3>
              <button
                onClick={closeAlumnosModal}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: colors.gray[500],
                  padding: '0.25rem'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{
              overflowY: 'auto',
              flex: 1
            }}>
              {showAddAlumnos ? (
                // Vista para agregar alumnos
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {/* Buscador */}
                  <div style={{
                    position: 'relative',
                    marginBottom: '0.5rem'
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
                      placeholder="Buscar alumno..."
                      value={searchAlumno}
                      onChange={(e) => setSearchAlumno(e.target.value)}
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
                  {allAlumnos.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: colors.gray[500] }}>
                      Cargando alumnos...
                    </div>
                  ) : (
                    allAlumnos
                      .filter(alumno => {
                        if (!searchAlumno) return true;
                        const search = searchAlumno.toLowerCase();
                        return (
                          alumno.nombre.toLowerCase().includes(search) ||
                          alumno.apellido.toLowerCase().includes(search) ||
                          alumno.email.toLowerCase().includes(search)
                        );
                      })
                      .map((alumno) => {
                        const yaInscrito = isAlumnoInClase(alumno.id);
                        return (
                          <div
                            key={alumno.id}
                            onClick={() => !yaInscrito && addAlumnoToClase(alumno)}
                            style={{
                              padding: '0.75rem 1rem',
                              backgroundColor: yaInscrito ? colors.primary + '10' : colors.gray[50],
                              borderRadius: '8px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              cursor: yaInscrito ? 'default' : 'pointer',
                              border: yaInscrito ? `2px solid ${colors.primary}` : '2px solid transparent',
                              opacity: yaInscrito ? 0.7 : 1
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: '500', color: colors.gray[900] }}>
                                {alumno.nombre} {alumno.apellido}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: colors.gray[500] }}>
                                {alumno.email}
                              </div>
                            </div>
                            {yaInscrito ? (
                              <Check size={20} style={{ color: colors.primary }} />
                            ) : (
                              <UserPlus size={20} style={{ color: colors.success }} />
                            )}
                          </div>
                        );
                      })
                  )}
                </div>
              ) : loadingAlumnos ? (
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
                            onClick={() => removeAlumnoFromClase(inscripcion.id)}
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
                              cursor: 'pointer'
                            }}
                            title="Quitar de la clase"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{
              marginTop: '1rem',
              paddingTop: '1rem',
              borderTop: `1px solid ${colors.gray[200]}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{
                fontSize: '0.875rem',
                color: colors.gray[600]
              }}>
                Total: {alumnosClase.length} alumno{alumnosClase.length !== 1 ? 's' : ''}
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {showAddAlumnos ? (
                  <button
                    onClick={() => setShowAddAlumnos(false)}
                    style={{
                      backgroundColor: colors.gray[100],
                      color: colors.gray[700],
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    Volver
                  </button>
                ) : (
                  <>
                    <button
                      onClick={openAddAlumnos}
                      style={{
                        backgroundColor: colors.success,
                        color: colors.white,
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <UserPlus size={16} />
                      Agregar Alumnos
                    </button>
                    <button
                      onClick={closeAlumnosModal}
                      style={{
                        backgroundColor: colors.gray[100],
                        color: colors.gray[700],
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                      }}
                    >
                      Cerrar
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Conflicto */}
      {conflictModal && (
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
            maxWidth: '450px',
            width: '90%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: colors.gray[900],
              marginBottom: '1rem'
            }}>
              Clase existente encontrada
            </h3>
            <p style={{
              color: colors.gray[600],
              marginBottom: '1rem',
              fontSize: '0.875rem'
            }}>
              Ya existe una clase para el <strong>{getDiaSemanaLabel(conflictModal.turnoExistente.diaSemana)}</strong> a las <strong>{conflictModal.turnoExistente.horaInicio}</strong>.
            </p>
            <p style={{
              color: colors.gray[600],
              marginBottom: '1.5rem',
              fontSize: '0.875rem'
            }}>
              ¿Qué deseas hacer?
            </p>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <button
                onClick={handleEditExisting}
                style={{
                  backgroundColor: colors.primary,
                  color: colors.white,
                  padding: '0.75rem 1rem',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                }}
              >
                Editar clase existente
              </button>
              <button
                onClick={handleChangeNewData}
                style={{
                  backgroundColor: colors.white,
                  color: colors.gray[700],
                  padding: '0.75rem 1rem',
                  borderRadius: '6px',
                  border: `1px solid ${colors.gray[300]}`,
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                }}
              >
                Cambiar datos de la nueva clase
              </button>
              <button
                onClick={() => setConflictModal(null)}
                style={{
                  backgroundColor: 'transparent',
                  color: colors.gray[500],
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                Cancelar
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

export default Turnos;
