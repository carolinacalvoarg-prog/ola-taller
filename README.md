# Ola Taller

Sistema de gestion para talleres de arte/yoga/clases grupales. Permite administrar alumnos, turnos, inscripciones, asistencias y mas.

## Tecnologias

| Componente | Tecnologia |
|------------|------------|
| Frontend | React 18 + Vite |
| Backend | .NET 8 (ASP.NET Core Web API) |
| Base de datos | SQLite (dev) / PostgreSQL (prod) |

## Funcionalidades

### Portal Administrador
- Dashboard con estadisticas
- Gestion de alumnos (CRUD, ficha detallada)
- Gestion de turnos/clases
- Gestion de profesores
- Ultimas actividades (inscripciones, cancelaciones)
- Configuracion del sistema

### Portal Profesor
- Ver clases asignadas
- Deteccion automatica de clase actual
- Registro de asistencias
- Historial de asistencias

### Portal Alumno
- Ver clases inscriptas
- Proxima clase
- Cancelar clases (con anticipacion configurable)
- Inscribirse a clases de recuperacion

## Requisitos

- Node.js 18+
- .NET 8 SDK

## Instalacion local

### Backend

```bash
cd backend/OlaAPI
dotnet restore
dotnet run --urls="http://localhost:5001"
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

La aplicacion estara disponible en:
- Frontend: http://localhost:5173
- Backend: http://localhost:5001
- Swagger: http://localhost:5001/swagger

## Credenciales por defecto

| Rol | Email | Password |
|-----|-------|----------|
| Admin | admin@olataller.com | 123456 |

## Deploy

Ver [DEPLOY.md](DEPLOY.md) para instrucciones de deploy en:
- **Frontend**: Vercel
- **Backend**: Render
- **Base de datos**: Supabase (PostgreSQL)

## Estructura del proyecto

```
ola-taller/
├── backend/
│   ├── OlaAPI/          # Web API (controllers, program.cs)
│   ├── OlaCore/         # Modelos de dominio
│   └── OlaInfrastructure/ # DbContext, migraciones
├── frontend/
│   ├── src/
│   │   ├── components/  # Componentes reutilizables
│   │   ├── pages/       # Paginas de la aplicacion
│   │   ├── context/     # Context de autenticacion
│   │   └── services/    # Servicios API
│   └── ...
├── DEPLOY.md            # Guia de deploy
└── README.md
```

## Licencia

MIT
