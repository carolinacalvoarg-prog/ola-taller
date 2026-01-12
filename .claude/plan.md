# Plan: Sistema de Autenticacion de Usuarios

## Resumen
Implementar autenticacion simple con tres roles (Administracion, Alumno, Profesor) usando localStorage para persistir la sesion.

## Decisiones de Diseno
- **Autenticacion**: Simple sin JWT, usuario almacenado en localStorage
- **Creacion de usuarios**: Automatica al crear Alumno o Profesor
- **Password por defecto**: "olataller" para todos los usuarios
- **Roles**: Admin (acceso total), Alumno (portal alumno), Profesor (portal profesor)

## Pasos de Implementacion

### Backend

1. **Crear AuthController** (`Controllers/AuthController.cs`)
   - POST /api/auth/login - validar email/password, retornar usuario con rol
   - PUT /api/auth/change-password - cambiar password (solo admin)

2. **Modificar AlumnosController**
   - En POST (crear alumno): crear Usuario automaticamente con rol "Alumno"
   - En DELETE (soft delete): desactivar Usuario asociado

3. **Modificar ProfesoresController** (si existe, o crear)
   - En POST (crear profesor): crear Usuario automaticamente con rol "Profesor"
   - En DELETE: desactivar Usuario asociado

4. **Crear usuario Admin inicial**
   - Seed en OlaDbContext o migration

### Frontend

5. **Crear AuthContext** (`context/AuthContext.jsx`)
   - Estado: user, isAuthenticated
   - Funciones: login, logout
   - Persistencia en localStorage

6. **Crear pagina Login** (`pages/Login.jsx`)
   - Formulario email/password
   - Redireccion segun rol

7. **Crear ProtectedRoute** (`components/ProtectedRoute.jsx`)
   - Verificar autenticacion
   - Verificar rol permitido
   - Redirigir a login si no autorizado

8. **Actualizar App.jsx**
   - Envolver con AuthProvider
   - Proteger rutas segun rol

9. **Actualizar Header/Layout**
   - Mostrar usuario logueado
   - Boton logout
   - Menu segun rol

10. **Crear pagina Usuarios** (admin)
    - Listar usuarios
    - Cambiar passwords
