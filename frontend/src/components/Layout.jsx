import { Outlet } from 'react-router-dom';
import Header from './Header';
import Navigation from './Navigation';
import { colors } from '../styles/colors';

function Layout() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: colors.gray[50],
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <Header />
      <Navigation />
      <main style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: '2rem'
      }}>
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
