# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ola Taller is a class management system for art/yoga/group workshops. It manages students (alumnos), class schedules (turnos), enrollments (inscripciones), attendance (asistencias), and class cancellation/recovery workflows. The app is in Spanish.

## Development Commands

### Backend (.NET 8)
```bash
cd backend/OlaAPI
dotnet restore                    # install dependencies
dotnet run --urls="http://localhost:5001"  # run dev server
```

### Frontend (React 18 + Vite)
```bash
cd frontend
npm install       # install dependencies
npm run dev       # dev server at http://localhost:5173
npm run build     # production build
npm run lint      # ESLint
```

### Database Migrations (Entity Framework)
```bash
cd backend/OlaAPI
dotnet ef migrations add MigrationName --project ../OlaInfrastructure
dotnet ef database update --project ../OlaInfrastructure
```

### Local URLs
- Frontend: http://localhost:5173
- Backend API: http://localhost:5001/api
- Swagger docs: http://localhost:5001/swagger
- Default admin login: admin@olataller.com / olataller

## Architecture

### Backend — Three-project .NET solution (`backend/OlaAPI.sln`)
- **OlaAPI/** — ASP.NET Core Web API. Controllers and `Program.cs` (app configuration, CORS, auto-migration, user seeding). All API routes are under `/api`.
- **OlaCore/** — Domain models only (C# classes in `Models/`). No logic or dependencies.
- **OlaInfrastructure/** — Entity Framework Core DbContext (`OlaTallerContext`) and migrations.

Database: SQLite in dev (`olataller.db`), PostgreSQL in production (via `DATABASE_URL` env var). The switch is automatic in `Program.cs`.

### Frontend — React SPA (`frontend/`)
- **Pages** (`src/pages/`): Login, PortalAlumno, PortalProfesor, Calendario, Administracion, Alumnos, AlumnoDetalle, Turnos
- **Services** (`src/services/api.js`): Single file with all API calls organized by domain (alumnosService, turnosService, inscripcionesService, asistenciasService, authService, configuracionService, diasSinClaseService)
- **Auth** (`src/context/AuthContext.jsx`): Context-based auth with localStorage persistence
- **Routing** (`src/App.jsx`): Role-based protected routes — three roles: Admin, Profesor, Alumno

Styling is inline CSS with a color palette defined in `src/styles/colors.js` (primary: #B67B5F terracota). Icons via lucide-react.

### Key Domain Concepts
- **Turno**: A recurring weekly class slot (day + time + teacher + max capacity)
- **Inscripcion**: A student's enrollment in a turno (can be active/inactive)
- **AusenciaProgramada**: When a student cancels an upcoming class (subject to configurable advance-hours rule)
- **RecuperacionProgramada**: When a student books a make-up class in a different turno
- **Actividad**: Audit log of all system actions (enrollments, cancellations, recoveries, attendance)
- **DiaSinClase**: Holidays/non-class days excluded from scheduling
- **ConfiguracionSistema**: Dynamic key-value system settings (e.g., `HorasAnticipacionCancelacion`)

### Environment Variables
- Backend: `DATABASE_URL` (PostgreSQL connection string), `ALLOWED_ORIGINS` (CORS), `ASPNETCORE_ENVIRONMENT`
- Frontend: `VITE_API_URL` (backend base URL, defaults to `http://localhost:5001/api`)

## Deployment
- Frontend → Vercel (root: `frontend/`)
- Backend → Render via Docker (root: `backend/`, Dockerfile in `backend/Dockerfile`)
- Database → Supabase PostgreSQL

See `DEPLOY.md` for step-by-step instructions.
