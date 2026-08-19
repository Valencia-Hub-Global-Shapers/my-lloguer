# MyLloguer — agent guide

Map-first rental classifieds for València + ~20 km metro area. Next.js 15 (App Router) + TypeScript + Tailwind v4 + Supabase (Postgres/PostGIS, Auth, Storage) + Mapbox GL + supercluster.

## Commands

```bash
npm run dev            # Next dev server
npm run build          # production build (must stay green)
npm run typecheck      # tsc --noEmit (must stay green)
npm run lint           # eslint
npm test               # vitest unit tests (schemas, params, geocode)
npm run test:rls       # RLS/transition smoke test — needs local supabase running + seeded
npm run supabase:start # local stack (Docker required)
npm run db:reset       # re-apply migrations + seed
```

## Local setup

Dev runs against the **cloud Supabase project** — no Docker required. `.env` holds the cloud keys (Supabase URL/anon key, Mapbox, Upstash). Do not create `.env.local` (it would override `.env`).

1. Apply migrations to the cloud project (one time, or after adding migrations):
   `npx supabase link --project-ref oivdjumiwtppxuvpirab && npx supabase db push`
2. Optional demo data: run `supabase/seed.sql` in the dashboard SQL Editor (creates `admin@mylloguer.dev` / `publisher@mylloguer.dev`, password `password123`, and 40 listings).
3. In the cloud dashboard (Authentication → URL Configuration) add `http://localhost:3000/auth/callback` to redirect URLs for Google OAuth. The email login form on `/login` only works if the seed users exist.
4. `npm run dev`.
5. The Docker-based local stack (`npm run supabase:start`, `db:reset`, `test:rls`) still works but is optional; `test:rls` assumes the local stack.

## Architecture

- `src/app` — routing only (thin). Locale segment `[locale]` (es default, ca = "Valencià", en). Pages/layouts are RSC; `"use client"` only at leaves (map, filters, forms, sheets).
- `src/features/<name>/{components,server,schemas.ts,types.ts}` — features never import each other's `server/` modules; shared code lives in `src/lib`.
- `src/lib/supabase/{server,client,middleware}.ts` — single entry points. **No service-role key anywhere**; privileged work runs in security-definer DB functions.
- `src/components/ui` — shadcn-style primitives (Tailwind v4, CSS vars in `globals.css`). Accent color `#E8590C` reserved for CTAs/price/active markers.
- Server actions return `Result<T>` (`src/lib/result.ts`) with i18n error keys — never throw to the client. Validate with the Zod schema from `features/*/schemas.ts` (same schema shared with react-hook-form).

## Data & security (critical invariants)

- All mutations go through server actions + RLS. Public reads use the `public_listings` / `public_profiles` **security-definer views**; the base `listings` table is owner/admin only. `location` (exact coords) must never appear in public queries — only `public_lat/lng` (snapped to 3 decimals by trigger at write time).
- "Owner edit of an approved listing ⇒ status back to `pending`" is enforced by the `enforce_listing_transitions` DB trigger, not by app code. Owner-allowed transitions: approved→draft (deactivate), draft/rejected/expired→pending (republish), any→deleted. Admin bypasses the trigger. Security-definer internals bypass it via the `mylloguer.internal` GUC.
- `database.types.ts` is hand-maintained to match `supabase/migrations` (use `type`, not `interface` — Supabase's `GenericSchema` constraint requires implicit index signatures). Regenerate with `npx supabase gen types typescript --local` when the schema changes, then reconcile.
- Rate limiting (Upstash) in `src/lib/rate-limit.ts`: publish 5/day, edits 20/day, views 30/min/IP. No-ops when env vars are empty (local dev). Fail closed on mutations, fail open on views.
- Photos: Supabase Storage bucket `listing-photos` (public read, owner-folder writes `<uid>/<listing|draft>/<file>.webp`), ≤8 photos, ≤5 MB, client downscales to ≤1600 px WebP.

## Conventions

- i18n: all UI copy via dictionaries in `src/i18n/*.json` (same keys in all three). Server components use `getDictionary`, client components `useI18n()` (`t("a.b", { var })`). Descriptions render as plain text only.
- Filter state lives only in URL searchParams (`src/features/search/params.ts`).
- Migrations are append-only files in `supabase/migrations`; `supabase/seed.sql` must stay reproducible via `db reset`.
- Neighborhood names are stored in Valencian (`name_ca`) on listings; the filter maps slug → `name_ca`.

## Known MVP shortcuts

- Detail page is a full page, not the panel overlay from the UX blueprint (still deep-linkable).
- Admin notifications = pending-count badge on the moderation nav link.
- pg_cron is optional locally; public reads also filter `expires_at` as belt-and-braces. `expire_listings()` can be called manually.
- Email sign-in form on `/login` exists for local dev/demo accounts; production login is Google-only per plan.
