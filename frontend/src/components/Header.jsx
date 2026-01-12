import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { colors } from '../styles/colors';

function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const displayName = user
    ? (user.nombre ? `${user.nombre} ${user.apellido || ''}`.trim() : user.email)
    : 'Usuario';

  return (
    <header style={{
      backgroundColor: colors.primary,
      color: colors.white,
      padding: '1rem 2rem',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            fontFamily: 'serif',
            fontSize: '1.5rem',
            fontWeight: '300',
            letterSpacing: '0.05em'
          }}>
            Ola TALLER
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ fontSize: '0.9rem' }}>
            {displayName}
            {user?.rol && (
              <span style={{
                marginLeft: '0.5rem',
                fontSize: '0.75rem',
                backgroundColor: 'rgba(255,255,255,0.2)',
                padding: '0.125rem 0.5rem',
                borderRadius: '9999px'
              }}>
                {user.rol}
              </span>
            )}
          </div>
          <button
            onClick={handleLogout}
            title="Cerrar sesion"
            style={{
              background: 'none',
              border: 'none',
              color: colors.white,
              cursor: 'pointer',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
