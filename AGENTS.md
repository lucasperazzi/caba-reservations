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

La reserva online de turnos está controlada por una allowlist de emails.

- Var de entorno: `RESERVAS_ALLOWLIST` (emails coma-separados).
  - **Vacío = reservas abiertas a todos** los usuarios logueados.
  - Con emails cargados, solo esos pueden reservar.
  - Ej: `RESERVAS_ALLOWLIST=lucasperazzi98@gmail.com,otro@mail.com`
- **Barrera real en el backend**: `POST /api/turnos/:id/reservar` rechaza con 403 si el email no está habilitado (`canReserve()` en `config.ts`).
- **Frontend**: el backend expone `puedeReservar` en `/api/me` y en el login; `TurnosPage` usa ese flag para habilitar/deshabilitar el botón de confirmar.
- Para restringir el acceso, agregá emails a `RESERVAS_ALLOWLIST` (en `backend/.env` para dev y en Vercel para prod) y reiniciá/redeployá. Para abrir a todos, dejá la var vacía. No hace falta tocar código.

## Tema claro/oscuro (allowlist)

El toggle "Modo claro/oscuro" del menú está controlado por una allowlist de emails (mismo patrón que `SHOP_ALLOWLIST`).

- Var de entorno: `TEMA_ALLOWLIST` (emails coma-separados).
  - **Vacío = nadie ve el toggle** (feature oculta — default seguro para prod).
  - Con emails cargados, solo esos usuarios ven el toggle en el menú.
  - Ej: `TEMA_ALLOWLIST=lucasperazzi98@gmail.com`
- **Backend**: expone `puedeCambiarTema` en `/api/me` y en el login (`canChangeTheme()` en `config.ts`).
- **Frontend**: `HomePage` muestra `ThemeToggle` solo si `user.puedeCambiarTema == true`. El tema elegido sigue persistiendo en `localStorage` (`caba_theme`) y el script anti-flash de `index.html` lo aplica antes del render.
- **Excepción — login**: `LoginPage` muestra un ícono sutil (sol/luna, `ThemeIconButton` en `theme.tsx`) en la esquina superior derecha que **NO** está atado a la allowlist (antes de loguearse no se conoce el email). Es decir, cualquiera puede cambiar el tema desde el login; para ocultarlo, quitar `<ThemeIconButton />` de `LoginPage`.
- Para habilitarlo en un entorno, cargá `TEMA_ALLOWLIST` (en `backend/.env` para dev y en Vercel para prod) y reiniciá/redeployá el backend.
