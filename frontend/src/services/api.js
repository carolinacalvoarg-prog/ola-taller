import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
  },
});

// Servicios de Alumnos
export const alumnosService = {
  getAll: () => api.get('/alumnos'),
  getById: (id) => api.get(`/alumnos/${id}`),
  create: (alumno) => api.post('/alumnos', alumno),
  update: (id, alumno) => api.put(`/alumnos/${id}`, alumno),
  delete: (id) => api.delete(`/alumnos/${id}`),
};

// Servicios de Turnos
export const turnosService = {
  getAll: () => api.get('/turnos'),
  getAllConFechas: () => api.get('/turnos?incluirFechas=true'),
  getById: (id) => api.get(`/turnos/${id}`),
  getByProfesor: (profesorId) => api.get(`/turnos/profesor/${profesorId}`),
  create: (turno) => api.post('/turnos', turno),
  update: (id, turno) => api.put(`/turnos/${id}`, turno),
  delete: (id) => api.delete(`/turnos/${id}`),
};

// Servicios de Inscripciones
export const inscripcionesService = {
  create: (inscripcion) => api.post('/inscripciones', inscripcion),
  getByAlumno: (alumnoId) => api.get(`/inscripciones/alumno/${alumnoId}`),
  getByTurno: (turnoId) => api.get(`/inscripciones/turno/${turnoId}`),
  getAlumnosPorTurnoYFecha: (turnoId, fecha) => api.get(`/inscripciones/turno/${turnoId}/fecha/${fecha}`),
  cancelar: (id) => api.delete(`/inscripciones/${id}`),
  cancelarProximas: (inscripcionId, cantidad, fecha) => api.post('/inscripciones/cancelar-proximas', { inscripcionId, cantidad, ...(fecha && { fecha }) }),
  inscribirRecuperacion: (inscripcion) => api.post('/inscripciones/recuperacion', inscripcion),
  getRecuperacionesByAlumno: (alumnoId) => api.get(`/inscripciones/alumno/${alumnoId}/recuperaciones`),
  getActividades: (limit = 10) => api.get(`/inscripciones/actividades?limit=${limit}`),
  getActividadesByAlumno: (alumnoId, { limit = 10, tipo = '', fechaDesde = '', fechaHasta = '' } = {}) => {
    let url = `/inscripciones/actividades/alumno/${alumnoId}?limit=${limit}`;
    if (tipo) url += `&tipo=${tipo}`;
    if (fechaDesde) url += `&fechaDesde=${fechaDesde}`;
    if (fechaHasta) url += `&fechaHasta=${fechaHasta}`;
    return api.get(url);
  },
};

// Servicios de Asistencias
export const asistenciasService = {
  create: (asistencia) => api.post('/asistencias', asistencia),
  marcarMultiple: (asistencias) => api.post('/asistencias/marcar-multiple', asistencias),
  getByTurnoYFecha: (turnoId, fecha) => api.get(`/asistencias/turno/${turnoId}?fecha=${fecha}`),
  getByAlumno: (alumnoId) => api.get(`/asistencias/alumno/${alumnoId}`),
  getReporte: (alumnoId) => api.get(`/asistencias/reporte/alumno/${alumnoId}`),
  getHistorialByTurno: (turnoId) => api.get(`/asistencias/historial/turno/${turnoId}`),
};

// Servicios de Autenticacion
export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  changePassword: (id, newPassword) => api.put(`/auth/change-password/${id}`, { newPassword }),
  getUsuarios: () => api.get('/auth/usuarios'),
};

// Servicios de Configuracion
export const configuracionService = {
  getAll: () => api.get('/configuracion'),
  get: (clave) => api.get(`/configuracion/${clave}`),
  update: (clave, valor) => api.put(`/configuracion/${clave}`, { valor }),
};

// Servicios de Días sin clase (feriados, etc.)
export const diasSinClaseService = {
  getByMes: (anio, mes) => api.get(`/diassinclase?anio=${anio}&mes=${mes}`),
  create: (dia) => api.post('/diassinclase', dia),
  delete: (id) => api.delete(`/diassinclase/${id}`),
};

export default api;
