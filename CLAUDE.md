# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

AeroConnect — Next.js app for managing flying club / ULM-club operations: bookings, fleet, members, flight logbook. UI strings, error messages, and comments are written in French; preserve that convention when editing user-facing text.

## Commands

- `npm run dev` — local dev server (Next.js)
- `npm run build` — production build (runs `prisma migrate deploy` afterward via `postbuild`)
- `npm run lint` — ESLint (`next/core-web-vitals` + `next/typescript`)
- `npm test` — Vitest in watch mode
- `npm run test:run` — single Vitest run (use this in CI / non-interactive)
- Run a single test file: `npx vitest run src/api/__tests__/businessRules.test.ts`
- Run by name: `npx vitest run -t "TRAINING -> INSTRUCTION"`
- `npx prisma migrate dev --name <name>` — create a new migration locally
- `npx prisma migrate deploy` — apply pending migrations (also auto-run on `postbuild`)
- `npx prisma generate` — regenerate the client (auto-run on `postinstall`)
- `npm run email` — preview React Email templates (`emails/` and `src/emails/`)

Node version is pinned to `22.x` (`.nvmrc`).

## Architecture

### Routing & layout (Next.js App Router)
- `src/app/(protected)/` is an authenticated route group. Its `layout.tsx` calls `getUser()` (Supabase + Prisma) and redirects to `/auth/login` if there is no session. It then wraps children in `CurrentUserWrapper` / `CurrentClubWrapper` context providers, mounts `UpdateContext`, and renders `Navigation` (sidebar + bottom navbar). Any new authenticated page goes under `(protected)/`.
- `src/app/auth/*` holds login, register, forgot/new password, and the email-confirmation route handler.
- The root `middleware.ts` calls `updateSession` (`src/utils/supabase/middleware.ts`) on every non-static request to refresh the Supabase auth cookie.
- The root `/` page redirects authenticated users to `/calendar?clubID=…` and unauthenticated users to `/auth/login`.

### Server actions & DB layer
- All database access lives in `src/api/db/{users,sessions,planes,club,logbook}.ts`. Every file is `"use server"` and exports server actions consumed directly from client components.
- `requireAuth(allowedRoles?)` in `src/api/db/users.ts` is the **single authorization gate**. It (1) reads the Supabase user, (2) loads the matching `User` row from Prisma, (3) optionally enforces a role allow-list. Every new server action that touches data must start with `const auth = await requireAuth([...]); if ('error' in auth) return { error: auth.error };`.
- Role allow-lists are declared at the top of each module (e.g. `MANAGEMENT_ROLES`, `ADMIN_ROLES`, `LOGBOOK_WRITE_ROLES`, `SIGN_OVERRIDE_ROLES`). Reuse them rather than redefining role sets inline.
- Multi-tenancy is enforced by `clubID`: after `requireAuth`, server actions must check `auth.user.clubID === resource.clubID` before reading or mutating. There is no row-level security in the DB — the application is the only barrier.
- The Prisma client is a global singleton (`src/api/prisma.ts`) — always `import prisma from '@/api/prisma'`, never `new PrismaClient()`.
- Server actions return `{ error: string }` or `{ success: string, ... }` shapes; callers narrow with `'error' in result`. Keep that convention.

### Domain model (`prisma/schema.prisma`)
- `User` carries `clubID`, `role` (`userRole` enum: USER / STUDENT / PILOT / OWNER / ADMIN / INSTRUCTOR / MANAGER), and an `Int[] classes` field listing which ULM classes the user is rated on.
- `flight_sessions` are bookings (instructor + optional student + plane(s)). They store `natureOfTheft NatureOfTheft[]` (with the `flightType` legacy column also of type `NatureOfTheft`) and an optional `finalReccurence` for repeating sessions.
- `flight_logs` is the official logbook. It is largely denormalized (pilot/instructor/student/plane fields are copied in) so historical entries survive deletes and renames. `pilotSigned` + `pilotSignedAt` lock a row; only `SIGN_OVERRIDE_ROLES` may modify a signed log. Constants `REGULATION_START` (2025-07-01) and `LEGACY_SIGNED_BEFORE` (2026-05-06) in `src/api/db/logbook.ts` gate which rules apply to a given date.
- `Club` holds club-wide booking config (DaysOn, HoursOn, AvailableMinutes, SessionDurationMin, pre/un-subscribe windows).
- `MaintenanceTask` is per-plane and tracks interval-based maintenance (hours and/or months).
- The 6 ULM classes are enumerated in `src/config/config.ts` (`aircraftClasses`); use these IDs (1–6) consistently.

### Migrations
- Active migrations live in `prisma/migrations/`; older history was squashed and moved to `prisma/migrations_old_backup/` — do **not** copy from the backup folder when authoring a new migration.
- `DATABASE_URL` is the pooled connection; `directUrl` (`DIRECT_URL`) is required for migrations. Both must be set.

### Auth (Supabase)
- `src/utils/supabase/{server,client,middleware}.ts` are the three Supabase factories. Server actions and route handlers use `server.ts`; client components use `client.ts`; the root middleware uses `middleware.ts`.
- The session cookie is refreshed on every request by the root middleware — preserve the matcher in `middleware.ts` when adding new static asset extensions.

### UI
- Tailwind + ShadcnUI primitives live in `src/components/ui/`. Higher-level feature components are organized by domain (`calendar/`, `dashboard/`, `flights/`, `logbook/`, `plane/`, `students/`, `auth/`).
- HeroUI components (`@heroui/*`) are also in use alongside Radix/Shadcn — both are intentional; check existing usage in a feature before picking a primitive.
- Forms use `react-hook-form` + `zod` schemas from `src/schemas/`.
- Email templates are React Email components in `src/emails/` and `emails/`, sent via Resend.

### Path alias
- `@/*` resolves to `./src/*` (configured in both `tsconfig.json` and `vitest.config.mts`). Use it instead of long relative imports.

## Testing

- Vitest runs in the `node` environment with globals enabled (see `vitest.config.mts`). Tests are co-located under `src/**/__tests__/*.test.ts(x)`.
- DB-layer tests do **not** hit Postgres — they exercise pure helpers (e.g. `mapFlightType`, `getFreePlanesUsers`) and business-rule logic with hand-built `User` / `planes` / `flight_sessions` objects. Follow this pattern: factor logic out of server actions into pure functions, then unit-test those.
- `@testing-library/jest-dom` matchers are wired up in `src/__tests__/setup.ts` for component tests; `jsdom` is installed but tests opt in per-file by setting `// @vitest-environment jsdom` since the default env is `node`.
