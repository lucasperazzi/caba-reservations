# Reglas del proyecto — caba-reservations

## Git

- **NO commitear ni pushear a menos que el usuario lo pida explícitamente.**

## Desarrollo

- Los `node_modules` viven en la raíz (npm workspaces). **Siempre correr `npm install` desde la raíz**, no desde `backend/` o `frontend/`.
- Para levantar los servers, usar los scripts de la raíz:
  - `npm run dev:backend` (Hono en :3000)
  - `npm run dev:frontend` (Vite en :5173)
- Node 20 requerido (instalado en `~/.n/bin` vía `n`).**
- El backend lee `backend/.env` al arrancar (parser propio en `config.ts`). **Si cambiás el `.env`, reiniciá el backend** — `tsx watch` no recarga con cambios en `.env`, solo con archivos `.ts`.

## Login con Google (OAuth)

El sitio real de CABA (Odoo 12, `shop.caba.org.ar`) tiene login con Google vía el módulo `auth_oauth`. Replicamos ese flujo en nuestro proxy.

### Cómo funciona

1. Frontend → botón "Ingresar con Google" → `GET /api/auth/google` → redirige a Google con **nuestro** `client_id`.
2. Google vuelve a `GET /api/auth/google/callback` con un `code`.
3. El backend intercambia el `code` por un `access_token` en Google.
4. El backend hace `GET /auth_oauth/signin` de Odoo con ese token (ver `OdooClient.loginWithOauthToken`). Odoo valida el token, resuelve el usuario por su `oauth_uid` y devuelve una sesión.
5. Sellamos el `session_id` de Odoo en nuestra cookie, igual que en el login con contraseña.

> Nota técnica: Odoo 12 **NO valida el `audience`** del token (el chequeo está comentado en su código fuente de `auth_oauth`), por eso un token emitido por *nuestro* `client_id` es aceptado aunque el sitio real use otro.

### Variables de entorno (`backend/.env`)

```
GOOGLE_CLIENT_ID=...          # OAuth Client ID (tipo "Web application")
GOOGLE_CLIENT_SECRET=...      # Secreto del cliente
GOOGLE_REDIRECT_URI=http://localhost:5173/api/auth/google/callback   # prod: https://caba-reservations.vercel.app/api/auth/google/callback
GOOGLE_ODOO_PROVIDER_ID=3     # ID del provider de Google en la config de Odoo de CABA
SESSION_SECRET=...            # secreto para firmar/encriptar la cookie de sesión
```

En **prod (Vercel)** estas vars se cargan en Settings → Environment Variables (con la `GOOGLE_REDIRECT_URI` de prod).

### Google Cloud Console

- Pantalla de consentimiento OAuth: scopes `userinfo.email` + `userinfo.profile` (no sensibles).
- Cliente OAuth tipo **Web application** con estas **Authorized redirect URIs**:
  - `http://localhost:5173/api/auth/google/callback` (dev)
  - `https://caba-reservations.vercel.app/api/auth/google/callback` (prod)
- La redirect URI apunta a **:5173** (Vite), no a :3000, porque en dev el browser habla con Vite y este proxea `/api` al backend. La cookie se setea en el origin de la app.

### Estado actual y cómo habilitarlo "bien" a futuro

- **Solo miembros existentes**: `OdooClient.loginWithOauthToken` pasa `no_user_creation: true` en el `state`, así Odoo **NO auto-crea** cuentas nuevas. Solo puede entrar quien ya sea miembro de CABA con su cuenta de Google linkeada en el sitio real. El sitio real SÍ permite alta automática; nosotros lo restringimos a propósito. Para permitir alta automática, quitar ese flag.
- **App en modo "Testing"**: hoy solo pueden entrar los mails cargados en "Público" → Usuarios de prueba (hasta 100).
- **Para abrirlo a cualquiera**: en Google Console → "Público" → **Publicar app**. Como los scopes son no sensibles, la publicación es instantánea (sin verificación de Google). Igual, la barrera real de acceso la sigue poniendo Odoo (solo miembros).

## Reservas (allowlist)

La reserva online de turnos está habilitada **solo para los emails de una allowlist**, no para todos.

- Var de entorno: `RESERVAS_ALLOWLIST` (emails coma-separados; vacío = nadie puede reservar).
  Ej: `RESERVAS_ALLOWLIST=lucasperazzi98@gmail.com,otro@mail.com`
- **Barrera real en el backend**: `POST /api/turnos/:id/reservar` rechaza con 403 si el email no está en la lista (`canReserve()` en `config.ts`).
- **Frontend**: el backend expone `puedeReservar` en `/api/me` y en el login; `TurnosPage` usa ese flag para habilitar/deshabilitar el botón de confirmar.
- Para habilitar a más gente, agregá su email a `RESERVAS_ALLOWLIST` (en `backend/.env` para dev y en Vercel para prod) y reiniciá/redeployá. No hace falta tocar código.
