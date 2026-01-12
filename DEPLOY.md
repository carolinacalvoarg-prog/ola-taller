# Guia de Deploy - Ola Taller

## Arquitectura de Produccion

- **Frontend**: Vercel (React + Vite)
- **Backend**: Render (ASP.NET Core 8)
- **Base de datos**: Supabase (PostgreSQL)

---

## Paso 1: Configurar Supabase (Base de datos)

1. Crear cuenta en [supabase.com](https://supabase.com)
2. Crear nuevo proyecto (elegir region cercana, ej: South America)
3. Esperar a que el proyecto se inicialice (~2 minutos)
4. Ir a **Project Settings > Database**
5. Copiar el **Connection string** (URI format):
   ```
   postgresql://postgres:[TU-PASSWORD]@db.[TU-PROJECT].supabase.co:5432/postgres
   ```
   > Reemplazar `[TU-PASSWORD]` con la password que elegiste al crear el proyecto

---

## Paso 2: Deploy Backend en Render

1. Subir el codigo a GitHub (si no lo hiciste):
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. Crear cuenta en [render.com](https://render.com)

3. Click en **New > Web Service**

4. Conectar tu repositorio de GitHub

5. Configurar el servicio:
   - **Name**: `olataller-api`
   - **Region**: Oregon (US West) o la mas cercana
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Docker`
   - **Dockerfile Path**: `./Dockerfile`
   - **Plan**: Free

6. Agregar **Environment Variables**:
   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | (pegar connection string de Supabase) |
   | `ALLOWED_ORIGINS` | `https://tu-app.vercel.app` (lo actualizas despues) |

7. Click en **Create Web Service**

8. Esperar el deploy (~5-10 minutos la primera vez)

9. Copiar la URL del servicio (ej: `https://olataller-api.onrender.com`)

---

## Paso 3: Deploy Frontend en Vercel

1. Crear cuenta en [vercel.com](https://vercel.com)

2. Click en **Add New > Project**

3. Importar tu repositorio de GitHub

4. Configurar el proyecto:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

5. Agregar **Environment Variables**:
   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://olataller-api.onrender.com/api` |

6. Click en **Deploy**

7. Esperar el deploy (~2-3 minutos)

8. Copiar la URL de tu app (ej: `https://olataller.vercel.app`)

---

## Paso 4: Actualizar CORS en Render

1. Volver a Render > tu servicio > Environment

2. Actualizar la variable `ALLOWED_ORIGINS`:
   ```
   https://olataller.vercel.app
   ```
   (usar la URL real de tu app en Vercel)

3. El servicio se redeploya automaticamente

---

## Verificacion

1. Abrir tu app en Vercel
2. Intentar login con: `admin@olataller.com` / `123456`
3. Si funciona, el deploy esta completo!

---

## Troubleshooting

### El backend tarda en responder
El plan gratuito de Render "duerme" el servicio despues de 15 minutos de inactividad. La primera peticion puede tardar ~30 segundos.

### Error de CORS
Verificar que `ALLOWED_ORIGINS` en Render tenga la URL exacta de Vercel (sin `/` al final).

### Error de base de datos
Verificar que `DATABASE_URL` en Render sea correcto y que el proyecto de Supabase este activo.

### Ver logs del backend
En Render > tu servicio > Logs

---

## URLs de ejemplo

| Servicio | URL |
|----------|-----|
| Frontend | https://olataller.vercel.app |
| Backend | https://olataller-api.onrender.com |
| Swagger | https://olataller-api.onrender.com/swagger |
| Supabase | https://app.supabase.com/project/[tu-proyecto] |
