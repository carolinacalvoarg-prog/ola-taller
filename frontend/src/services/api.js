import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
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
  getById: (id) => api.get(`/turnos/${id}`),
  create: (turno) => api.post('/turnos', turno),
  update: (id, turno) => api.put(`/turnos/${id}`, turno),
  delete: (id) => api.delete(`/turnos/${id}`),
};

// Servicios de Inscripciones
export const inscripcionesService = {
  create: (inscripcion) => api.post('/inscripciones', inscripcion),
  getByAlumno: (alumnoId) => api.get(`/inscripciones/alumno/${alumnoId}`),
  getByTurno: (turnoId) => api.get(`/inscripciones/turno/${turnoId}`),
  cancelar: (id) => api.delete(`/inscripciones/${id}`),
};

// Servicios de Asistencias
export const asistenciasService = {
  create: (asistencia) => api.post('/asistencias', asistencia),
  marcarMultiple: (asistencias) => api.post('/asistencias/marcar-multiple', asistencias),
  getByTurnoYFecha: (turnoId, fecha) => api.get(`/asistencias/turno/${turnoId}?fecha=${fecha}`),
  getByAlumno: (alumnoId) => api.get(`/asistencias/alumno/${alumnoId}`),
  getReporte: (alumnoId) => api.get(`/asistencias/reporte/alumno/${alumnoId}`),
};

export default api;
