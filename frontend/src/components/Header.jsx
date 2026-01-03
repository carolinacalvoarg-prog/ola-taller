import { Bell, LogOut } from 'lucide-react';
import { colors } from '../styles/colors';

function Header({ userName = 'Usuario' }) {
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
          <Bell size={20} style={{ cursor: 'pointer' }} />
          <div style={{ fontSize: '0.9rem' }}>{userName}</div>
          <LogOut size={20} style={{ cursor: 'pointer' }} />
        </div>
      </div>
    </header>
  );
}

export default Header;
