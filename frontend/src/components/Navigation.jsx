import { Users, UserCheck, Settings } from 'lucide-react';
import { colors } from '../styles/colors';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasRole } = useAuth();

  const allTabs = [
    { id: 'alumno', path: '/portal-alumno', icon: Users, label: 'Portal Alumno', roles: ['Admin', 'Alumno'] },
    { id: 'profesor', path: '/portal-profesor', icon: UserCheck, label: 'Portal Profesor', roles: ['Admin', 'Profesor'] },
    { id: 'admin', path: '/administracion', icon: Settings, label: 'Administracion', roles: ['Admin'] }
  ];

  // Filtrar tabs segun el rol del usuario
  const tabs = allTabs.filter(tab => hasRole(tab.roles));

  return (
    <div style={{
      backgroundColor: colors.gray[100],
      borderBottom: `2px solid ${colors.gray[200]}`,
      padding: '0 2rem'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        gap: '2rem'
      }}>
        {tabs.map(tab => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '1rem 0',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: isActive ? `3px solid ${colors.primary}` : '3px solid transparent',
                color: isActive ? colors.primary : colors.gray[600],
                fontWeight: isActive ? '600' : '400',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default Navigation;
