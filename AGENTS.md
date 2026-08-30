# Reglas del proyecto — caba-reservations

## Git

- **NO commitear ni pushear a menos que el usuario lo pida explícitamente.**

## Desarrollo

- Los `node_modules` viven en la raíz (npm workspaces). **Siempre correr `npm install` desde la raíz**, no desde `backend/` o `frontend/`.
- Para levantar los servers, usar los scripts de la raíz:
  - `npm run dev:backend` (Hono en :3000)
  - `npm run dev:frontend` (Vite en :5173)
- Node 20 requerido (instalado en `~/.n/bin` vía `n`).**
