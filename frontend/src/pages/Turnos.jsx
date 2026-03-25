import { useState, useEffect } from 'react';
import { turnosService, inscripcionesService, alumnosService, talleresService } from '../services/api';
import Card from '../components/Card';
import Toast from '../components/Toast';
import { colors } from '../styles/colors';
import { Calendar, Trash2, Pencil, Users, X, MessageCircle, UserPlus, Check, Search, Plus, Settings } from 'lucide-react';

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
  const [talleres, setTalleres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTurno, setEditingTurno] = useState(null);
  const [formData, setFormData] = useState({
    diaSemana: 1,
    horaInicio: '09:00',
    horaFin: '11:00',
    cuposMaximos: 8,
    tallerId: '',
    usarFechasManuales: false,
  });
  const [nuevoTallerNombre, setNuevoTallerNombre] = useState('');
  const [showNuevoTaller, setShowNuevoTaller] = useState(false);
  const [fechasManuales, setFechasManuales] = useState([]);
  const [nuevaFechaManual, setNuevaFechaManual] = useState('');
  const [toast, setToast] = useState(null);
  const [conflictModal, setConflictModal] = useState(null);
  const [recuperacionModal, setRecuperacionModal] = useState(null); // { taller }
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
    fetchTalleres();
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

  const fetchTalleres = async () => {
    try {
      const response = await talleresService.getAll();
      setTalleres(response.data || []);
    } catch (error) {
      console.error('Error al cargar talleres:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      diaSemana: 1,
      horaInicio: '09:00',
      horaFin: '11:00',
      cuposMaximos: 8,
      tallerId: '',
      usarFechasManuales: false,
    });
    setEditingTurno(null);
    setShowForm(false);
    setFechasManuales([]);
    setNuevaFechaManual('');
    setShowNuevoTaller(false);
    setNuevoTallerNombre('');
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
      tallerId: turno.tallerId ?? '',
      usarFechasManuales: turno.usarFechasManuales ?? false,
    });
    setFechasManuales(turno.fechasManuales || []);
    setShowForm(true);
  };

  const handleCrearTaller = async () => {
    if (!nuevoTallerNombre.trim()) return;
    try {
      const response = await talleresService.create({ nombre: nuevoTallerNombre.trim() });
      const nuevoTaller = response.data;
      await fetchTalleres();
      setFormData(prev => ({ ...prev, tallerId: nuevoTaller.id }));
      setNuevoTallerNombre('');
      setShowNuevoTaller(false);
      showToast(`Taller "${nuevoTaller.nombre}" creado`, 'success');
    } catch (error) {
      console.error('Error al crear taller:', error);
      showToast('Error al crear el taller', 'error');
    }
  };

  const handleAddFechaManual = async () => {
    if (!nuevaFechaManual || !editingTurno) return;
    try {
      const response = await turnosService.addFechaManual(editingTurno.id, nuevaFechaManual);
      setFechasManuales(prev => [...prev, response.data].sort((a, b) => new Date(a.fecha) - new Date(b.fecha)));
      setNuevaFechaManual('');
      fetchTurnos();
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al agregar la fecha';
      showToast(msg, 'error');
    }
  };

  const handleDeleteFechaManual = async (fechaId) => {
    if (!editingTurno) return;
    try {
      await turnosService.deleteFechaManual(editingTurno.id, fechaId);
      setFechasManuales(prev => prev.filter(f => f.id !== fechaId));
      fetchTurnos();
    } catch (error) {
      showToast('Error al eliminar la fecha', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const diaSemana = parseInt(formData.diaSemana);
    const horaInicio = formData.horaInicio;

    if (!editingTurno) {
      const turnoExistente = checkConflict(diaSemana, horaInicio);
      if (turnoExistente) {
        setConflictModal({ turnoExistente, nuevosDatos: { ...formData } });
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
        tallerId: formData.tallerId !== '' ? parseInt(formData.tallerId) : null,
        usarFechasManuales: formData.usarFechasManuales,
      };

      if (editingTurno) {
        await turnosService.update(editingTurno.id, {
          id: editingTurno.id,
          ...turnoData,
          activo: true,
        });
        showToast('Clase actualizada exitosamente', 'success');
      } else {
        await turnosService.create(turnoData);
        if (turnoData.usarFechasManuales) {
          showToast('Clase creada. Editala para agregar las fechas manuales.', 'success');
        } else {
          showToast('Clase creada exitosamente', 'success');
        }
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
  };

  const handleCrearIgual = () => {
    setConflictModal(null);
    saveTurno();
  };

  const handleToggleRecuperacion = async (tallerId, tallerPermitidoId, habilitado) => {
    try {
      if (habilitado) {
        await talleresService.addRecuperacionPermitida(tallerId, tallerPermitidoId);
      } else {
        await talleresService.deleteRecuperacionPermitida(tallerId, tallerPermitidoId);
      }
      const response = await talleresService.getAll();
      const talleresActualizados = response.data || [];
      setTalleres(talleresActualizados);
      // Actualizar el taller del modal con los datos frescos
      const tallerActualizado = talleresActualizados.find(t => t.id === tallerId);
      if (tallerActualizado) setRecuperacionModal({ taller: tallerActualizado });
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al actualizar el permiso';
      showToast(msg, 'error');
    }
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

  const formatFechaManual = (fechaStr) => {
    const d = new Date(fechaStr);
    return d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
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
      fetchTurnos();
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
    if (isAlumnoInClase(alumno.id)) {
      showToast('El alumno ya está inscrito en esta clase', 'error');
      return;
    }
    try {
      const response = await inscripcionesService.create({ alumnoId: alumno.id, turnoId: alumnosModal.id });
      setAlumnosClase(prev => [...prev, {
        ...response.data,
        alumno: { id: alumno.id, nombre: alumno.nombre, apellido: alumno.apellido, email: alumno.email, telefono: alumno.telefono }
      }]);
      showToast(`${alumno.nombre} ${alumno.apellido} agregado a la clase`, 'success');
      fetchTurnos();
    } catch (error) {
      console.error('Error al agregar alumno:', error);
      let errorMsg = 'Error al agregar el alumno';
      if (error.response?.data) {
        const data = error.response.data;
        if (typeof data === 'string') errorMsg = data;
        else if (data.title) errorMsg = data.title;
        else if (data.detail) errorMsg = data.detail;
        else if (data.errors) errorMsg = Object.values(data.errors).flat().join(', ');
      }
      showToast(errorMsg, 'error');
    }
  };

  const isAlumnoInClase = (alumnoId) => alumnosClase.some(i => (i.alumnoId || i.AlumnoId) === alumnoId);

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    border: `1px solid ${colors.gray[300]}`,
    borderRadius: '6px',
    fontSize: '0.875rem',
    outline: 'none',
    boxSizing: 'border-box',
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '16rem' }}>
        <div style={{ color: colors.gray[600], fontSize: '1.125rem' }}>Cargando...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: colors.gray[900] }}>Clases</h2>
        <button
          onClick={() => {
            if (showForm) {
              resetForm();
            } else {
              setEditingTurno(null);
              setFormData({ diaSemana: 1, horaInicio: '09:00', horaFin: '11:00', cuposMaximos: 8, tallerId: '', usarFechasManuales: false });
              setFechasManuales([]);
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
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: colors.gray[900], marginBottom: '1rem' }}>
            {editingTurno ? 'Editar Clase' : 'Nueva Clase'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={labelStyle}>Día de la Semana *</label>
                <select
                  required
                  value={formData.diaSemana}
                  onChange={(e) => setFormData({ ...formData, diaSemana: e.target.value })}
                  style={inputStyle}
                >
                  {diasSemana.map((dia) => (
                    <option key={dia.value} value={dia.value}>{dia.label}</option>
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

            {/* Taller */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Taller</label>
              {showNuevoTaller ? (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Nombre del nuevo taller"
                    value={nuevoTallerNombre}
                    onChange={(e) => setNuevoTallerNombre(e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleCrearTaller}
                    disabled={!nuevoTallerNombre.trim()}
                    style={{
                      backgroundColor: colors.success,
                      color: colors.white,
                      padding: '0.75rem 1rem',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: nuevoTallerNombre.trim() ? 'pointer' : 'not-allowed',
                      fontWeight: '500',
                      fontSize: '0.875rem',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Crear
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowNuevoTaller(false); setNuevoTallerNombre(''); }}
                    style={{
                      backgroundColor: colors.gray[100],
                      color: colors.gray[700],
                      padding: '0.75rem 1rem',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select
                    value={formData.tallerId}
                    onChange={(e) => setFormData({ ...formData, tallerId: e.target.value })}
                    style={{ ...inputStyle, flex: 1 }}
                  >
                    <option value="">— Sin taller —</option>
                    {talleres.filter(t => t.activo).map(t => (
                      <option key={t.id} value={t.id}>{t.nombre}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNuevoTaller(true)}
                    title="Crear nuevo taller"
                    style={{
                      backgroundColor: colors.gray[100],
                      color: colors.gray[700],
                      padding: '0.75rem',
                      borderRadius: '6px',
                      border: `1px solid ${colors.gray[300]}`,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Fechas manuales toggle */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: 0 }}>
                <input
                  type="checkbox"
                  checked={formData.usarFechasManuales}
                  onChange={(e) => setFormData({ ...formData, usarFechasManuales: e.target.checked })}
                  style={{ width: 'auto', cursor: 'pointer' }}
                />
                Usar fechas manuales (para grupos sábados A/B u horarios irregulares)
              </label>
            </div>

            {/* Gestión de fechas manuales (solo al editar) */}
            {formData.usarFechasManuales && editingTurno && (
              <div style={{
                backgroundColor: colors.gray[50],
                border: `1px solid ${colors.gray[200]}`,
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1.5rem'
              }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: colors.gray[800], marginBottom: '0.75rem' }}>
                  Fechas de clase
                </h4>

                {/* Agregar nueva fecha */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <input
                    type="date"
                    value={nuevaFechaManual}
                    onChange={(e) => setNuevaFechaManual(e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={handleAddFechaManual}
                    disabled={!nuevaFechaManual}
                    style={{
                      backgroundColor: colors.primary,
                      color: colors.white,
                      padding: '0.75rem 1rem',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: nuevaFechaManual ? 'pointer' : 'not-allowed',
                      fontWeight: '500',
                      fontSize: '0.875rem',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Agregar
                  </button>
                </div>

                {/* Lista de fechas */}
                {fechasManuales.length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: colors.gray[500], textAlign: 'center', padding: '0.5rem 0' }}>
                    No hay fechas cargadas. Agregá las fechas en que se dictará esta clase.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', maxHeight: '180px', overflowY: 'auto' }}>
                    {fechasManuales.map(f => (
                      <div key={f.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.5rem 0.75rem',
                        backgroundColor: colors.white,
                        borderRadius: '6px',
                        border: `1px solid ${colors.gray[200]}`,
                        fontSize: '0.875rem',
                        color: colors.gray[800],
                      }}>
                        <span>{formatFechaManual(f.fecha)}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteFechaManual(f.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: colors.error,
                            padding: '0.125rem',
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {formData.usarFechasManuales && !editingTurno && (
              <p style={{ fontSize: '0.8rem', color: colors.gray[500], marginBottom: '1rem', fontStyle: 'italic' }}>
                Guardá la clase y luego editala para cargar las fechas manuales.
              </p>
            )}

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
            <h3 style={{ marginTop: '0.75rem', fontSize: '0.875rem', fontWeight: '500', color: colors.gray[900] }}>
              No hay clases
            </h3>
            <p style={{ marginTop: '0.25rem', fontSize: '0.875rem', color: colors.gray[500] }}>
              Comienza agregando una nueva clase.
            </p>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {turnos.map((turno) => (
            <Card key={turno.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: colors.gray[900] }}>
                    {getDiaSemanaLabel(turno.diaSemana)}
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: colors.gray[600], marginTop: '0.25rem' }}>
                    {turno.horaInicio} - {turno.horaFin}
                  </p>
                  {turno.tallerNombre && (
                    <span style={{
                      display: 'inline-block',
                      marginTop: '0.375rem',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      color: colors.primary,
                      backgroundColor: colors.primary + '18',
                      padding: '0.125rem 0.5rem',
                      borderRadius: '999px',
                    }}>
                      {turno.tallerNombre}
                    </span>
                  )}
                  {turno.usarFechasManuales && (
                    <span style={{
                      display: 'inline-block',
                      marginTop: '0.375rem',
                      marginLeft: turno.tallerNombre ? '0.25rem' : 0,
                      fontSize: '0.7rem',
                      color: colors.gray[500],
                      backgroundColor: colors.gray[100],
                      padding: '0.125rem 0.5rem',
                      borderRadius: '999px',
                    }}>
                      fechas manuales
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => openAlumnosModal(turno)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.success, padding: '0.25rem' }}
                    title="Ver alumnos"
                  >
                    <Users size={18} />
                  </button>
                  <button
                    onClick={() => handleEdit(turno)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.primary, padding: '0.25rem' }}
                    title="Editar clase"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(turno.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.error, padding: '0.25rem' }}
                    title="Eliminar clase"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  <span style={{ color: colors.gray[600] }}>Cupos:</span>
                  <span style={{ fontWeight: '500', color: colors.gray[900] }}>
                    {turno.cuposOcupados || 0} / {turno.cuposMaximos}
                  </span>
                </div>
                <div style={{ width: '100%', backgroundColor: colors.gray[200], borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
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
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: colors.white, borderRadius: '12px', padding: '1.5rem',
            maxWidth: '500px', width: '90%', maxHeight: '80vh', overflow: 'hidden',
            display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: colors.gray[900] }}>
                Alumnos - {getDiaSemanaLabel(alumnosModal.diaSemana)} {alumnosModal.horaInicio}
              </h3>
              <button onClick={closeAlumnosModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.gray[500], padding: '0.25rem' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {showAddAlumnos ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                    <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: colors.gray[400] }} />
                    <input
                      type="text"
                      placeholder="Buscar alumno..."
                      value={searchAlumno}
                      onChange={(e) => setSearchAlumno(e.target.value)}
                      style={{ width: '100%', padding: '0.625rem 0.75rem 0.625rem 2.5rem', border: `1px solid ${colors.gray[300]}`, borderRadius: '6px', fontSize: '0.875rem', outline: 'none' }}
                    />
                  </div>
                  {allAlumnos.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: colors.gray[500] }}>Cargando alumnos...</div>
                  ) : (
                    allAlumnos
                      .filter(alumno => {
                        if (!searchAlumno) return true;
                        const search = searchAlumno.toLowerCase();
                        return alumno.nombre.toLowerCase().includes(search) || alumno.apellido.toLowerCase().includes(search) || alumno.email.toLowerCase().includes(search);
                      })
                      .map((alumno) => {
                        const yaInscrito = isAlumnoInClase(alumno.id);
                        return (
                          <div
                            key={alumno.id}
                            onClick={() => !yaInscrito && addAlumnoToClase(alumno)}
                            style={{
                              padding: '0.75rem 1rem', backgroundColor: yaInscrito ? colors.primary + '10' : colors.gray[50],
                              borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              cursor: yaInscrito ? 'default' : 'pointer',
                              border: yaInscrito ? `2px solid ${colors.primary}` : '2px solid transparent',
                              opacity: yaInscrito ? 0.7 : 1
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: '500', color: colors.gray[900] }}>{alumno.nombre} {alumno.apellido}</div>
                              <div style={{ fontSize: '0.75rem', color: colors.gray[500] }}>{alumno.email}</div>
                            </div>
                            {yaInscrito ? <Check size={20} style={{ color: colors.primary }} /> : <UserPlus size={20} style={{ color: colors.success }} />}
                          </div>
                        );
                      })
                  )}
                </div>
              ) : loadingAlumnos ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: colors.gray[500] }}>Cargando alumnos...</div>
              ) : alumnosClase.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: colors.gray[500] }}>
                  <Users size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                  <p>No hay alumnos inscriptos en esta clase</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {alumnosClase.map((inscripcion) => {
                    const telefono = inscripcion.alumno?.telefono;
                    const telefonoLimpio = telefono ? telefono.replace(/\D/g, '') : '';
                    return (
                      <div key={inscripcion.id} style={{
                        padding: '0.75rem 1rem', backgroundColor: colors.gray[50], borderRadius: '8px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}>
                        <div>
                          <div style={{ fontWeight: '500', color: colors.gray[900] }}>
                            {inscripcion.alumno?.nombre} {inscripcion.alumno?.apellido}
                          </div>
                          {telefono && <div style={{ fontSize: '0.75rem', color: colors.gray[500] }}>{telefono}</div>}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          {telefonoLimpio && (
                            <a
                              href={`https://wa.me/${telefonoLimpio}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', backgroundColor: '#25D366', borderRadius: '6px', color: 'white', textDecoration: 'none' }}
                              title="Enviar WhatsApp"
                            >
                              <MessageCircle size={18} />
                            </a>
                          )}
                          <button
                            onClick={() => removeAlumnoFromClase(inscripcion.id)}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', backgroundColor: colors.error + '15', borderRadius: '6px', color: colors.error, border: 'none', cursor: 'pointer' }}
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

            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid ${colors.gray[200]}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: colors.gray[600] }}>
                Total: {alumnosClase.length} alumno{alumnosClase.length !== 1 ? 's' : ''}
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {showAddAlumnos ? (
                  <button onClick={() => setShowAddAlumnos(false)} style={{ backgroundColor: colors.gray[100], color: colors.gray[700], padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}>
                    Volver
                  </button>
                ) : (
                  <>
                    <button
                      onClick={openAddAlumnos}
                      style={{ backgroundColor: colors.success, color: colors.white, padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      <UserPlus size={16} />
                      Agregar Alumnos
                    </button>
                    <button onClick={closeAlumnosModal} style={{ backgroundColor: colors.gray[100], color: colors.gray[700], padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}>
                      Cerrar
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sección de Talleres */}
      {talleres.filter(t => t.activo).length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: colors.gray[900], marginBottom: '1rem' }}>
            Talleres
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
            {talleres.filter(t => t.activo).map(taller => {
              const permiten = (taller.talleresRecuperacionPermitidos || []);
              const nombresPermitidos = permiten
                .map(pid => talleres.find(t => t.id === pid)?.nombre)
                .filter(Boolean);
              return (
                <Card key={taller.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: '600', color: colors.gray[900], fontSize: '0.9375rem' }}>
                        {taller.nombre}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: colors.gray[500], marginTop: '0.25rem' }}>
                        {taller.cantidadTurnos} clase{taller.cantidadTurnos !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <button
                      onClick={() => setRecuperacionModal({ taller })}
                      title="Configurar recuperaciones cruzadas"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.gray[500], padding: '0.25rem' }}
                    >
                      <Settings size={17} />
                    </button>
                  </div>
                  {nombresPermitidos.length > 0 && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <div style={{ fontSize: '0.75rem', color: colors.gray[500], marginBottom: '0.375rem' }}>
                        También puede recuperar en:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                        {nombresPermitidos.map(nombre => (
                          <span key={nombre} style={{
                            fontSize: '0.75rem', fontWeight: '500',
                            color: colors.primary, backgroundColor: colors.primary + '18',
                            padding: '0.125rem 0.5rem', borderRadius: '999px',
                          }}>
                            {nombre}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal de Configuración de Recuperaciones */}
      {recuperacionModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: colors.white, borderRadius: '12px', padding: '1.5rem',
            maxWidth: '420px', width: '90%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: colors.gray[900] }}>
                Recuperaciones — {recuperacionModal.taller.nombre}
              </h3>
              <button
                onClick={() => setRecuperacionModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.gray[500] }}
              >
                <X size={20} />
              </button>
            </div>
            <p style={{ fontSize: '0.8rem', color: colors.gray[500], marginBottom: '1.25rem' }}>
              Los alumnos de <strong>{recuperacionModal.taller.nombre}</strong> siempre pueden recuperar en sus propias clases.
              Habilitá otros talleres donde también puedan recuperar.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {talleres.filter(t => t.activo && t.id !== recuperacionModal.taller.id).map(otroTaller => {
                const habilitado = (recuperacionModal.taller.talleresRecuperacionPermitidos || []).includes(otroTaller.id);
                return (
                  <label key={otroTaller.id} style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    backgroundColor: habilitado ? colors.primary + '10' : colors.gray[50],
                    border: `1px solid ${habilitado ? colors.primary + '40' : colors.gray[200]}`,
                    borderRadius: '8px', cursor: 'pointer',
                  }}>
                    <input
                      type="checkbox"
                      checked={habilitado}
                      onChange={(e) => handleToggleRecuperacion(
                        recuperacionModal.taller.id,
                        otroTaller.id,
                        e.target.checked
                      )}
                      style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: colors.primary }}
                    />
                    <span style={{ fontSize: '0.875rem', fontWeight: '500', color: colors.gray[800] }}>
                      {otroTaller.nombre}
                    </span>
                  </label>
                );
              })}
              {talleres.filter(t => t.activo && t.id !== recuperacionModal.taller.id).length === 0 && (
                <p style={{ fontSize: '0.875rem', color: colors.gray[500], textAlign: 'center', padding: '1rem 0' }}>
                  No hay otros talleres disponibles.
                </p>
              )}
            </div>
            <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setRecuperacionModal(null)}
                style={{
                  backgroundColor: colors.gray[100], color: colors.gray[700],
                  padding: '0.5rem 1.25rem', borderRadius: '6px',
                  border: 'none', cursor: 'pointer', fontSize: '0.875rem',
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Conflicto */}
      {conflictModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: colors.white, borderRadius: '12px', padding: '1.5rem', maxWidth: '450px', width: '90%', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: colors.gray[900], marginBottom: '1rem' }}>
              Clase existente encontrada
            </h3>
            <p style={{ color: colors.gray[600], marginBottom: '1rem', fontSize: '0.875rem' }}>
              Ya existe una clase para el <strong>{getDiaSemanaLabel(conflictModal.turnoExistente.diaSemana)}</strong> a las <strong>{conflictModal.turnoExistente.horaInicio}</strong>.
            </p>
            <p style={{ color: colors.gray[600], marginBottom: '1.5rem', fontSize: '0.875rem' }}>¿Qué deseas hacer?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button onClick={handleEditExisting} style={{ backgroundColor: colors.primary, color: colors.white, padding: '0.75rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '500', fontSize: '0.875rem' }}>
                Editar clase existente
              </button>
              {/* Mostrar "Crear de todas formas" cuando el taller es diferente o la nueva usa fechas manuales */}
              {(String(conflictModal.turnoExistente.tallerId ?? '') !== String(formData.tallerId) || formData.usarFechasManuales) && (
                <button onClick={handleCrearIgual} style={{ backgroundColor: colors.success, color: colors.white, padding: '0.75rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '500', fontSize: '0.875rem' }}>
                  Crear de todas formas
                </button>
              )}
              <button onClick={handleChangeNewData} style={{ backgroundColor: colors.white, color: colors.gray[700], padding: '0.75rem 1rem', borderRadius: '6px', border: `1px solid ${colors.gray[300]}`, cursor: 'pointer', fontWeight: '500', fontSize: '0.875rem' }}>
                Cambiar datos de la nueva clase
              </button>
              <button onClick={() => setConflictModal(null)} style={{ backgroundColor: 'transparent', color: colors.gray[500], padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default Turnos;
