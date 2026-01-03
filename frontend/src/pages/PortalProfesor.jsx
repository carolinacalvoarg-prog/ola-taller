import { useState, useEffect } from 'react';
import Card from '../components/Card';
import { colors } from '../styles/colors';
import { inscripcionesService, asistenciasService } from '../services/api';

function PortalProfesor() {
  const [asistencias, setAsistencias] = useState({});
  const [alumnosClase] = useState([
    { id: 1, nombre: 'María González', asistencia: null },
    { id: 2, nombre: 'Juan Pérez', asistencia: null },
    { id: 3, nombre: 'Laura Martínez', asistencia: null },
    { id: 4, nombre: 'Carlos Rodríguez', asistencia: null }
  ]);

  const marcarAsistencia = (alumnoId, presente) => {
    setAsistencias(prev => ({
      ...prev,
      [alumnoId]: presente
    }));
  };

  const guardarAsistencias = async () => {
    const asistenciasArray = Object.entries(asistencias).map(([alumnoId, presente]) => ({
      alumnoId: parseInt(alumnoId),
      turnoId: 1, // TODO: Obtener del turno actual
      fecha: new Date().toISOString(),
      presente: presente,
      observaciones: ''
    }));

    try {
      await asistenciasService.marcarMultiple(asistenciasArray);
      alert('Asistencias guardadas correctamente');
    } catch (error) {
      console.error('Error al guardar asistencias:', error);
      alert('Error al guardar las asistencias');
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
        Mi Clase - Miércoles 18:00
      </h2>
      
      <Card title="Lista de Alumnos">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {alumnosClase.map(alumno => (
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
                  {alumno.nombre}
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
                    transition: 'all 0.2s'
                  }}
                >
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
                    transition: 'all 0.2s'
                  }}
                >
                  Ausente
                </button>
              </div>
            </div>
          ))}
        </div>
        <button 
          onClick={guardarAsistencias}
          style={{
            marginTop: '1.5rem',
            width: '100%',
            padding: '0.75rem',
            backgroundColor: colors.primary,
            color: colors.white,
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: '500',
            transition: 'all 0.2s'
          }}
        >
          Guardar Asistencias
        </button>
      </Card>

      {/* Historial de la Clase */}
      <div style={{ marginTop: '2rem' }}>
        <Card title="Historial de Asistencia">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { fecha: '18/12/2024', presentes: 4, ausentes: 0 },
              { fecha: '11/12/2024', presentes: 3, ausentes: 1 },
              { fecha: '04/12/2024', presentes: 4, ausentes: 0 }
            ].map((clase, idx) => (
              <div key={idx} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem',
                backgroundColor: colors.gray[50],
                borderRadius: '6px'
              }}>
                <div>
                  <div style={{ fontWeight: '500', color: colors.gray[900] }}>
                    Clase del {clase.fecha}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem' }}>
                  <div>
                    <span style={{ color: colors.gray[600] }}>Presentes: </span>
                    <span style={{ fontWeight: '600', color: colors.success }}>
                      {clase.presentes}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: colors.gray[600] }}>Ausentes: </span>
                    <span style={{ fontWeight: '600', color: colors.error }}>
                      {clase.ausentes}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default PortalProfesor;
