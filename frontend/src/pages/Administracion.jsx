import { useState, useEffect } from 'react';
import { Users, Calendar, CreditCard, Clock } from 'lucide-react';
import Card from '../components/Card';
import { colors } from '../styles/colors';
import { alumnosService, turnosService } from '../services/api';

function Administracion() {
  const [stats, setStats] = useState({
    totalAlumnos: 0,
    clasesHoy: 0,
    pagosPendientes: 0,
    turnosDisponibles: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [alumnosResponse, turnosResponse] = await Promise.all([
        alumnosService.getAll(),
        turnosService.getAll()
      ]);

      setStats({
        totalAlumnos: alumnosResponse.data.length,
        clasesHoy: 6, // TODO: Calcular las clases de hoy
        pagosPendientes: 12, // TODO: Obtener de la API
        turnosDisponibles: turnosResponse.data.filter(t => (t.cuposDisponibles || 0) > 0).length
      });
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  };

  const statsData = [
    { label: 'Total Alumnos', value: stats.totalAlumnos, icon: Users, color: colors.primary },
    { label: 'Clases Hoy', value: stats.clasesHoy, icon: Calendar, color: colors.success },
    { label: 'Pagos Pendientes', value: stats.pagosPendientes, icon: CreditCard, color: colors.warning },
    { label: 'Turnos Disponibles', value: stats.turnosDisponibles, icon: Clock, color: colors.primary }
  ];

  const notificaciones = [
    { texto: 'María González canceló su clase del Miércoles 18:00', tiempo: 'Hace 2 horas' },
    { texto: 'Juan Pérez se inscribió en Lunes 10:00', tiempo: 'Hace 5 horas' },
    { texto: 'Pago recibido de Laura Martínez', tiempo: 'Hace 1 día' }
  ];

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
            <button style={{
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
              Nuevo Alumno
            </button>
            <button style={{
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
              Crear Turno
            </button>
            <button style={{
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
              <CreditCard size={18} />
              Registrar Pago
            </button>
          </div>
        </Card>

        {/* Últimas Notificaciones */}
        <Card title="Últimas Notificaciones">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {notificaciones.map((notif, idx) => (
              <div key={idx} style={{ 
                fontSize: '0.875rem',
                paddingBottom: '0.75rem',
                borderBottom: idx < notificaciones.length - 1 ? `1px solid ${colors.gray[200]}` : 'none'
              }}>
                <div style={{ color: colors.gray[900] }}>{notif.texto}</div>
                <div style={{ 
                  color: colors.gray[500], 
                  fontSize: '0.75rem', 
                  marginTop: '0.25rem' 
                }}>
                  {notif.tiempo}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Listado de Alumnos */}
      <div style={{ marginTop: '2rem' }}>
        <Card title="Alumnos Recientes">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { nombre: 'María González', email: 'maria@example.com', estado: 'Activo', pago: 'Al día' },
              { nombre: 'Juan Pérez', email: 'juan@example.com', estado: 'Activo', pago: 'Al día' },
              { nombre: 'Laura Martínez', email: 'laura@example.com', estado: 'Activo', pago: 'Pendiente' },
              { nombre: 'Carlos Rodríguez', email: 'carlos@example.com', estado: 'Activo', pago: 'Al día' }
            ].map((alumno, idx) => (
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
                    {alumno.nombre}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: colors.gray[600], marginTop: '0.25rem' }}>
                    {alumno.email}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{
                    padding: '0.25rem 0.75rem',
                    backgroundColor: alumno.pago === 'Al día' ? colors.success + '20' : colors.warning + '20',
                    color: alumno.pago === 'Al día' ? colors.success : colors.warning,
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}>
                    {alumno.pago}
                  </div>
                  <button style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: colors.white,
                    color: colors.primary,
                    border: `1px solid ${colors.primary}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}>
                    Ver Detalle
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default Administracion;
