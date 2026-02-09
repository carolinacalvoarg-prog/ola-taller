# RESUMEN EJECUTIVO - ELA TALLER

---

## COMANDOS RAPIDOS

### Iniciar todo (desarrollo con SQLite):

```bash
# Terminal 1 - Backend
cd backend/OlaAPI
export ASPNETCORE_ENVIRONMENT=Development
dotnet run

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Iniciar todo (produccion con PostgreSQL):

```bash
# Terminal 1 - PostgreSQL
docker start postgres-ola

# Terminal 2 - Backend
cd backend/OlaAPI
dotnet run

# Terminal 3 - Frontend
cd frontend
npm run dev
```

### URLs importantes:

- Frontend: http://localhost:5173
- Backend: http://localhost:5001
- Swagger: http://localhost:5001/swagger

---

## ESTADO ACTUAL

### Funcionando:
- Sistema de login y autenticacion por roles (Admin, Profesor, Alumno)
- Backend con API REST completa (8 controllers, 40+ endpoints)
- Base de datos SQLite (dev) y PostgreSQL (prod)
- Frontend con rutas protegidas por rol
- Portal del Alumno (clases, cancelacion, recuperacion)
- Calendario interactivo (vista mensual, acciones inline)
- Portal del Profesor (marcar asistencia, historial)
- Panel de Administracion (dashboard, actividades, configuracion)
- Gestion de Alumnas (CRUD, busqueda, paginacion, detalle con tabs)
- Gestion de Turnos (CRUD, asignar profesor, inscribir alumnas)
- Sistema de cancelacion y recuperacion de clases
- Gestion de dias sin clase (feriados)
- Log de actividades del sistema
- Configuracion dinamica del sistema

### Pendiente:
- Modulo de pagos completo
- Integracion con MercadoPago
- Notificaciones por email/WhatsApp
- Reportes exportables (PDF, Excel)
- Lista de espera automatica

---

## CARACTERISTICAS CLAVE

- **Colores:** #B67B5F (terracota del logo)
- **Backend:** .NET Core 8.0 + SQLite/PostgreSQL
- **Frontend:** React 18 + Vite (sin Tailwind, estilos inline)
- **Autenticacion:** Login por email/password con roles
- **Password por defecto:** "olataller"

---

## ARCHIVOS CLAVE

**Backend:**
- `backend/OlaAPI/Controllers/` - 8 controllers con endpoints REST
- `backend/OlaCore/Models/` - 11 modelos de dominio
- `backend/OlaInfrastructure/Data/OlaDbContext.cs` - EF Context

**Frontend:**
- `frontend/src/pages/` - 8 paginas (Login, PortalAlumno, Calendario, PortalProfesor, Administracion, Alumnos, AlumnoDetalle, Turnos)
- `frontend/src/components/` - 6 componentes (Header, Navigation, Layout, Card, ProtectedRoute, Toast)
- `frontend/src/services/api.js` - Cliente API con 7 servicios
- `frontend/src/context/AuthContext.jsx` - Contexto de autenticacion
- `frontend/src/styles/colors.js` - Paleta de colores del logo

---

## INFORMACION TECNICA

### Base de Datos (Desarrollo):
```
SQLite: backend/OlaAPI/olataller.db
```

### Base de Datos (Produccion):
```
Host: localhost:5432
Database: olataller
User: postgres
Password: ola2024
Container: postgres-ola
```

### Modelos principales:
- Alumno (id, nombre, apellido, email, telefono, fechaNacimiento, clasesPendientesRecuperar)
- Profesor (id, nombre, apellido, email, telefono)
- Turno (id, diaSemana, horaInicio, horaFin, cuposMaximos, profesorId)
- Inscripcion (id, alumnoId, turnoId, activa)
- AusenciaProgramada (id, inscripcionId, fecha)
- Asistencia (id, alumnoId, turnoId, fecha, presente)
- Actividad (id, tipo, alumnoId, turnoId, fecha)
- DiaSinClase (id, fecha, motivo)
- Usuario (id, email, passwordHash, rol, alumnoId, profesorId)
- Pago (id, alumnoId, monto, estado, metodoPago)
- ConfiguracionSistema (id, clave, valor, descripcion)

### Rutas del frontend:
```
/login              → Login (publica)
/portal-alumno      → Portal Alumno (Admin, Alumno)
/calendario         → Calendario interactivo (Admin, Alumno)
/portal-profesor    → Portal Profesor (Admin, Profesor)
/administracion     → Panel Admin (Admin)
/alumnos            → Gestion de alumnas (Admin)
/alumnos/:id        → Detalle de alumna (Admin)
/turnos             → Gestion de turnos (Admin)
```

---

## SISTEMA DE CANCELACION Y RECUPERACION

- Las alumnas pueden cancelar clases futuras (con horas de anticipacion configurables)
- Al cancelar se incrementa el contador de clases a recuperar
- Pueden inscribirse en turnos con cupo disponible para recuperar
- Todo queda registrado en el log de actividades
- Configurable desde: Panel Admin → Configuracion del Sistema

---

## RECORDATORIOS IMPORTANTES

1. **Backend** debe estar en modo Development para ver Swagger
2. **CORS** esta configurado para localhost:5173
3. **Los cambios** en modelos requieren nueva migracion EF
4. **lucide-react** se usa para los iconos
5. **Sin Tailwind CSS** - todo con estilos inline
6. **Usuarios nuevos** se crean automaticamente al crear alumna o profesor

---

**Fecha creacion:** 26/12/2024
**Ultima actualizacion:** 09/02/2026
**Version:** 2.0
