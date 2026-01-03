import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import PortalAlumno from './pages/PortalAlumno';
import PortalProfesor from './pages/PortalProfesor';
import Administracion from './pages/Administracion';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/portal-alumno" replace />} />
          <Route path="portal-alumno" element={<PortalAlumno />} />
          <Route path="portal-profesor" element={<PortalProfesor />} />
          <Route path="administracion" element={<Administracion />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
