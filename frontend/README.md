# Frontend — App Deportivo (PWA)

Next.js (App Router) + Tailwind CSS v4 + Zustand. Tokens y componentes según
`../06_design_system.md`; arquitectura de información según `../04_sitemap_y_ux.md`.

## Correr en local

```bash
cp .env.example .env.local   # apunta al backend (api/v1 en :3000)
npm install
npm run dev                  # abre http://localhost:3001
```

Requiere el backend corriendo con datos del seed (`cd ../backend && npm run seed`).
La identidad es TEMPORAL: usuario demo del seed hasta que exista el módulo users (JWT).

## Estructura

- `src/app/` — rutas de los 5 tabs: `/` (Home), `/juego`, `/billetera`, `/tienda`, `/perfil`
- `src/components/ui/` — primitivas (estilo shadcn, escritas a mano con los tokens)
- `src/components/{layout,cards,economy,gamification,shared}/` — según 06_design_system.md §4
- `src/lib/api.ts` — cliente del contrato del backend · `src/lib/store.ts` — Zustand

## Notas Fase 1

- Tailwind v4 (CSS-first): los tokens viven en `src/app/globals.css` (`@theme`), no hay `tailwind.config.ts`.
- El CLI de shadcn no se usó (red restringida); las primitivas siguen sus patrones (cva + Slot).
- PWA: manifest instalable. Service worker/offline en fase posterior.
- Faltan los iconos `public/icon-192.png` y `public/icon-512.png` (placeholders del manifest).
