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
- **OlaInfrastructure/** — Entity Framework Core DbContext (`OlaDbContext`) and migrations.

Database: SQLite in dev (`olataller.db`), PostgreSQL in production (via `DATABASE_URL` env var). The switch is automatic in `Program.cs`.

### Frontend — React SPA (`frontend/`)
- **Pages** (`src/pages/`): Login, PortalAlumno, PortalProfesor, Calendario, Administracion, Alumnos, AlumnoDetalle, Turnos
- **Services** (`src/services/api.js`): Single file with all API calls organized by domain (alumnosService, turnosService, talleresService, inscripcionesService, asistenciasService, authService, configuracionService, diasSinClaseService)
- **Auth** (`src/context/AuthContext.jsx`): Context-based auth with localStorage persistence
- **Routing** (`src/App.jsx`): Role-based protected routes — three roles: Admin, Profesor, Alumno

Styling is inline CSS with a color palette defined in `src/styles/colors.js` (primary: #B67B5F terracota). Icons via lucide-react.

### Key Domain Concepts
- **Taller**: Workshop category (e.g., "Cerámica Semana", "Gres"). Turnos belong to a taller. Controls recovery eligibility.
- **Turno**: A recurring weekly class slot (day + time + teacher + max capacity). Can use `UsarFechasManuales` for irregular schedules (e.g., alternating Saturday groups A/B) — specific dates stored in `TurnoFecha`.
- **TurnoFecha**: A specific date for a turno that uses manual scheduling instead of auto-calculating from `DiaSemana`.
- **TallerRecuperacionPermitida**: Cross-taller recovery permission. Records that students of taller X can book make-up classes in taller Y. By default, students can only recover within their own taller.
- **Inscripcion**: A student's enrollment in a turno (can be active/inactive)
- **AusenciaProgramada**: When a student cancels an upcoming class (subject to configurable advance-hours rule)
- **RecuperacionProgramada**: When a student books a make-up class in a different turno. Recovery validation checks the student's pending absences across all permitted talleres.
- **Actividad**: Audit log of all system actions (enrollments, cancellations, recoveries, attendance)
- **DiaSinClase**: Holidays/non-class days excluded from scheduling
- **ConfiguracionSistema**: Dynamic key-value system settings (e.g., `HorasAnticipacionCancelacion`)

### Backend Patterns

- **Timezone**: All date/time logic uses `TimeHelper.HoyArgentina()` / `TimeHelper.AhoraArgentina()` (in `OlaAPI/Helpers/TimeHelper.cs`). Never use `DateTime.UtcNow` or `DateTime.Now` directly — the server is UTC but the app is Argentina (UTC-3).
- **No DTOs**: Controllers return inline anonymous objects via `.Select(x => new { ... })`. There is no separate DTO layer.
- **No auth middleware**: Login (`POST /api/auth/login`) returns a plain user object (id, email, rol, alumnoId/profesorId) that the frontend stores in localStorage. API endpoints have no `[Authorize]` attribute — authorization is handled client-side only.
- **Password hashing**: SHA-256, no salt. See `AuthController.cs`.
- **SQLite quirk**: `ORDER BY` on `TimeSpan` fields (e.g. `HoraInicio`) fails in SQLite — always sort in memory after fetching.
- **SQLite quirk**: Nested collection projections inside `.Select()` (e.g. `t.FechasManuales.Select(...).ToList()`) return empty arrays in SQLite. Work around by loading child collections in a separate query and joining in memory with a dictionary keyed by parent ID.

### Environment Variables
- Backend: `DATABASE_URL` (PostgreSQL connection string), `ALLOWED_ORIGINS` (CORS), `ASPNETCORE_ENVIRONMENT`
- Frontend: `VITE_API_URL` (backend base URL, defaults to `http://localhost:5001/api`)

## Deployment
- Frontend → Vercel (root: `frontend/`)
- Backend → Render via Docker (root: `backend/`, Dockerfile in `backend/Dockerfile`)
- Database → Supabase PostgreSQL

See `DEPLOY.md` for step-by-step instructions.
