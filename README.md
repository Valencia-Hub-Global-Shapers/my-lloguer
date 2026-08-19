# MyLloguer

🏡 MyLloguer nace de una iniciativa de Global Shapers Valencia para juntar jóvenes en búsqueda de alquiler, con los mejores caseros que puedan encontrar.

Mapa primero: habitaciones y pisos entre particulares en València y área metropolitana (~20 km).

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind v4 · Supabase (Postgres/PostGIS, Auth, Storage) · Mapbox GL · supercluster · i18n es/ca/en

## Arranque local

El desarrollo usa el **proyecto cloud de Supabase** (sin Docker). Las claves viven en `.env` (no crees `.env.local`, tendría prioridad).

```bash
npm install
npx supabase link --project-ref oivdjumiwtppxuvpirab
npx supabase db push              # aplica las migraciones al proyecto cloud
npm run dev                       # http://localhost:3000
```

Datos demo opcionales: ejecuta `supabase/seed.sql` en el SQL Editor del dashboard (crea `admin@mylloguer.dev` / `publisher@mylloguer.dev`, password `password123`, y 40 anuncios). Para Google OAuth en local, añade `http://localhost:3000/auth/callback` en Authentication → URL Configuration del dashboard.

El stack local con Docker (`npm run supabase:start`, `db:reset`, `test:rls`) sigue disponible pero es opcional.

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev` / `build` / `lint` / `typecheck` | Ciclo habitual Next.js |
| `npm test` | Tests unitarios (vitest) |
| `npm run test:rls` | Smoke test de RLS y transiciones (requiere Supabase local) |
| `npm run supabase:start` / `stop` | Stack local Supabase |
| `npm run db:reset` | Reaplica migraciones + seed |

Más detalles para agentes en [AGENTS.md](AGENTS.md).
