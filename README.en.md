<div align="center">

# ✈️ AeroConnect

**The complete management platform for flying clubs and ULM clubs.**

Bookings, fleet, members and the official flight logbook — in a single application.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-007ACC?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=black)](https://supabase.com)
[![Licence](https://img.shields.io/badge/License-Proprietary-red?style=flat-square)](./LICENSE)

[🇫🇷 Français](./README.md) · 🇬🇧 English

</div>

---

> [!IMPORTANT]
> **This repository is public, but the software is not open source.**
> The code is available for reading, auditing and evaluation only.
> Production use, copying, forking, modification and commercial exploitation are
> prohibited without prior written permission. See [LICENSE](./LICENSE).

---

## 📋 Table of contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech stack](#-tech-stack)
- [Architecture](#-architecture)
- [Security model](#-security-model)
- [Getting started](#-getting-started)
- [Environment variables](#-environment-variables)
- [Available scripts](#-available-scripts)
- [Testing](#-testing)
- [Database & migrations](#-database--migrations)
- [Project structure](#-project-structure)
- [Deployment](#-deployment)
- [Roadmap](#-roadmap)
- [Changelog](#-changelog)
- [Security](#-security)
- [Contributing](#-contributing)
- [License](#-license)
- [Contact](#-contact)

---

## 🎯 Overview

AeroConnect centralises the day-to-day administration of a light aviation club:

- **scheduling** — who flies, with which instructor, on which aircraft;
- **the fleet** — availability, remaining potential and maintenance deadlines;
- **members** — roles, ULM class ratings, access restrictions;
- **the flight logbook** — entry, signature and PDF export of completed flights;
- **discovery flights** — a public booking page requiring no account.

The application is **multi-tenant**: each club (`clubID`) is isolated, and a user
never reaches another club's data.

The UI, error messages and code comments are written **in French** — this is a
project convention and must be preserved in any change.

---

## ✨ Features

### 📅 Scheduling & bookings

- Interactive weekly calendar: hour grid on desktop, dedicated mobile view,
  week-by-week navigation and a quick jump back to today.
- Slot filters and **PDF export of the schedule**.
- Instructor ↔ student sessions, with or without an assigned aircraft.
- **Recurring sessions** (`finalReccurence`) for regular slots.
- Per-club sign-up and cancellation windows (`preSubscribe`, `preUnsubscribe`,
  delays in minutes).
- Configurable opening days, hour ranges and slot granularity
  (`DaysOn`, `HoursOn`, `AvailableMinutes`, `SessionDurationMin`).
- Past-session protection: expired slots can no longer be freely modified.
- Flight natures: `TRAINING`, `PRIVATE`, `SIGHTSEEING`, `DISCOVERY`, `EXAM`.

### 🛩️ Fleet & maintenance

- Aircraft records with photo (Supabase Storage), ULM class and usage
  (`INSTRUCTION`, `LOCATION`, `CLUB`).
- Automatic filtering of the aircraft offered, based on the pilot's ratings.
- **Maintenance tasks** per aircraft (`MaintenanceTask`), with deadlines driven by
  **flight hours** and/or a **period in months**.
- Aircraft visibility controlled by the club (hiding, usage restriction).

### 📖 Flight logbook

- Official flight register, deliberately **denormalised**: pilot, instructor,
  student and aircraft are copied into every row so history survives deletions
  and renames.
- On-board functions (`EP` / `P` / `I`), flight nature (`CDB` / `INSTRUCTION`) and
  instruction sub-types (`LOCAL`, `NAVIGATION`, `LACHE`, `BAPTEME`, `EXAM`).
- **Pilot signature** (`pilotSigned` + `pilotSignedAt`) locks the row; only the
  roles in `SIGN_OVERRIDE_ROLES` may still amend it.
- Hobbs meter validation (start/end consistency, computed duration).
- `REGULATION_START` and `LEGACY_SIGNED_BEFORE` constants
  (`src/api/db/logbook.ts`) decide which rule set applies to a given flight date.
- **PDF exports** (`src/components/pdf/`): pilot logbook, aircraft logbook,
  schedule, maintenance sheet and booking QR code.

### 👥 Members & administration

- 7 roles: `USER`, `STUDENT`, `PILOT`, `OWNER`, `ADMIN`, `INSTRUCTOR`, `MANAGER`.
- **6 ULM classes** — paramotor, weight-shift, fixed-wing, gyroplane, aerostat,
  helicopter (`src/config/config.ts`) — with per-pilot restrictions and clearances.
- Club membership requests (`clubIDRequest`) approved by the management team.
- **Soft delete**: deactivate a member without losing their flight history.
- Individual access restriction (`restricted`).
- Full club configuration: address, default airfield, contacts, allowed classes.

### 🎈 Discovery flights

- **Public booking page** (`/reservation/[clubID]/[token]`), accessible without an
  account.
- The link is protected by a token (`publicBookingToken`); regenerating it
  immediately invalidates the previous URL. Restricted to `ADMIN` / `OWNER`.
- **Hold mechanism with TTL** (`expiresAt`) that temporarily reserves the slot
  while the request awaits approval.
- Lifecycle: `PENDING` → `CONFIRMED` / `REJECTED` / `EXPIRED`, with a confirmation
  email sent to the customer.
- Spam protection via **Cloudflare Turnstile**.

### 📊 Dashboard & experience

- Flight statistics and charts (Recharts).
- **Responsive** design — mobile, tablet and desktop (sidebar + bottom bar).
- Light / dark theme (`next-themes`).
- Transactional emails built with React Email and delivered through Resend.
- **QR code** generation for sharing the public booking link.

---

## 🛠 Tech stack

| Area | Technologies |
| :--- | :--- |
| **Framework** | Next.js 16 (App Router, Server Actions), React 19, TypeScript 5 |
| **Database** | PostgreSQL, Prisma 6 |
| **Authentication** | Supabase Auth (`@supabase/ssr`), cookies refreshed by middleware |
| **Storage** | Supabase Storage (aircraft photos) |
| **UI** | Tailwind CSS, ShadcnUI (Radix), HeroUI, Framer Motion, Lucide |
| **Forms** | react-hook-form + Zod (`src/schemas/`) |
| **Client data** | SWR |
| **Email** | React Email + Resend |
| **PDF** | @react-pdf/renderer, pdfkit-next |
| **Charts** | Recharts |
| **Anti-abuse** | Cloudflare Turnstile |
| **Testing** | Vitest, Testing Library, jsdom |
| **Quality** | ESLint (`next/core-web-vitals` + `next/typescript`) |

> **Note:** Radix/Shadcn **and** HeroUI coexist intentionally. Before adding a
> component to an existing feature, check which primitive family it already uses
> and stay consistent.

---

## 🏗 Architecture

### Routing (App Router)

```
src/app/
├── (protected)/          # Authenticated group — layout.tsx guards the door
│   ├── calendar/         # Scheduling and bookings
│   ├── dashboard/        # Overview and statistics
│   ├── flights/          # Flight sessions
│   ├── logbook/          # Official flight logbook
│   ├── planes/           # Fleet and maintenance
│   ├── profile/          # User profile
│   └── students/         # Student tracking
├── auth/                 # login, register, forgot/newPassword, confirm
├── context/              # React providers (current user, current club)
└── reservation/          # Public discovery-flight page (unauthenticated)
    └── [clubID]/[token]/
```

The `(protected)/` layout calls `getUser()` (Supabase + Prisma) and redirects to
`/auth/login` when there is no session. It then mounts the `CurrentUserWrapper` /
`CurrentClubWrapper` providers, `UpdateContext` and the navigation shell.
**Every new authenticated page belongs under `(protected)/`.**

The root `/` redirects to `/calendar?clubID=…` when a session exists, and to
`/auth/login` otherwise.

### Data layer

All database access is gathered in `src/api/db/`:

| File | Responsibility |
| :--- | :--- |
| `users.ts` | Users, roles, `requireAuth` |
| `sessions.ts` | Slots and bookings |
| `planes.ts` | Fleet |
| `club.ts` | Club configuration |
| `logbook.ts` | Flight logbook and signatures |
| `maintenance.ts` | Maintenance tasks |
| `bapteme.ts` / `baptemeHold.ts` | Discovery flights and temporary holds |

Every file is marked `"use server"` and exports **Server Actions** consumed
directly by client components. The Prisma client is a global singleton: always
import `prisma` from `@/api/prisma`, never instantiate `new PrismaClient()`.

Server Actions return `{ error: string }` or `{ success: string, ... }`; callers
narrow with `'error' in result`.

### Path alias

`@/*` resolves to `./src/*` (declared in both `tsconfig.json` **and**
`vitest.config.mts`). Prefer it over long relative imports.

---

## 🔐 Security model

Three safeguards stack up — and the application is the **only** barrier, since the
database has no row-level security.

**1. The root middleware** (`middleware.ts`) calls `updateSession` on every
non-static request to refresh the Supabase cookie. When adding new static asset
extensions, preserve the `matcher`.

**2. `requireAuth(allowedRoles?)`** (`src/api/db/users.ts`) is the **single
authorization gate**. It reads the Supabase user, loads the matching `User` row
through Prisma, then optionally enforces a role allow-list. Every new Server
Action touching data starts with:

```ts
const auth = await requireAuth([...]);
if ('error' in auth) return { error: auth.error };
```

Role allow-lists are declared at the top of each module (`MANAGEMENT_ROLES`,
`ADMIN_ROLES`, `LOGBOOK_WRITE_ROLES`, `SIGN_OVERRIDE_ROLES`) — reuse them rather
than redefining role sets inline.

**3. Tenant isolation via `clubID`.** After `requireAuth`, every action must check
`auth.user.clubID === resource.clubID` before reading or mutating. Dedicated tests
cover this rule (`src/api/__tests__/clubIsolation.test.ts`).

---

## 🚀 Getting started

### Prerequisites

- **Node.js 22.x** (see `.nvmrc`)
- A **PostgreSQL** database (typically provided by Supabase)
- A **Supabase** project (Auth + Storage)
- A **Resend** API key for outgoing email
- A **Cloudflare Turnstile** key pair (public discovery-flight page)

### Installation

```bash
git clone https://github.com/jpthibault20/aeroconnect.git
cd aeroconnect

nvm use                 # Node 22.x
npm install             # `postinstall` runs `prisma generate` automatically
```

### Configuration

Create a `.env` file at the repository root using the
[Environment variables](#-environment-variables) section below.

### Database

```bash
npx prisma migrate deploy   # apply existing migrations
npm run seed:month          # (optional) demo dataset
```

### Run

```bash
npm run dev                 # http://localhost:3000
```

---

## 🔑 Environment variables

| Variable | Required | Description |
| :--- | :---: | :--- |
| `DATABASE_URL` | ✅ | **Pooled** PostgreSQL connection used by the application. |
| `DIRECT_URL` | ✅ | **Direct** (non-pooled) connection, required by Prisma migrations. |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL. Also used to allow the image host in `next.config.mjs`. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✅ | Supabase publishable key (current format). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ⚠️ | Supabase anon key (legacy format, fallback). |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service-role key — **server only, never expose it to the client**. |
| `NEXT_PUBLIC_APP_URL` | ✅ | Public application URL (email links, auth redirects). |
| `WEBSITE_LINK` | ✅ | Marketing site link, used in email templates. |
| `RESEND_API_KEY` | ✅ | Resend API key. |
| `SENDER_EMAIL` | ✅ | From address for transactional email. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | ✅ | Cloudflare Turnstile site key. |
| `TURNSTILE_SECRET_KEY` | ✅ | Cloudflare Turnstile secret key (server-side verification). |
| `NODE_ENV` | — | Managed by Next.js; set it manually only for a special case. |

> [!WARNING]
> `.env` and `.env.local` are git-ignored and must stay that way.
> `SUPABASE_SERVICE_ROLE_KEY` bypasses every Supabase access rule: it must never
> be prefixed with `NEXT_PUBLIC_` nor reach the browser.

---

## 📜 Available scripts

| Command | Effect |
| :--- | :--- |
| `npm run dev` | Next.js development server. |
| `npm run build` | Production build; `postbuild` then runs `prisma migrate deploy`. |
| `npm start` | Production server. |
| `npm run lint` | ESLint. |
| `npm test` | Vitest in watch mode. |
| `npm run test:run` | Single Vitest run (use this in CI). |
| `npm run email` | Preview the React Email templates. |
| `npm run migrate:prod` | `prisma migrate deploy`. |
| `npm run seed:month` | Demo dataset for the current month. |

Useful Prisma commands:

```bash
npx prisma migrate dev --name <name>   # create a migration locally
npx prisma migrate deploy              # apply pending migrations
npx prisma generate                    # regenerate the client (auto on postinstall)
npx prisma studio                      # database browser
```

---

## 🧪 Testing

Vitest runs in the `node` environment with globals enabled
(`vitest.config.mts`). Tests are co-located under `src/**/__tests__/`.

```bash
npm run test:run                                       # full suite
npx vitest run src/api/__tests__/businessRules.test.ts # one file
npx vitest run -t "TRAINING -> INSTRUCTION"            # by test name
```

**Data-layer tests do not hit Postgres.** They exercise pure helpers and business
rules against hand-built `User` / `planes` / `flight_sessions` objects. Follow
that pattern: factor logic out of Server Actions into pure functions, then unit
test those.

`@testing-library/jest-dom` matchers are wired up in `src/__tests__/setup.ts`.
`jsdom` is installed, but since the default environment is `node`, component test
files opt in explicitly with `// @vitest-environment jsdom` on the first line.

The suite notably covers club isolation, the per-role permission matrix, logbook
rules, Hobbs validation, past-session protection and the auth schemas.

---

## 🗄 Database & migrations

### Core models

| Model | Role |
| :--- | :--- |
| `User` | Club member: `clubID`, `role`, `classes` (`Int[]` of ULM classes). |
| `Club` | Club configuration: hours, booking windows, contacts, public token. |
| `planes` | Fleet aircraft, with usage and class. |
| `flight_sessions` | Booked slots (instructor + optional student + aircraft). |
| `flight_logs` | Official flight logbook — denormalised and signable. |
| `MaintenanceTask` | Per-aircraft maintenance deadlines (hours and/or months). |
| `BaptemeRequest` | Discovery-flight requests coming from the public page. |

### Migration rules

- Active migrations live in `prisma/migrations/`.
- Older history was **squashed** and moved to `prisma/migrations_old_backup/` —
  **never copy** from that folder when authoring a new migration.
- `DIRECT_URL` must be set: Prisma refuses to migrate through the pooler.

---

## 📁 Project structure

```
aeroconnect/
├── prisma/
│   ├── schema.prisma            # Data model
│   ├── migrations/              # Active migrations
│   ├── migrations_old_backup/   # Squashed history — do not reuse
│   └── seed*.ts                 # Demo datasets
├── src/
│   ├── api/
│   │   ├── db/                  # Server Actions (database access)
│   │   ├── global function/     # Shared helpers (dates, utils)
│   │   ├── client/              # Client-side helpers
│   │   └── prisma.ts            # Prisma singleton
│   ├── app/                     # App Router (see Architecture)
│   ├── components/              # Domain components + `ui/` (Shadcn)
│   ├── config/                  # Business constants (ULM classes, hours)
│   ├── emails/ · emails/        # React Email templates
│   ├── hooks/                   # React hooks
│   ├── lib/                     # Pure business logic (unit tested)
│   ├── schemas/                 # Zod schemas
│   ├── types/                   # Shared types
│   └── utils/supabase/          # Supabase factories (server / client / middleware)
├── public/ · static/            # Assets
├── script/                      # Operational utilities (Python)
├── middleware.ts                # Supabase session refresh
├── LICENSE                      # Proprietary source-available licence
└── CLAUDE.md                    # Guidance for coding agents
```

---

## 🚢 Deployment

The application deploys to any Next.js 16 compatible platform running Node 22.

1. Set every variable from the
   [Environment variables](#-environment-variables) section on the platform.
2. The build runs `next build`, then `postbuild` automatically applies
   `prisma migrate deploy` — pending migrations ship with the deployment.
3. Make sure `DIRECT_URL` is reachable from the build environment, otherwise the
   migration step will fail.
4. Check that the public Supabase Storage bucket serving aircraft photos matches
   the host allowed in `next.config.mjs`.

---

## 🔮 Roadmap

- [ ] **Payments** — Stripe integration for online settlement.
- [ ] **Rental** — aircraft rental module outside instruction.
- [ ] **Advanced maintenance** — technical groundings, automatic impact on
      existing bookings.
- [ ] **Communication** — internal club chat, targeted or group mailing.
- [ ] **Advanced profile** — detailed statistics and UI/UX redesign.
- [ ] **Mobile app** — React Native port.
- [ ] **Time synchronisation** — unified client/server offset handling.

---

## 📝 Changelog

The detailed history is kept in [`Version.md`](./Version.md) (French).

### v3.6 — *August 2026* (current)

- Official flight logbook: signatures, Hobbs validation, PDF export.
- Discovery flights: public booking page with a revocable token and TTL hold.
- Per-aircraft maintenance tracking (hour- and month-based deadlines).
- Public discovery-flight page redesign, calendar opening fixes.

### v2.0.x

- Full interface redesign (UI/UX).

### v1.4.x

- STEX feature, version view.

### v1.3.x — first commercial release

- "No aircraft" sign-up and the matching user configuration.

### v1.2.x

- 6 ULM classes, user soft delete, calendar improvements.

### v1.1.x — *January 2025*

- Initial release: authentication, club/user creation, basic sessions.

---

## 🛡 Security

If you discover a vulnerability, **do not open a public issue**.
Email [thibault@jp-developpement.com](mailto:thibault@jp-developpement.com)
directly with a description and, if possible, reproduction steps.

Responsible disclosure is welcome and will receive a prompt reply.

---

## 🤝 Contributing

This project is developed and maintained **exclusively** by its author. External
contributions are neither solicited nor accepted, and pull requests will be closed
without being merged.

**Bug reports** and **usage feedback** are very welcome, though — use GitHub
issues, or the address above.

---

## 📄 License

**Proprietary — All rights reserved.** © 2025-2026 Thibault JEANPIERRE.

The code in this repository is *source-available*: freely **readable**, but **not
open source**. Reading, auditing and local personal evaluation are permitted.
Production use, copying, forking, modification, redistribution and any commercial
exploitation — SaaS included — are prohibited without prior written permission.

Deploying it within a flying club or ULM club requires a separate **commercial
licence**. See [LICENSE](./LICENSE) for the full terms.

Third-party libraries remain governed by their respective licences (see
`package.json`).

---

## 📞 Contact

**Thibault JEANPIERRE**

📧 [thibault@jp-developpement.com](mailto:thibault@jp-developpement.com)
🐙 [@jpthibault20](https://github.com/jpthibault20)

For any question, demo request, commercial licence quote or technical feedback —
get in touch.
