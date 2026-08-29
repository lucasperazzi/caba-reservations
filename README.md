# caba-reservations

App para ver y reservar turnos del Centro Andino Buenos Aires (C.A.B.A.) de forma
más rápida y con mejores filtros. Es un **proxy (BFF)** sobre el sitio actual de
CABA (Odoo 12): la disponibilidad y las reservas siguen viviendo en Odoo; esta app
solo le pone una interfaz moderna encima.

> No oficial. Requiere una cuenta válida del sitio de CABA para reservar.

## Estructura (monorepo)

```
caba-reservations/
├── backend/     # BFF: Node + TypeScript + Hono. Habla con Odoo.
└── frontend/    # UI: React + Vite + TypeScript + Tailwind + TanStack Query.
```

## Requisitos

- Node.js 20+

## Desarrollo

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (en otra terminal)
cd frontend
npm install
npm run dev
```

## Arquitectura

```
React + Vite (frontend)  ──fetch──▶  Node + Hono (backend/BFF)  ──▶  Odoo 12 (shop.caba.org.ar)
```

- **Leer turnos:** el backend consulta la API JSON-RPC de Odoo (`/web/dataset/call_kw`).
- **Reservar:** el backend replica el flujo web de Odoo (login → registration/new → registration/confirm).

## Notas de seguridad

- Las contraseñas de los usuarios se usan de forma transitoria (solo para autenticar
  contra Odoo) y **nunca** se almacenan.
- Los secretos (cuenta de servicio, etc.) van en variables de entorno, nunca en el código.
