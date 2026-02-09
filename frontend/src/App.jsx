import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import PortalAlumno from './pages/PortalAlumno';
import PortalProfesor from './pages/PortalProfesor';
import Administracion from './pages/Administracion';
import Alumnos from './pages/Alumnos';
import AlumnoDetalle from './pages/AlumnoDetalle';
import Turnos from './pages/Turnos';
import Calendario from './pages/Calendario';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Ruta publica */}
          <Route path="/login" element={<Login />} />

          {/* Rutas protegidas */}
          <Route path="/" element={
            <ProtectedRoute allowedRoles={['Admin', 'Alumno', 'Profesor']}>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/portal-alumno" replace />} />

            {/* Portal Alumno - Admin y Alumno */}
            <Route path="portal-alumno" element={
              <ProtectedRoute allowedRoles={['Admin', 'Alumno']}>
                <PortalAlumno />
              </ProtectedRoute>
            } />

            {/* Portal Profesor - Admin y Profesor */}
            <Route path="portal-profesor" element={
              <ProtectedRoute allowedRoles={['Admin', 'Profesor']}>
                <PortalProfesor />
              </ProtectedRoute>
            } />

            {/* Administracion - Solo Admin */}
            <Route path="administracion" element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <Administracion />
              </ProtectedRoute>
            } />

            <Route path="alumnos" element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <Alumnos />
              </ProtectedRoute>
            } />

            <Route path="alumnos/:id" element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <AlumnoDetalle />
              </ProtectedRoute>
            } />

            <Route path="turnos" element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <Turnos />
              </ProtectedRoute>
            } />

            <Route path="calendario" element={
              <ProtectedRoute allowedRoles={['Admin', 'Alumno']}>
                <Calendario />
              </ProtectedRoute>
            } />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
