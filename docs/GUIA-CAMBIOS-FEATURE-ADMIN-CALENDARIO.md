# Guía de cambios – Rama `feature/admin-alumnas-recuperar-y-calendario`

**Fecha:** Febrero 2025  
**Propósito:** Resumen para que el próximo agente o desarrollador pueda continuar desde este punto.

---

## 1. Objetivos de la rama

Se implementaron tres bloques de funcionalidad:

1. **Fecha de nacimiento y clases a recuperar (admin)**  
   - Cargar y editar fecha de nacimiento de alumnas.  
   - Poder cargar/editar desde el admin la cantidad de clases que tienen para recuperar.

2. **Calendario del mes y días sin clase**  
   - Ver el mes completo (todas las fechas) para admin y alumnos.  
   - Admin puede marcar días sin clase (feriados, sábados sin taller, etc.).

3. **Varias ausencias de una vez (alumnas)**  
   - Indicar “voy a faltar las próximas N clases” (1–5) de una vez, sin tener que entrar cada semana.

---

## 2. Cambios en backend

### 2.1 Modelos (OlaCore/Models)

- **Alumno.cs**  
  - Nuevo campo: `DateTime? FechaNacimiento`.

- **Nuevo: DiaSinClase.cs**  
  - `Id`, `Fecha` (DateTime), `Motivo` (string opcional).  
  - Representa un día sin clases (feriado, sábado sin taller, etc.).

- **Nuevo: AusenciaProgramada.cs**  
  - `Id`, `InscripcionId`, `Fecha` (DateTime).  
  - Indica que el alumno no asistirá a esa clase en esa fecha.

- **Inscripcion.cs**  
  - Nueva relación: `ICollection<AusenciaProgramada> AusenciasProgramadas`.

### 2.2 DbContext y migraciones (OlaInfrastructure)

- **OlaDbContext.cs**  
  - `DbSet<DiaSinClase> DiasSinClase`.  
  - `DbSet<AusenciaProgramada> AusenciasProgramadas`.  
  - Configuración de entidades e índices (incl. único en `DiaSinClase.Fecha` y en `(InscripcionId, Fecha)` de AusenciasProgramadas).

- **Migraciones añadidas (en orden):**  
  - `20260208120000_AddFechaNacimientoToAlumno.cs`: agrega columna `FechaNacimiento` a `Alumnos`.  
  - `20260208120001_AddDiasSinClaseYAusenciasProgramadas.cs`: crea tablas `DiasSinClase` y `AusenciasProgramadas` (definidas para SQLite en la migración).

- **Migración existente modificada:**  
  - `20260112100000_FixBooleanColumnsForPostgres.cs`: el SQL de conversión a `boolean` solo se ejecuta si **no** es SQLite (`if (!migrationBuilder.ActiveProvider.Contains("Sqlite"))`), para evitar error de sintaxis en SQLite.

### 2.3 Controladores (OlaAPI/Controllers)

- **AlumnosController.cs**  
  - En `GetAlumno` (por id) se incluye `FechaNacimiento` en el DTO.  
  - El `PUT` ya permitía actualizar todos los campos del alumno (incl. `FechaNacimiento` y `ClasesPendientesRecuperar`).

- **Nuevo: DiasSinClaseController.cs**  
  - `GET api/diassinclase?anio=&mes=` → días sin clase del mes.  
  - `GET api/diassinclase/verificar?fecha=` → si esa fecha es día sin clase.  
  - `POST api/diassinclase` → crear día sin clase (body: `{ fecha, motivo? }`).  
  - `DELETE api/diassinclase/{id}` → borrar día sin clase.

- **InscripcionesController.cs**  
  - **Helper interno:** `GetProximasFechasClaseAsync(turnoId, inscripcionId?, desde, cantidad)`  
    Calcula las próximas N fechas de clase para un turno, excluyendo días sin clase y (opcional) ausencias programadas de esa inscripción.  
  - **GET inscripciones por alumno:** la respuesta de `GET api/inscripciones/alumno/{id}` ahora incluye `proximaFecha` por inscripción (usando el helper anterior).  
  - **Nuevo endpoint:** `POST api/inscripciones/cancelar-proximas`  
    Body: `{ inscripcionId, cantidad }` (1–20).  
    Crea N `AusenciaProgramada`, suma N a `ClasesPendientesRecuperar` del alumno, registra actividades de tipo “cancelacion”. No da de baja la inscripción.  
  - **Corrección de tipos:** uso de `(int)turno.DiaSemana` y `(int)actual.DayOfWeek` para evitar error de compilación con el operador `%` y el enum `DayOfWeek`.

### 2.4 Program.cs (arranque y base de datos)

- **Migraciones:** se llama siempre a `context.Database.Migrate()` (también en desarrollo), no solo cuando hay `DATABASE_URL`.

- **SQLite – asegurar esquema si las migraciones no se aplicaron bien:**  
  - Tras `Migrate()`, si la columna no existe, se ejecuta `ALTER TABLE Alumnos ADD COLUMN FechaNacimiento TEXT;` (en bloque try/catch para no fallar en Postgres o si ya existe).  
  - Luego, con try/catch, se ejecuta SQL para SQLite:  
    - `CREATE TABLE IF NOT EXISTS DiasSinClase (...)` y índice único en `Fecha`.  
    - `CREATE TABLE IF NOT EXISTS AusenciasProgramadas (...)` y índice único en `(InscripcionId, Fecha)`.  
  Así, aunque la migración de DiasSinClase/AusenciasProgramadas no se haya aplicado en SQLite, las tablas existen y el endpoint de días sin clase deja de devolver 500.

---

## 3. Cambios en frontend

### 3.1 Servicios API (src/services/api.js)

- **inscripcionesService**  
  - `cancelarProximas(inscripcionId, cantidad)` → `POST /inscripciones/cancelar-proximas`.

- **Nuevo: diasSinClaseService**  
  - `getByMes(anio, mes)` → `GET /diassinclase?anio=&mes=`.  
  - `create(dia)` → `POST /diassinclase`.  
  - `delete(id)` → `DELETE /diassinclase/{id}`.

### 3.2 Páginas

- **AlumnoDetalle.jsx**  
  - Formulario de edición y vista: campo **Fecha de nacimiento** (input `type="date"`).  
  - Campo **Clases pendientes de recuperar** (número, editable por admin).  
  - Al guardar se envían `fechaNacimiento` y `clasesPendientesRecuperar` al backend.

- **Alumnos.jsx (listado y formulario Nuevo/Editar)**  
  - En el formulario de nuevo y edición de alumno se añadió **Fecha de nacimiento** (opcional).  
  - Estado y submit incluyen `fechaNacimiento`; al crear/actualizar se manda al API.

- **PortalAlumno.jsx**  
  - Uso de `proximaFecha` devuelta por `GET inscripciones/alumno/{id}` cuando exista.  
  - Por cada clase inscripta: botones “Voy a faltar las próximas **1** / **2** / **3** / **4** / **5** clases” que llaman a `cancelarProximas(inscripcionId, n)`.  
  - El botón de “Cancelar” pasó a llamarse “Darme de baja del turno” (sigue usando `DELETE` inscripción).

- **Nueva página: Calendario.jsx**  
  - Ruta: `/calendario`.  
  - Muestra el mes en una grilla; por día se indica si hay clases (según turnos) y si es “día sin clase”.  
  - Navegación de mes (anterior/siguiente).  
  - Solo **admin**: clic en un día alterna “día sin clase” (POST o DELETE a `diasSinClaseService`).  
  - Acceso: pestaña “Calendario” en la navegación (roles Admin y Alumno).

### 3.3 Navegación y rutas

- **App.jsx**  
  - Ruta `/calendario` con `Calendario` como componente, protegida para roles `Admin` y `Alumno`.

- **Navigation.jsx**  
  - Nueva pestaña “Calendario” (icono Calendar), visible para `Admin` y `Alumno`.

---

## 4. Snapshot de EF (OlaDbContextModelSnapshot.cs)

- Se actualizó el snapshot para incluir:  
  - `Alumno.FechaNacimiento` (nullable).  
  - Entidades `DiaSinClase` y `AusenciaProgramada`, sus propiedades e índices, y la relación `Inscripcion` → `AusenciasProgramadas`.

---

## 5. Cómo probar en local

1. **Backend**  
   - `cd backend/OlaAPI`  
   - `dotnet run --urls="http://localhost:5001"`  
   - La app aplica migraciones y, en SQLite, crea las tablas/columna faltantes si hace falta.

2. **Frontend**  
   - `cd frontend`  
   - `npm install` (si hace falta)  
   - `npm run dev`  
   - Abrir `http://localhost:5173`.

3. **Login**  
   - Email: `admin@olataller.com`  
   - Contraseña: `olataller` (no 123456; ver `AuthController.DefaultPassword`).

4. **Flujos a revisar**  
   - Alumnos → nuevo/editar: campo fecha de nacimiento y (en detalle) clases a recuperar.  
   - Calendario: ver mes, como admin marcar/desmarcar día sin clase.  
   - Portal Alumno: “Voy a faltar las próximas N clases” y “Darme de baja del turno”.

---

## 6. Problemas conocidos y workarounds

- **SQLite y migración Postgres:** la migración `FixBooleanColumnsForPostgres` ejecuta `ALTER COLUMN ... TYPE boolean` solo cuando el proveedor no es Sqlite, para evitar error de sintaxis.

- **Tablas DiasSinClase / AusenciasProgramadas en SQLite:** si por cualquier razón la migración que las crea no se aplica, `Program.cs` las crea con SQL directo al arrancar. Si en el futuro se corrige la aplicación de migraciones en SQLite, se puede valorar quitar este bloque o dejarlo como respaldo.

- **Contraseña por defecto:** la documentación (README, DEPLOY) se actualizó a `olataller`; el código usa `AuthController.DefaultPassword = "olataller"`.

---

## 7. Posibles continuaciones para el próximo agente

- **Migraciones en SQLite:** revisar por qué la migración `20260208120001_AddDiasSinClaseYAusenciasProgramadas` no llega a aplicarse en algunos entornos (p. ej. falta de Designer, orden de migraciones) y unificar comportamiento con PostgreSQL.

- **PostgreSQL:** si en producción se usa solo Postgres, asegurarse de que las migraciones de esta rama se aplican correctamente (tipos de columna y nombres de tablas son los del snapshot/Npgsql).

- **Calendario:** mejorar UX (leyenda, tooltips, feedback al marcar día sin clase) o permitir motivo al crear día sin clase desde el calendario.

- **Ausencias programadas:** opcionalmente mostrar en el portal del alumno las fechas que ya marcó como “no voy” y permitir deshacer alguna.

- **Validaciones:** en backend, validar rango de `cantidad` en `cancelar-proximas` y que la inscripción pertenezca al usuario en frontend.

---

## 8. Archivos tocados (referencia rápida)

**Backend:**  
`OlaCore/Models/Alumno.cs`, `DiaSinClase.cs`, `AusenciaProgramada.cs`, `Inscripcion.cs`  
`OlaInfrastructure/Data/OlaDbContext.cs`  
`OlaInfrastructure/Migrations/` (nuevas migraciones + edición de FixBooleanColumnsForPostgres + snapshot)  
`OlaAPI/Controllers/AlumnosController.cs`, `InscripcionesController.cs`, `DiasSinClaseController.cs`  
`OlaAPI/Program.cs`

**Frontend:**  
`src/services/api.js`  
`src/pages/AlumnoDetalle.jsx`, `Alumnos.jsx`, `PortalAlumno.jsx`, `Calendario.jsx` (nuevo)  
`src/App.jsx`, `src/components/Navigation.jsx`

**Docs:**  
`README.md`, `DEPLOY.md` (contraseña admin)  
`docs/GUIA-CAMBIOS-FEATURE-ADMIN-CALENDARIO.md` (este archivo)
