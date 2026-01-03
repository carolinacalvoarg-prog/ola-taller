# ⚡ RESUMEN EJECUTIVO - ELA TALLER

**Para iniciar una nueva conversación sobre este proyecto, sube este archivo y di:**

> "Hola Claude, estoy trabajando en el proyecto Ela Taller. He subido la documentación. 
> Necesito que [describe lo que necesitas]."

---

## 📍 UBICACIÓN DEL PROYECTO

```
/Users/caro/Applications/ola-taller/
```

---

## 🚀 COMANDOS RÁPIDOS

### Iniciar todo:

```bash
# Terminal 1 - PostgreSQL
docker start postgres-ola

# Terminal 2 - Backend
cd ~/Applications/ola-taller/backend/OlaAPI
export ASPNETCORE_ENVIRONMENT=Development
dotnet run

# Terminal 3 - Frontend
cd ~/Applications/ola-taller/frontend
npm run dev
```

### URLs importantes:

- Frontend: http://localhost:5173
- Backend: http://localhost:5000
- Swagger: http://localhost:5000/swagger

---

## 📊 ESTADO ACTUAL

### ✅ Funcionando:
- Backend con API REST completa
- Base de datos PostgreSQL
- Frontend con 3 portales (Alumno, Profesor, Admin)
- CRUD de Alumnos y Turnos
- Sistema de Inscripciones
- Registro de Asistencias

### 🚧 Pendiente:
- Sistema de login/autenticación
- Módulo de pagos completo
- Notificaciones
- Integración MercadoPago

---

## 🎨 CARACTERÍSTICAS CLAVE

- **Colores:** #B67B5F (terracota del logo)
- **Backend:** .NET Core 8.0 + PostgreSQL
- **Frontend:** React + Vite (sin Tailwind)
- **Base de datos:** olataller (postgres/ola2024)

---

## 📁 ARCHIVOS CLAVE

**Backend:**
- `backend/OlaAPI/Controllers/` - Endpoints
- `backend/OlaCore/Models/` - Modelos
- `backend/OlaInfrastructure/Data/OlaDbContext.cs` - EF Context

**Frontend:**
- `frontend/src/pages/` - Portales principales
- `frontend/src/services/api.js` - Conexión API
- `frontend/src/styles/colors.js` - Colores del logo

---

## 🔑 INFORMACIÓN TÉCNICA

### Base de Datos:
```
Host: localhost:5432
Database: olataller
User: postgres
Password: ola2024
Container: postgres-ola
```

### Modelos principales:
- Alumno (id, nombre, apellido, email, telefono)
- Turno (id, diaSemana, horaInicio, horaFin, cuposMaximos)
- Inscripcion (id, alumnoId, turnoId, activa)
- Asistencia (id, alumnoId, turnoId, fecha, presente)

---

## 💡 PARA CLAUDE

Cuando retomes el proyecto:

1. **Lee primero** `DOCUMENTACION-PROYECTO.md` completo
2. **Verifica estado:**
   - ¿Backend corriendo? `curl http://localhost:5000/api/alumnos`
   - ¿PostgreSQL activo? `docker ps | grep postgres-ola`
3. **Contexto clave:**
   - 3 portales distintos: Alumno, Profesor, Admin
   - Colores específicos del logo (#B67B5F)
   - Sin Tailwind CSS, todo con estilos inline

---

## 📞 PRÓXIMOS PASOS TÍPICOS

**Si necesitas:**

- **Agregar funcionalidad:** "Quiero agregar [X] al portal [Y]"
- **Arreglar bug:** "Tengo un error en [archivo/componente]"
- **Modificar diseño:** "Necesito cambiar [elemento visual]"
- **Agregar endpoint:** "Quiero crear un endpoint para [funcionalidad]"
- **Modificar modelo:** "Necesito agregar campo [X] a la tabla [Y]"

**Siempre menciona:**
- Qué archivo estás modificando
- Qué portal afecta (si aplica)
- Si requiere cambios en backend, frontend o ambos

---

## 🎯 EJEMPLOS DE CONSULTAS

```
"Necesito agregar validación de formato de email en el 
formulario de crear alumno del panel de administración"

"Quiero que el Portal del Alumno muestre cuántas clases 
ha asistido en el mes actual"

"Necesito crear un endpoint para obtener los pagos 
pendientes de todos los alumnos"

"El botón de cancelar turno no está funcionando en el 
Portal del Alumno, aquí está el código: [pegar código]"
```

---

## ⚠️ RECORDATORIOS IMPORTANTES

1. **Siempre** verificar que PostgreSQL esté corriendo
2. **Backend** debe estar en modo Development para ver Swagger
3. **CORS** ya está configurado para localhost:5173
4. **Los cambios** en modelos requieren nueva migración EF
5. **lucide-react** se usa para los iconos, no otros paquetes

---

**Fecha creación:** 26/12/2024  
**Última actualización:** 26/12/2024  
**Versión:** 1.0
