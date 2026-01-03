# 📋 DOCUMENTACIÓN DEL PROYECTO - ELA TALLER

**Fecha última actualización:** 26 de Diciembre de 2024  
**Estado:** Backend instalado ✅ | Frontend actualizado ✅ | En desarrollo 🚧

---

## 🎯 DESCRIPCIÓN DEL PROYECTO

Aplicación web para la gestión de turnos, alumnos, asistencias y pagos del taller de cerámica "Ela Taller".

### Tecnologías Utilizadas:
- **Backend:** ASP.NET Core 8.0 (C#)
- **Frontend:** React 18 + Vite
- **Base de Datos:** PostgreSQL 16
- **Contenedor:** Docker (PostgreSQL)
- **Iconos:** Lucide React
- **Estilos:** CSS inline (sin Tailwind)

---

## 📁 ESTRUCTURA DEL PROYECTO

```
~/Applications/ola-taller/
├── backend/
│   ├── OlaAPI/                    # Proyecto Web API
│   │   ├── Controllers/           # Endpoints REST
│   │   │   ├── AlumnosController.cs
│   │   │   ├── TurnosController.cs
│   │   │   ├── InscripcionesController.cs
│   │   │   └── AsistenciasController.cs
│   │   ├── Program.cs             # Configuración principal
│   │   ├── appsettings.json       # Cadena de conexión DB
│   │   └── OlaAPI.csproj
│   ├── OlaCore/                   # Modelos de dominio
│   │   ├── Models/
│   │   │   ├── Alumno.cs
│   │   │   ├── Turno.cs
│   │   │   ├── Profesor.cs
│   │   │   ├── Inscripcion.cs
│   │   │   ├── Asistencia.cs
│   │   │   ├── Pago.cs
│   │   │   └── Usuario.cs
│   │   └── OlaCore.csproj
│   ├── OlaInfrastructure/         # Acceso a datos
│   │   ├── Data/
│   │   │   └── OlaDbContext.cs    # Contexto de Entity Framework
│   │   └── OlaInfrastructure.csproj
│   └── OlaAPI.sln                 # Solución .NET
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx         # Header con logo "ela TALLER"
│   │   │   ├── Navigation.jsx     # Tabs de navegación
│   │   │   ├── Layout.jsx         # Layout principal
│   │   │   └── Card.jsx           # Componente tarjeta
│   │   ├── pages/
│   │   │   ├── PortalAlumno.jsx   # Vista del alumno
│   │   │   ├── PortalProfesor.jsx # Vista del profesor
│   │   │   └── Administracion.jsx # Panel admin
│   │   ├── services/
│   │   │   └── api.js             # Cliente axios + servicios
│   │   ├── styles/
│   │   │   └── colors.js          # Paleta de colores del logo
│   │   ├── App.jsx                # Rutas React Router
│   │   ├── main.jsx               # Entry point
│   │   └── index.css              # Estilos base
│   ├── package.json
│   └── vite.config.js
│
└── DOCUMENTACION-PROYECTO.md      # Este archivo
```

---

## 🗄️ BASE DE DATOS

### Información de Conexión:

```
Container: postgres-ola
Host: localhost
Puerto: 5432
Base de datos: olataller
Usuario: postgres
Contraseña: ola2024
```

### Comandos útiles:

```bash
# Ver estado del contenedor
docker ps

# Iniciar PostgreSQL
docker start postgres-ola

# Detener PostgreSQL
docker stop postgres-ola

# Conectarse a la base de datos
docker exec -it postgres-ola psql -U postgres -d olataller

# Ver tablas (dentro de psql)
\dt

# Salir de psql
\q
```

### Tablas Creadas:

- **Alumnos** - Información de alumnos
- **Profesores** - Información de profesores
- **Turnos** - Horarios de clases
- **Inscripciones** - Relación alumno-turno
- **Asistencias** - Registro de asistencias
- **Pagos** - Registro de pagos mensuales
- **Usuarios** - Autenticación (futuro)

---

## ⚙️ BACKEND (.NET)

### Puertos:

- **HTTP:** http://localhost:5000
- **Swagger:** http://localhost:5000/swagger (solo en Development)

### Ejecutar Backend:

```bash
cd ~/Applications/ola-taller/backend/OlaAPI
export ASPNETCORE_ENVIRONMENT=Development
dotnet run
```

### Endpoints Principales:

```
GET    /api/alumnos              # Listar alumnos
POST   /api/alumnos              # Crear alumno
GET    /api/alumnos/{id}         # Obtener alumno
PUT    /api/alumnos/{id}         # Actualizar alumno
DELETE /api/alumnos/{id}         # Eliminar alumno (soft delete)

GET    /api/turnos               # Listar turnos con cupos
POST   /api/turnos               # Crear turno
GET    /api/turnos/{id}          # Obtener turno
PUT    /api/turnos/{id}          # Actualizar turno
DELETE /api/turnos/{id}          # Eliminar turno

POST   /api/inscripciones        # Inscribir alumno a turno
GET    /api/inscripciones/alumno/{alumnoId}  # Inscripciones del alumno
GET    /api/inscripciones/turno/{turnoId}    # Inscripciones del turno
DELETE /api/inscripciones/{id}   # Cancelar inscripción

POST   /api/asistencias          # Marcar asistencia individual
POST   /api/asistencias/marcar-multiple      # Marcar múltiples
GET    /api/asistencias/turno/{turnoId}?fecha={fecha}  # Asistencias por turno
GET    /api/asistencias/alumno/{alumnoId}    # Asistencias del alumno
GET    /api/asistencias/reporte/alumno/{alumnoId}  # Reporte de asistencia
```

### Comandos Entity Framework:

```bash
cd ~/Applications/ola-taller/backend/OlaAPI

# Crear nueva migración
dotnet ef migrations add NombreMigracion --project ../OlaInfrastructure

# Aplicar migraciones
dotnet ef database update --project ../OlaInfrastructure

# Revertir última migración
dotnet ef migrations remove --project ../OlaInfrastructure

# Ver migraciones
dotnet ef migrations list --project ../OlaInfrastructure
```

---

## 🎨 FRONTEND (React)

### Puerto:

- **http://localhost:5173**

### Ejecutar Frontend:

```bash
cd ~/Applications/ola-taller/frontend
npm run dev
```

### Rutas de la Aplicación:

```
/                       → Redirige a /portal-alumno
/portal-alumno          → Vista del alumno
/portal-profesor        → Vista del profesor  
/administracion         → Panel de administración
```

### Paleta de Colores (src/styles/colors.js):

```javascript
primary: '#B67B5F'        // Terracota del logo
primaryDark: '#9D6851'    // Versión oscura
primaryLight: '#C89479'   // Versión clara
success: '#10B981'        // Verde
warning: '#F59E0B'        // Amarillo
error: '#EF4444'          // Rojo
```

### Dependencias Instaladas:

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.x",
    "axios": "^1.x",
    "lucide-react": "^0.x"
  }
}
```

---

## 🚀 CÓMO EJECUTAR EL PROYECTO COMPLETO

### 1. Iniciar PostgreSQL:

```bash
docker start postgres-ola
```

### 2. Iniciar Backend (Terminal 1):

```bash
cd ~/Applications/ola-taller/backend/OlaAPI
export ASPNETCORE_ENVIRONMENT=Development
dotnet run
```

Debería mostrar:
```
Now listening on: http://localhost:5000
```

### 3. Iniciar Frontend (Terminal 2):

```bash
cd ~/Applications/ola-taller/frontend
npm run dev
```

Debería mostrar:
```
Local: http://localhost:5173/
```

### 4. Abrir en navegador:

- **Frontend:** http://localhost:5173
- **API Swagger:** http://localhost:5000/swagger

---

## 📝 FUNCIONALIDADES IMPLEMENTADAS

### ✅ Backend:
- [x] CRUD de Alumnos
- [x] CRUD de Turnos
- [x] Gestión de Inscripciones (con validación de cupos)
- [x] Registro de Asistencias
- [x] Reportes de asistencia por alumno
- [x] Base de datos PostgreSQL configurada
- [x] Migraciones de Entity Framework
- [x] CORS configurado para frontend

### ✅ Frontend:
- [x] Portal del Alumno completo
- [x] Portal del Profesor completo
- [x] Panel de Administración completo
- [x] Navegación con tabs
- [x] Conexión con API backend
- [x] Diseño con colores del logo

### 🚧 Pendiente:
- [ ] Sistema de autenticación/login
- [ ] Gestión de Pagos (CRUD completo)
- [ ] Integración con MercadoPago
- [ ] Notificaciones por email/WhatsApp
- [ ] Módulo de recuperación de clases funcional
- [ ] Dashboard con estadísticas reales (conectadas a DB)
- [ ] Reportes avanzados
- [ ] Lista de espera automática

---

## 🔧 CONFIGURACIÓN IMPORTANTE

### appsettings.json (Backend):

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=olataller;Username=postgres;Password=ola2024"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning",
      "Microsoft.EntityFrameworkCore": "Information"
    }
  },
  "AllowedHosts": "*"
}
```

### Program.cs - CORS configurado para:

```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            policy.WithOrigins("http://localhost:5173", "http://localhost:3000")
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});
```

### api.js (Frontend):

```javascript
const API_BASE_URL = 'http://localhost:5000/api';
```

---

## 🐛 SOLUCIÓN DE PROBLEMAS COMUNES

### Backend no se conecta a PostgreSQL:

```bash
# Verificar que el contenedor esté corriendo
docker ps

# Si no está, iniciarlo
docker start postgres-ola

# Verificar logs
docker logs postgres-ola
```

### Error "Port 5000 already in use":

```bash
# Encontrar proceso usando el puerto
lsof -i :5000

# Matar el proceso
kill -9 [PID]
```

### Frontend no se conecta al backend:

1. Verificar que el backend esté corriendo en http://localhost:5000
2. Revisar la consola del navegador (F12) para errores CORS
3. Verificar que `src/services/api.js` tenga la URL correcta

### Error "Cannot find module lucide-react":

```bash
cd ~/Applications/ola-taller/frontend
npm install lucide-react
```

### Migraciones de Entity Framework fallan:

```bash
# Asegurarse de estar en la carpeta correcta
cd ~/Applications/ola-taller/backend/OlaAPI

# Verificar que PostgreSQL esté corriendo
docker ps | grep postgres-ola

# Reinstalar EF tools si es necesario
dotnet tool uninstall --global dotnet-ef
dotnet tool install --global dotnet-ef

# Agregar al PATH si no lo reconoce
echo 'export PATH="$PATH:$HOME/.dotnet/tools"' >> ~/.zshrc
source ~/.zshrc
```

---

## 📊 MODELOS DE DATOS

### Alumno:
```csharp
- Id (int)
- Nombre (string)
- Apellido (string)
- Email (string, unique)
- Telefono (string, nullable)
- FechaRegistro (DateTime)
- Activo (bool)
```

### Turno:
```csharp
- Id (int)
- DiaSemana (DayOfWeek: 0-6)
- HoraInicio (TimeSpan)
- HoraFin (TimeSpan)
- CuposMaximos (int)
- Activo (bool)
- ProfesorId (int, nullable)
```

### Inscripcion:
```csharp
- Id (int)
- AlumnoId (int)
- TurnoId (int)
- FechaInscripcion (DateTime)
- Activa (bool)
```

### Asistencia:
```csharp
- Id (int)
- AlumnoId (int)
- TurnoId (int)
- Fecha (DateTime)
- Presente (bool)
- Observaciones (string, nullable)
- FechaRegistro (DateTime)
```

---

## 🔑 INFORMACIÓN CLAVE PARA CLAUDE

### Para continuar el desarrollo en futuras conversaciones:

**Ubicación del proyecto:**
```
/Users/caro/Applications/ola-taller/
```

**Versiones instaladas:**
- Node.js: 20.16.0
- .NET: 8.0
- PostgreSQL: 16 (en Docker)

**Comandos para verificar el estado:**
```bash
# Backend corriendo?
curl http://localhost:5000/api/alumnos

# Frontend corriendo?
curl http://localhost:5173

# PostgreSQL corriendo?
docker ps | grep postgres-ola
```

**Estructura importante a recordar:**
- Los colores del diseño vienen del logo (#B67B5F - terracota)
- Hay 3 portales distintos: Alumno, Profesor, Admin
- No usar Tailwind CSS - todo con estilos inline
- La navegación es con tabs, no con links simples

---

## 📞 PRÓXIMOS PASOS SUGERIDOS

### Corto plazo:
1. Implementar sistema de login/autenticación
2. Conectar el dashboard de Admin con datos reales
3. Completar el módulo de Pagos
4. Implementar recuperación de clases funcional

### Mediano plazo:
1. Notificaciones por email/WhatsApp
2. Integración con MercadoPago
3. Reportes avanzados (PDF, Excel)
4. Lista de espera automática

### Largo plazo:
1. App móvil nativa
2. Sistema de recordatorios automáticos
3. Panel de estadísticas avanzado
4. Integración con calendario (Google Calendar, iCal)

---

## 🎓 CONTEXTO ADICIONAL

### Historia del Proyecto:
- Conversación iniciada el 26/12/2024
- Backend instalado y funcionando
- Frontend actualizado con diseño original de la propuesta
- Base de datos creada con todas las tablas
- Sistema básico funcional

### Decisiones de Diseño:
- Se eligió React sobre otros frameworks por simplicidad
- PostgreSQL por ser gratuito y robusto
- .NET Core por performance y tipado fuerte
- Sin Tailwind para mantener simplicidad y control total

---

## ✅ CHECKLIST DE VERIFICACIÓN

Antes de empezar una nueva conversación, verifica:

- [ ] PostgreSQL corriendo: `docker ps | grep postgres-ola`
- [ ] Backend compila: `cd backend/OlaAPI && dotnet build`
- [ ] Frontend compila: `cd frontend && npm run build`
- [ ] Base de datos accesible: `docker exec -it postgres-ola psql -U postgres -d olataller`
- [ ] Tienes este archivo de documentación actualizado

---

**Última actualización:** 26/12/2024  
**Autor:** Carolina  
**Proyecto:** Ela Taller - Sistema de Gestión de Turnos
