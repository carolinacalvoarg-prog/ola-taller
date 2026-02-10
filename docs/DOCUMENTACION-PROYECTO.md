# DOCUMENTACION DEL PROYECTO - ELA TALLER

**Fecha ultima actualizacion:** 9 de Febrero de 2026
**Estado:** Backend completo | Frontend completo | Autenticacion implementada | Calendario interactivo

---

## DESCRIPCION DEL PROYECTO

Aplicacion web para la gestion de turnos, alumnos, asistencias, pagos y recuperacion de clases del taller de ceramica "Ela Taller".

### Tecnologias Utilizadas:
- **Backend:** ASP.NET Core 8.0 (C#)
- **Frontend:** React 18 + Vite
- **Base de Datos:** SQLite (desarrollo) / PostgreSQL 16 (produccion)
- **Contenedor:** Docker (PostgreSQL en produccion)
- **Iconos:** Lucide React
- **Estilos:** CSS inline (sin Tailwind)
- **Autenticacion:** Basada en roles (Admin, Profesor, Alumno)

---

## ESTRUCTURA DEL PROYECTO

```
ola-taller/
├── backend/
│   ├── OlaAPI/                    # Proyecto Web API
│   │   ├── Controllers/           # Endpoints REST
│   │   │   ├── AlumnosController.cs
│   │   │   ├── TurnosController.cs
│   │   │   ├── InscripcionesController.cs
│   │   │   ├── AsistenciasController.cs
│   │   │   ├── AuthController.cs
│   │   │   ├── ConfiguracionController.cs
│   │   │   ├── DiasSinClaseController.cs
│   │   │   └── ProfesoresController.cs
│   │   ├── Program.cs             # Configuracion principal
│   │   ├── appsettings.json       # Cadena de conexion DB
│   │   └── OlaAPI.csproj
│   ├── OlaCore/                   # Modelos de dominio
│   │   ├── Models/
│   │   │   ├── Alumno.cs
│   │   │   ├── Turno.cs
│   │   │   ├── Profesor.cs
│   │   │   ├── Inscripcion.cs
│   │   │   ├── Asistencia.cs
│   │   │   ├── Pago.cs
│   │   │   ├── Usuario.cs
│   │   │   ├── Actividad.cs
│   │   │   ├── AusenciaProgramada.cs
│   │   │   ├── DiaSinClase.cs
│   │   │   └── ConfiguracionSistema.cs
│   │   └── OlaCore.csproj
│   ├── OlaInfrastructure/         # Acceso a datos
│   │   ├── Data/
│   │   │   └── OlaDbContext.cs    # Contexto de Entity Framework
│   │   └── OlaInfrastructure.csproj
│   └── OlaAPI.sln                 # Solucion .NET
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx         # Header con logo y usuario logueado
│   │   │   ├── Navigation.jsx     # Tabs de navegacion por rol
│   │   │   ├── Layout.jsx         # Layout principal
│   │   │   ├── Card.jsx           # Componente tarjeta
│   │   │   ├── ProtectedRoute.jsx # Proteccion de rutas por rol
│   │   │   └── Toast.jsx          # Notificaciones toast
│   │   ├── pages/
│   │   │   ├── Login.jsx          # Pantalla de login
│   │   │   ├── PortalAlumno.jsx   # Vista del alumno (clases y recuperacion)
│   │   │   ├── Calendario.jsx     # Calendario interactivo
│   │   │   ├── PortalProfesor.jsx # Vista del profesor (asistencias)
│   │   │   ├── Administracion.jsx # Panel admin (dashboard y config)
│   │   │   ├── Alumnos.jsx        # CRUD de alumnas
│   │   │   ├── AlumnoDetalle.jsx  # Detalle de alumna con tabs
│   │   │   └── Turnos.jsx         # Gestion de turnos
│   │   ├── context/
│   │   │   └── AuthContext.jsx    # Contexto de autenticacion
│   │   ├── services/
│   │   │   └── api.js             # Cliente axios + todos los servicios
│   │   ├── styles/
│   │   │   └── colors.js          # Paleta de colores del logo
│   │   ├── App.jsx                # Rutas React Router
│   │   ├── main.jsx               # Entry point
│   │   └── index.css              # Estilos base
│   ├── package.json
│   └── vite.config.js
│
└── docs/
    ├── DOCUMENTACION-PROYECTO.md  # Este archivo
    ├── RESUMEN-EJECUTIVO.md       # Resumen ejecutivo
    └── INTEGRACION-IDES.md        # Guia de integracion con IDEs
```

---

## BASE DE DATOS

### Informacion de Conexion (Desarrollo - SQLite):
```
Archivo: backend/OlaAPI/olataller.db
```

### Informacion de Conexion (Produccion - PostgreSQL):
```
Container: postgres-ola
Host: localhost
Puerto: 5432
Base de datos: olataller
Usuario: postgres
Contraseña: ola2024
```

### Tablas:

- **Alumnos** - Informacion de alumnas (incluye clases pendientes de recuperar)
- **Profesores** - Informacion de profesores
- **Turnos** - Horarios de clases
- **Inscripciones** - Relacion alumno-turno
- **AusenciasProgramadas** - Clases canceladas con fecha especifica
- **Asistencias** - Registro de asistencias
- **Actividades** - Log de actividades del sistema
- **Pagos** - Registro de pagos mensuales
- **Usuarios** - Autenticacion con roles
- **ConfiguracionSistema** - Parametros configurables
- **DiasSinClase** - Dias feriados o sin actividad

---

## BACKEND (.NET)

### Puertos:

- **HTTP:** http://localhost:5001
- **Swagger:** http://localhost:5001/swagger (solo en Development)

### Ejecutar Backend:

```bash
cd backend/OlaAPI
export ASPNETCORE_ENVIRONMENT=Development
dotnet run
```

### Endpoints Principales:

#### Alumnos
```
GET    /api/alumnos              # Listar alumnas activas
POST   /api/alumnos              # Crear alumna (auto-crea usuario)
GET    /api/alumnos/{id}         # Obtener alumna con detalles
PUT    /api/alumnos/{id}         # Actualizar alumna
DELETE /api/alumnos/{id}         # Desactivar alumna
```

#### Turnos
```
GET    /api/turnos               # Listar turnos activos
GET    /api/turnos?incluirFechas=true  # Turnos con proximas 4 fechas
GET    /api/turnos/{id}          # Detalle de turno con inscripciones
GET    /api/turnos/profesor/{profesorId}  # Turnos por profesor
POST   /api/turnos               # Crear turno
PUT    /api/turnos/{id}          # Actualizar turno
DELETE /api/turnos/{id}          # Desactivar turno
```

#### Inscripciones
```
POST   /api/inscripciones                    # Inscribir alumna a turno
GET    /api/inscripciones/{id}               # Detalle de inscripcion
DELETE /api/inscripciones/{id}               # Cancelar inscripcion (suma clase a recuperar)
POST   /api/inscripciones/recuperacion       # Inscribir en clase de recuperacion
POST   /api/inscripciones/cancelar-proximas  # Cancelar proximas N clases
GET    /api/inscripciones/alumno/{alumnoId}  # Inscripciones con proximas fechas
GET    /api/inscripciones/turno/{turnoId}    # Inscripciones del turno
GET    /api/inscripciones/actividades        # Ultimas actividades del sistema
GET    /api/inscripciones/actividades/alumno/{alumnoId}  # Actividades filtradas por alumna
```

#### Asistencias
```
POST   /api/asistencias                      # Marcar asistencia individual
POST   /api/asistencias/marcar-multiple      # Marcar multiples asistencias
GET    /api/asistencias/{id}                 # Obtener registro
GET    /api/asistencias/turno/{turnoId}?fecha={fecha}  # Asistencias por turno y fecha
GET    /api/asistencias/alumno/{alumnoId}    # Historial de asistencia de alumna
GET    /api/asistencias/reporte/alumno/{alumnoId}  # Reporte porcentual
GET    /api/asistencias/historial/turno/{turnoId}  # Historial del turno (ultimo mes)
```

#### Autenticacion
```
POST   /api/auth/login                       # Login con email/password
PUT    /api/auth/change-password/{id}        # Cambiar contraseña
GET    /api/auth/usuarios                    # Listar usuarios activos
```

#### Configuracion del Sistema
```
GET    /api/configuracion                    # Obtener toda la configuracion
GET    /api/configuracion/{clave}            # Obtener configuracion por clave
PUT    /api/configuracion/{clave}            # Actualizar valor de configuracion
```

#### Dias Sin Clase
```
GET    /api/diassinclase?anio={year}&mes={month}  # Dias sin clase del mes
GET    /api/diassinclase/verificar?fecha={date}   # Verificar si es dia sin clase
POST   /api/diassinclase                          # Agregar dia sin clase
DELETE /api/diassinclase/{id}                      # Eliminar dia sin clase
```

#### Profesores
```
GET    /api/profesores              # Listar profesores activos
GET    /api/profesores/{id}         # Detalle de profesor
POST   /api/profesores              # Crear profesor (auto-crea usuario)
PUT    /api/profesores/{id}         # Actualizar profesor
DELETE /api/profesores/{id}         # Desactivar profesor
```

### Comandos Entity Framework:

```bash
cd backend/OlaAPI

# Crear nueva migracion
dotnet ef migrations add NombreMigracion --project ../OlaInfrastructure

# Aplicar migraciones
dotnet ef database update --project ../OlaInfrastructure

# Revertir ultima migracion
dotnet ef migrations remove --project ../OlaInfrastructure
```

---

## FRONTEND (React)

### Puerto:

- **http://localhost:5173**

### Ejecutar Frontend:

```bash
cd frontend
npm run dev
```

### Rutas de la Aplicacion:

```
/login                  → Pantalla de login (publica)
/portal-alumno          → Vista del alumno (Admin, Alumno)
/calendario             → Calendario interactivo (Admin, Alumno)
/portal-profesor        → Vista del profesor (Admin, Profesor)
/administracion         → Panel de administracion (Admin)
/alumnos                → Gestion de alumnas (Admin)
/alumnos/:id            → Detalle de alumna (Admin)
/turnos                 → Gestion de turnos (Admin)
```

### Paleta de Colores (src/styles/colors.js):

```javascript
primary: '#B67B5F'        // Terracota del logo
primaryDark: '#9D6851'    // Version oscura
primaryLight: '#C89479'   // Version clara
success: '#10B981'        // Verde (recuperacion/positivo)
warning: '#F59E0B'        // Amarillo (disponibilidad limitada)
error: '#EF4444'          // Rojo (cancelacion/dias sin clase)
```

---

## COMO EJECUTAR EL PROYECTO COMPLETO

### Desarrollo (SQLite):

```bash
# Terminal 1 - Backend
cd backend/OlaAPI
export ASPNETCORE_ENVIRONMENT=Development
dotnet run

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Produccion (PostgreSQL):

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

### Abrir en navegador:

- **Frontend:** http://localhost:5173
- **API Swagger:** http://localhost:5001/swagger

---

## FUNCIONALIDADES IMPLEMENTADAS

### Backend:
- [x] CRUD de Alumnas (con campo clases pendientes de recuperar)
- [x] CRUD de Turnos (con proximas fechas y exclusion de dias sin clase)
- [x] CRUD de Profesores (con auto-creacion de usuario)
- [x] Gestion de Inscripciones (con validacion de cupos)
- [x] Sistema de cancelacion de clases (individual y multiples)
- [x] Sistema de recuperacion de clases
- [x] Registro de Asistencias (individual y multiple)
- [x] Reportes de asistencia por alumna (porcentual)
- [x] Historial de asistencia por turno
- [x] Log de actividades del sistema
- [x] Autenticacion con login y roles
- [x] Gestion de dias sin clase (feriados)
- [x] Configuracion del sistema dinamica
- [x] Base de datos SQLite (dev) y PostgreSQL (prod)
- [x] Migraciones de Entity Framework
- [x] CORS configurado para frontend

### Frontend:
- [x] Sistema de login con autenticacion por roles
- [x] Rutas protegidas por rol (Admin, Profesor, Alumno)
- [x] Portal del Alumno (proxima clase, clases a recuperar, cancelacion, recuperacion)
- [x] Calendario interactivo (vista mensual, cancelar/recuperar clases, dias sin clase)
- [x] Portal del Profesor (seleccion de turno, marcar asistencia, historial)
- [x] Panel de Administracion (dashboard, actividades, configuracion del sistema)
- [x] Gestion de Alumnas (CRUD, busqueda, paginacion, ordenamiento)
- [x] Detalle de Alumna (perfil, inscripciones, historial de actividades con filtros)
- [x] Gestion de Turnos (CRUD, asignar profesor, inscribir/desinscribir alumnas)
- [x] Navegacion con tabs basada en rol del usuario
- [x] Notificaciones toast
- [x] Diseño con colores del logo (terracota)

### Pendiente:
- [ ] Gestion de Pagos (CRUD completo)
- [ ] Integracion con MercadoPago
- [ ] Notificaciones por email/WhatsApp
- [ ] Dashboard con estadisticas avanzadas
- [ ] Reportes exportables (PDF, Excel)
- [ ] Lista de espera automatica
- [ ] Configurar desde panel de administrador la cantidad de meses a futuro que el alumno puede ver, cancelar e inscribirse a clases (actualmente fijo: mes actual + 1 mes)

---

## MODELOS DE DATOS

### Alumno:
```
- Id (int)
- Nombre (string)
- Apellido (string)
- Email (string, unique)
- Telefono (string, nullable)
- FechaNacimiento (DateTime, nullable)
- Notas (string, nullable)
- FechaRegistro (DateTime)
- Activo (bool)
- ClasesPendientesRecuperar (int, default 0)
```

### Profesor:
```
- Id (int)
- Nombre (string)
- Apellido (string)
- Email (string)
- Telefono (string, nullable)
- Activo (bool)
```

### Turno:
```
- Id (int)
- DiaSemana (DayOfWeek: 0-6)
- HoraInicio (TimeSpan)
- HoraFin (TimeSpan)
- CuposMaximos (int)
- Activo (bool)
- ProfesorId (int, nullable)
```

### Inscripcion:
```
- Id (int)
- AlumnoId (int)
- TurnoId (int)
- FechaInscripcion (DateTime)
- Activa (bool)
```

### AusenciaProgramada:
```
- Id (int)
- InscripcionId (int)
- Fecha (DateTime)
```

### Asistencia:
```
- Id (int)
- AlumnoId (int)
- TurnoId (int)
- Fecha (DateTime)
- Presente (bool)
- Observaciones (string, nullable)
- FechaRegistro (DateTime)
```

### Actividad:
```
- Id (int)
- Tipo (string: "inscripcion", "cancelacion", "recuperacion", "asistencia", "inasistencia")
- AlumnoId (int)
- TurnoId (int)
- Fecha (DateTime)
```

### DiaSinClase:
```
- Id (int)
- Fecha (DateTime)
- Motivo (string)
```

### Usuario:
```
- Id (int)
- Email (string)
- PasswordHash (string)
- Rol (string: "Admin", "Profesor", "Alumno")
- AlumnoId (int, nullable)
- ProfesorId (int, nullable)
- Activo (bool)
```

### Pago:
```
- Id (int)
- AlumnoId (int)
- Monto (decimal)
- FechaPago (DateTime)
- FechaVencimiento (DateTime)
- MetodoPago (string: "Efectivo", "Transferencia", "MercadoPago")
- Comprobante (string, nullable)
- Estado (string: "Pendiente", "Pagado", "Vencido")
- MesPago (int)
- AnioPago (int)
```

### ConfiguracionSistema:
```
- Id (int)
- Clave (string)
- Valor (string)
- Descripcion (string)
```

---

## AUTENTICACION Y ROLES

### Roles disponibles:
- **Admin** - Acceso completo a todo el sistema
- **Profesor** - Acceso al portal de profesor y asistencias
- **Alumno** - Acceso al portal de alumno y calendario

### Login:
- Autenticacion por email y password (SHA256)
- Password por defecto para nuevos usuarios: "olataller"
- Redireccion automatica segun rol al iniciar sesion

### Rutas protegidas:
- Componente `ProtectedRoute` verifica autenticacion y rol
- Si no autenticado, redirige a `/login`

---

## SISTEMA DE CANCELACION Y RECUPERACION DE CLASES

### Flujo de cancelacion:
1. Alumna cancela una clase futura desde el portal o calendario
2. Se valida que falten las horas minimas de anticipacion (configurable)
3. Se registra como `AusenciaProgramada`
4. Se incrementa el contador `ClasesPendientesRecuperar` de la alumna
5. Se registra una `Actividad` de tipo "cancelacion"

### Flujo de recuperacion:
1. Alumna ve turnos disponibles con cupo
2. Se inscribe en una clase de recuperacion
3. Se decrementa el contador `ClasesPendientesRecuperar`
4. Se registra una `Actividad` de tipo "recuperacion"

### Configuracion:
- `HorasAnticipacionCancelacion`: horas minimas antes de la clase para poder cancelar

---

## SOLUCION DE PROBLEMAS COMUNES

### Backend no se conecta a PostgreSQL:
```bash
docker ps
docker start postgres-ola
docker logs postgres-ola
```

### Error "Port already in use":
```bash
lsof -i :5001
kill -9 [PID]
```

### Frontend no se conecta al backend:
1. Verificar que el backend este corriendo
2. Revisar la consola del navegador (F12) para errores CORS
3. Verificar que `src/services/api.js` tenga la URL correcta

### Migraciones de Entity Framework fallan:
```bash
cd backend/OlaAPI
dotnet tool install --global dotnet-ef
dotnet ef database update --project ../OlaInfrastructure
```

---

## PROXIMOS PASOS SUGERIDOS

### Corto plazo:
1. Completar el modulo de Pagos (CRUD completo)
2. Dashboard con estadisticas conectadas a datos reales
3. Reportes exportables

### Mediano plazo:
1. Notificaciones por email/WhatsApp
2. Integracion con MercadoPago
3. Lista de espera automatica

### Largo plazo:
1. App movil nativa
2. Sistema de recordatorios automaticos
3. Integracion con calendario (Google Calendar, iCal)

---

**Ultima actualizacion:** 09/02/2026
**Autora:** Carolina
**Proyecto:** Ela Taller - Sistema de Gestion de Turnos
