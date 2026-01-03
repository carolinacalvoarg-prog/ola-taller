import { useState, useEffect } from 'react';
import { Calendar, UserCheck, Clock, CreditCard, FileText } from 'lucide-react';
import Card from '../components/Card';
import { colors } from '../styles/colors';
import { turnosService, inscripcionesService } from '../services/api';

function PortalAlumno() {
  const [alumnoData] = useState({
    nombre: 'María González',
    claseSemanal: {
      dia: 'Miércoles',
      hora: '18:00',
      profesor: 'Ana López'
    },
    pagos: {
      estado: 'Al día',
      proximoVencimiento: '05/02/2025',
      monto: '$15.000'
    },
    clasesRecuperar: 2
  });

  const [turnos, setTurnos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTurnos();
  }, []);

  const fetchTurnos = async () => {
    try {
      setLoading(true);
      const response = await turnosService.getAll();
      setTurnos(response.data);
    } catch (error) {
      console.error('Error al cargar turnos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDiaSemana = (dia) => {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return dias[dia];
  };

  return (
    <div>
      <h2 style={{ 
        fontSize: '1.5rem', 
        fontWeight: '600', 
        marginBottom: '1.5rem', 
        color: colors.gray[900] 
      }}>
        Mi Panel
      </h2>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '1.5rem' 
      }}>
        {/* Mi Clase Semanal */}
        <Card title="Mi Clase Semanal">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={18} style={{ color: colors.primary }} />
              <span style={{ fontWeight: '600' }}>{alumnoData.claseSemanal.dia}</span>
              <span style={{ color: colors.gray[600] }}>a las {alumnoData.claseSemanal.hora}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserCheck size={18} style={{ color: colors.primary }} />
              <span style={{ color: colors.gray[600] }}>Profesora: {alumnoData.claseSemanal.profesor}</span>
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
              <button style={{
                flex: 1,
                padding: '0.5rem',
                backgroundColor: colors.error,
                color: colors.white,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}>
                Cancelar Turno
              </button>
              <button style={{
                flex: 1,
                padding: '0.5rem',
                backgroundColor: colors.primary,
                color: colors.white,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}>
                Reprogramar
              </button>
            </div>
          </div>
        </Card>

        {/* Estado de Pagos */}
        <Card title="Estado de Pagos">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ 
              display: 'inline-flex',
              padding: '0.25rem 0.75rem',
              backgroundColor: colors.success + '20',
              color: colors.success,
              borderRadius: '999px',
              fontSize: '0.875rem',
              fontWeight: '600',
              alignSelf: 'flex-start'
            }}>
              {alumnoData.pagos.estado}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
              <Clock size={18} style={{ color: colors.gray[400] }} />
              <span style={{ color: colors.gray[600], fontSize: '0.875rem' }}>
                Próximo vencimiento: {alumnoData.pagos.proximoVencimiento}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CreditCard size={18} style={{ color: colors.gray[400] }} />
              <span style={{ color: colors.gray[900], fontSize: '1.125rem', fontWeight: '600' }}>
                {alumnoData.pagos.monto}
              </span>
            </div>
          </div>
        </Card>

        {/* Clases a Recuperar */}
        <Card title="Clases a Recuperar">
          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{ 
              fontSize: '3rem', 
              fontWeight: '700', 
              color: colors.primary,
              marginBottom: '0.5rem'
            }}>
              {alumnoData.clasesRecuperar}
            </div>
            <div style={{ color: colors.gray[600], fontSize: '0.875rem' }}>
              clases disponibles
            </div>
            <button style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              backgroundColor: colors.primary,
              color: colors.white,
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}>
              Ver Turnos Disponibles
            </button>
          </div>
        </Card>
      </div>

      {/* Turnos Disponibles */}
      <div style={{ marginTop: '2rem' }}>
        <h3 style={{ 
          fontSize: '1.25rem', 
          fontWeight: '600', 
          marginBottom: '1rem',
          color: colors.gray[900]
        }}>
          Turnos Disponibles para Recuperar
        </h3>
        
        {loading ? (
          <Card>
            <div style={{ textAlign: 'center', color: colors.gray[600] }}>
              Cargando turnos...
            </div>
          </Card>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {turnos.filter(turno => (turno.cuposDisponibles || 0) > 0).map((turno) => (
              <Card key={turno.id}>
                <div style={{ 
                  padding: '1rem',
                  borderLeft: `4px solid ${colors.primary}`,
                  cursor: 'pointer'
                }}>
                  <div style={{ fontWeight: '600', color: colors.gray[900], marginBottom: '0.5rem' }}>
                    {getDiaSemana(turno.diaSemana)}
                  </div>
                  <div style={{ color: colors.gray[600], fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                    {turno.horaInicio} - {turno.horaFin}
                  </div>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: turno.cuposDisponibles > 3 ? colors.success : colors.warning,
                    fontWeight: '500'
                  }}>
                    {turno.cuposDisponibles || 0} cupos disponibles
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Historial de Pagos */}
      <div style={{ marginTop: '2rem' }}>
        <Card title="Historial de Pagos">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { fecha: 'Enero 2025', monto: '$15.000', estado: 'Pagado', metodo: 'Transferencia' },
              { fecha: 'Diciembre 2024', monto: '$15.000', estado: 'Pagado', metodo: 'Efectivo' },
              { fecha: 'Noviembre 2024', monto: '$15.000', estado: 'Pagado', metodo: 'Transferencia' }
            ].map((pago, idx) => (
              <div key={idx} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem',
                backgroundColor: colors.gray[50],
                borderRadius: '6px'
              }}>
                <div>
                  <div style={{ fontWeight: '500', color: colors.gray[900] }}>{pago.fecha}</div>
                  <div style={{ fontSize: '0.875rem', color: colors.gray[600], marginTop: '0.25rem' }}>
                    {pago.metodo}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '600', color: colors.gray[900] }}>{pago.monto}</div>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: colors.success,
                    marginTop: '0.25rem',
                    fontWeight: '500'
                  }}>
                    {pago.estado}
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

export default PortalAlumno;
