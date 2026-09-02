<div align="center">

# ✈️ AeroConnect

**La solution complète de gestion pour aéroclubs et clubs d'ULM.**

Réservations, flotte, membres et carnet de route officiel — dans une seule application.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-007ACC?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=black)](https://supabase.com)
[![Licence](https://img.shields.io/badge/Licence-Propri%C3%A9taire-red?style=flat-square)](./LICENSE)

🇫🇷 Français · [🇬🇧 English](./README.en.md)

</div>

---

> [!IMPORTANT]
> **Ce dépôt est public mais le logiciel n'est pas open source.**
> Le code est consultable à des fins de lecture, d'audit et d'évaluation uniquement.
> Toute utilisation en production, copie, fork, modification ou exploitation commerciale
> est interdite sans autorisation écrite. Voir [LICENSE](./LICENSE).

---

## 📋 Sommaire

- [Présentation](#-présentation)
- [Fonctionnalités](#-fonctionnalités)
- [Stack technique](#-stack-technique)
- [Architecture](#-architecture)
- [Modèle de sécurité](#-modèle-de-sécurité)
- [Démarrage rapide](#-démarrage-rapide)
- [Variables d'environnement](#-variables-denvironnement)
- [Scripts disponibles](#-scripts-disponibles)
- [Tests](#-tests)
- [Base de données & migrations](#-base-de-données--migrations)
- [Structure du projet](#-structure-du-projet)
- [Déploiement](#-déploiement)
- [Roadmap](#-roadmap)
- [Changelog](#-changelog)
- [Sécurité](#-sécurité)
- [Contribuer](#-contribuer)
- [Licence](#-licence)
- [Contact](#-contact)

---

## 🎯 Présentation

AeroConnect centralise le quotidien administratif d'un club d'aviation légère :

- **le planning** — qui vole, avec quel instructeur, sur quelle machine ;
- **la flotte** — disponibilité, potentiels et échéances de maintenance ;
- **les membres** — rôles, qualifications de classe ULM, restrictions d'accès ;
- **le carnet de route** — saisie, signature et export PDF des vols réalisés ;
- **les baptêmes de l'air** — page publique de réservation, sans compte requis.

L'application est **multi-club** : chaque club (`clubID`) est cloisonné, et un
utilisateur n'accède jamais aux données d'un autre club.

L'interface, les messages d'erreur et les commentaires du code sont **en français** —
c'est une convention du projet, à préserver dans toute évolution.

---

## ✨ Fonctionnalités

### 📅 Planning & réservations

- Calendrier hebdomadaire interactif : grille horaire sur desktop, vue dédiée sur
  mobile, navigation semaine par semaine et retour rapide à aujourd'hui.
- Filtres sur les créneaux et **export PDF du planning**.
- Sessions instructeur ↔ élève, avec ou sans machine affectée.
- **Sessions récurrentes** (`finalReccurence`) pour les créneaux réguliers.
- Fenêtres d'inscription et de désinscription paramétrables par club
  (`preSubscribe`, `preUnsubscribe`, délais en minutes).
- Jours d'ouverture, plages horaires et granularité des créneaux configurables
  (`DaysOn`, `HoursOn`, `AvailableMinutes`, `SessionDurationMin`).
- Protection des sessions passées : les créneaux échus ne sont plus modifiables
  librement.
- Natures de vol : `TRAINING`, `PRIVATE`, `SIGHTSEEING`, `DISCOVERY`, `EXAM`.

### 🛩️ Flotte & maintenance

- Fiches machines avec photo (Supabase Storage), classe ULM et usage
  (`INSTRUCTION`, `LOCATION`, `CLUB`).
- Filtrage automatique des machines proposées selon les qualifications du pilote.
- **Tâches de maintenance** par machine (`MaintenanceTask`), avec échéances
  basées sur les **heures de vol** et/ou une **périodicité en mois**.
- Visibilité des machines pilotée par le club (masquage, restriction d'usage).

### 📖 Carnet de route (logbook)

- Registre officiel des vols, **dénormalisé** : pilote, instructeur, élève et
  machine sont recopiés dans chaque ligne, afin que l'historique survive aux
  suppressions et aux renommages.
- Fonctions de bord (`EP` / `P` / `I`), nature du vol (`CDB` / `INSTRUCTION`) et
  sous-types d'instruction (`LOCAL`, `NAVIGATION`, `LACHE`, `BAPTEME`, `EXAM`).
- **Signature pilote** (`pilotSigned` + `pilotSignedAt`) qui verrouille la ligne ;
  seuls les rôles de `SIGN_OVERRIDE_ROLES` peuvent encore l'amender.
- Validation des relevés Hobbs (cohérence départ / arrivée, durée calculée).
- Constantes `REGULATION_START` et `LEGACY_SIGNED_BEFORE`
  (`src/api/db/logbook.ts`) qui déterminent quel jeu de règles s'applique selon
  la date du vol.
- **Exports PDF** (`src/components/pdf/`) : carnet de route pilote, carnet
  machine, planning, fiche de maintenance et QR code de réservation.

### 👥 Membres & administration

- 7 rôles : `USER`, `STUDENT`, `PILOT`, `OWNER`, `ADMIN`, `INSTRUCTOR`, `MANAGER`.
- **6 classes ULM** — Paramoteur, Pendulaire, Multiaxe, Autogire, Aérostat,
  Hélicoptère (`src/config/config.ts`) — avec restrictions et autorisations par pilote.
- Demande de rattachement à un club (`clubIDRequest`) validée par l'équipe dirigeante.
- **Soft delete** : désactivation d'un membre sans perte de l'historique de vol.
- Restriction d'accès individuelle (`restricted`).
- Configuration complète du club : coordonnées, terrain par défaut, contacts,
  classes autorisées.

### 🎈 Baptêmes de l'air

- **Page publique de réservation** (`/reservation/[clubID]/[token]`), accessible
  sans compte.
- Le lien est protégé par un jeton (`publicBookingToken`) ; le régénérer invalide
  immédiatement l'ancienne URL. Réservé aux rôles `ADMIN` / `OWNER`.
- Mécanisme de **hold avec TTL** (`expiresAt`) qui réserve temporairement le
  créneau le temps de la validation.
- Cycle de vie : `PENDING` → `CONFIRMED` / `REJECTED` / `EXPIRED`, avec e-mail de
  confirmation au client.
- Protection anti-spam via **Cloudflare Turnstile**.

### 📊 Tableau de bord & expérience

- Statistiques de vol et graphiques (Recharts).
- Design **responsive** — mobile, tablette et desktop (sidebar + barre inférieure).
- Thème clair / sombre (`next-themes`).
- E-mails transactionnels en React Email, envoyés via Resend.
- Génération de **QR codes** pour le partage du lien public.

---

## 🛠 Stack technique

| Domaine | Technologies |
| :--- | :--- |
| **Framework** | Next.js 16 (App Router, Server Actions), React 19, TypeScript 5 |
| **Base de données** | PostgreSQL, Prisma 6 |
| **Authentification** | Supabase Auth (`@supabase/ssr`), cookies rafraîchis par middleware |
| **Stockage** | Supabase Storage (photos de machines) |
| **UI** | Tailwind CSS, ShadcnUI (Radix), HeroUI, Framer Motion, Lucide |
| **Formulaires** | react-hook-form + Zod (`src/schemas/`) |
| **Données client** | SWR |
| **E-mails** | React Email + Resend |
| **PDF** | @react-pdf/renderer, pdfkit-next |
| **Graphiques** | Recharts |
| **Anti-abus** | Cloudflare Turnstile |
| **Tests** | Vitest, Testing Library, jsdom |
| **Qualité** | ESLint (`next/core-web-vitals` + `next/typescript`) |

> **Note :** Radix/Shadcn **et** HeroUI coexistent volontairement. Avant d'ajouter
> un composant à une fonctionnalité existante, vérifiez quelle famille de
> primitives y est déjà employée et restez cohérent.

---

## 🏗 Architecture

### Routage (App Router)

```
src/app/
├── (protected)/          # Groupe authentifié — layout.tsx garde la porte
│   ├── calendar/         # Planning et réservations
│   ├── dashboard/        # Vue d'ensemble et statistiques
│   ├── flights/          # Sessions de vol
│   ├── logbook/          # Carnet de route officiel
│   ├── planes/           # Flotte et maintenance
│   ├── profile/          # Profil utilisateur
│   └── students/         # Suivi des élèves
├── auth/                 # login, register, forgot/newPassword, confirm
├── context/              # Providers React (utilisateur courant, club courant)
└── reservation/          # Page publique de baptême (hors authentification)
    └── [clubID]/[token]/
```

Le layout de `(protected)/` appelle `getUser()` (Supabase + Prisma) et redirige
vers `/auth/login` en l'absence de session. Il monte ensuite les providers
`CurrentUserWrapper` / `CurrentClubWrapper`, le `UpdateContext` et la navigation.
**Toute nouvelle page authentifiée doit vivre sous `(protected)/`.**

La racine `/` redirige vers `/calendar?clubID=…` si une session existe, vers
`/auth/login` sinon.

### Couche données

Tout l'accès base de données est regroupé dans `src/api/db/` :

| Fichier | Responsabilité |
| :--- | :--- |
| `users.ts` | Utilisateurs, rôles, `requireAuth` |
| `sessions.ts` | Créneaux et réservations |
| `planes.ts` | Flotte |
| `club.ts` | Configuration du club |
| `logbook.ts` | Carnet de route et signatures |
| `maintenance.ts` | Tâches de maintenance |
| `bapteme.ts` / `baptemeHold.ts` | Baptêmes et réservations temporaires |

Chaque fichier est marqué `"use server"` et exporte des **Server Actions**
consommées directement par les composants client. Le client Prisma est un
singleton global : importez toujours `prisma` depuis `@/api/prisma`, ne créez
jamais un `new PrismaClient()`.

Les Server Actions retournent `{ error: string }` ou `{ success: string, ... }` ;
les appelants discriminent avec `'error' in result`.

### Alias de chemin

`@/*` pointe vers `./src/*` (déclaré dans `tsconfig.json` **et**
`vitest.config.mts`). À utiliser plutôt que des chemins relatifs longs.

---

## 🔐 Modèle de sécurité

Trois garde-fous se cumulent — et l'application est **la seule** barrière, la base
n'ayant pas de row-level security.

**1. Le middleware racine** (`middleware.ts`) appelle `updateSession` sur chaque
requête non statique pour rafraîchir le cookie Supabase. En ajoutant de nouvelles
extensions d'assets, préservez le `matcher`.

**2. `requireAuth(allowedRoles?)`** (`src/api/db/users.ts`) est **l'unique porte
d'autorisation**. Elle lit l'utilisateur Supabase, charge la ligne `User`
correspondante via Prisma, puis applique éventuellement une liste de rôles
autorisés. Toute nouvelle Server Action touchant aux données commence par :

```ts
const auth = await requireAuth([...]);
if ('error' in auth) return { error: auth.error };
```

Les listes de rôles sont déclarées en tête de module (`MANAGEMENT_ROLES`,
`ADMIN_ROLES`, `LOGBOOK_WRITE_ROLES`, `SIGN_OVERRIDE_ROLES`) — réutilisez-les
plutôt que de redéfinir un ensemble de rôles en ligne.

**3. Le cloisonnement par `clubID`.** Après `requireAuth`, chaque action doit
vérifier `auth.user.clubID === resource.clubID` avant toute lecture ou mutation.
Cette règle est couverte par des tests dédiés
(`src/api/__tests__/clubIsolation.test.ts`).

---

## 🚀 Démarrage rapide

### Prérequis

- **Node.js 22.x** (voir `.nvmrc`)
- Une base **PostgreSQL** (typiquement fournie par Supabase)
- Un projet **Supabase** (Auth + Storage)
- Une clé API **Resend** pour l'envoi d'e-mails
- Une paire de clés **Cloudflare Turnstile** (page publique de baptême)

### Installation

```bash
git clone https://github.com/jpthibault20/aeroconnect.git
cd aeroconnect

nvm use                 # Node 22.x
npm install             # `postinstall` lance automatiquement `prisma generate`
```

### Configuration

Créez un fichier `.env` à la racine à partir de la section
[Variables d'environnement](#-variables-denvironnement) ci-dessous.

### Base de données

```bash
npx prisma migrate deploy   # applique les migrations existantes
npm run seed:month          # (optionnel) jeu de données de démonstration
```

### Lancement

```bash
npm run dev                 # http://localhost:3000
```

---

## 🔑 Variables d'environnement

| Variable | Requis | Description |
| :--- | :---: | :--- |
| `DATABASE_URL` | ✅ | Connexion PostgreSQL **poolée**, utilisée par l'application. |
| `DIRECT_URL` | ✅ | Connexion **directe** (non poolée), indispensable aux migrations Prisma. |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL du projet Supabase. Sert aussi à autoriser l'hôte des images dans `next.config.mjs`. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✅ | Clé publique Supabase (nouveau format). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ⚠️ | Clé anonyme Supabase (format historique, repli). |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Clé de service — **serveur uniquement, ne jamais exposer côté client**. |
| `NEXT_PUBLIC_APP_URL` | ✅ | URL publique de l'application (liens dans les e-mails, redirections d'auth). |
| `WEBSITE_LINK` | ✅ | Lien vers le site vitrine, utilisé dans les gabarits d'e-mail. |
| `RESEND_API_KEY` | ✅ | Clé API Resend. |
| `SENDER_EMAIL` | ✅ | Adresse expéditrice des e-mails transactionnels. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | ✅ | Clé publique Cloudflare Turnstile. |
| `TURNSTILE_SECRET_KEY` | ✅ | Clé secrète Cloudflare Turnstile (vérification côté serveur). |
| `NODE_ENV` | — | Géré par Next.js ; à ne définir manuellement que pour un cas particulier. |

> [!WARNING]
> `.env` et `.env.local` sont ignorés par Git et doivent le rester.
> `SUPABASE_SERVICE_ROLE_KEY` contourne toutes les règles d'accès Supabase :
> elle ne doit jamais être préfixée `NEXT_PUBLIC_` ni atteindre le navigateur.

---

## 📜 Scripts disponibles

| Commande | Effet |
| :--- | :--- |
| `npm run dev` | Serveur de développement Next.js. |
| `npm run build` | Build de production ; `postbuild` enchaîne sur `prisma migrate deploy`. |
| `npm start` | Serveur de production. |
| `npm run lint` | ESLint. |
| `npm test` | Vitest en mode watch. |
| `npm run test:run` | Passe unique de Vitest (à privilégier en CI). |
| `npm run email` | Prévisualisation des gabarits React Email. |
| `npm run migrate:prod` | `prisma migrate deploy`. |
| `npm run seed:month` | Jeu de données de démonstration pour le mois courant. |

Commandes Prisma utiles :

```bash
npx prisma migrate dev --name <nom>   # créer une migration en local
npx prisma migrate deploy             # appliquer les migrations en attente
npx prisma generate                   # régénérer le client (auto au postinstall)
npx prisma studio                     # explorateur de base de données
```

---

## 🧪 Tests

Vitest tourne en environnement `node` avec les globals activés
(`vitest.config.mts`). Les tests sont co-localisés sous `src/**/__tests__/`.

```bash
npm run test:run                                       # toute la suite
npx vitest run src/api/__tests__/businessRules.test.ts # un fichier
npx vitest run -t "TRAINING -> INSTRUCTION"            # par nom de test
```

**Les tests de la couche données ne touchent pas Postgres.** Ils exercent des
helpers purs et la logique métier à partir d'objets `User` / `planes` /
`flight_sessions` construits à la main. Suivez ce schéma : extrayez la logique
hors des Server Actions dans des fonctions pures, puis testez ces fonctions.

Les matchers `@testing-library/jest-dom` sont câblés dans
`src/__tests__/setup.ts`. `jsdom` est installé, mais l'environnement par défaut
étant `node`, chaque fichier de test de composant doit opter explicitement via
`// @vitest-environment jsdom` en première ligne.

La suite couvre notamment l'isolation par club, la matrice de permissions par
rôle, les règles du carnet de route, la validation Hobbs, la protection des
sessions passées et les schémas d'authentification.

---

## 🗄 Base de données & migrations

### Modèles principaux

| Modèle | Rôle |
| :--- | :--- |
| `User` | Membre du club : `clubID`, `role`, `classes` (`Int[]` des classes ULM). |
| `Club` | Configuration du club : horaires, fenêtres d'inscription, contacts, jeton public. |
| `planes` | Machines de la flotte, avec usage et classe. |
| `flight_sessions` | Créneaux réservés (instructeur + élève éventuel + machine(s)). |
| `flight_logs` | Carnet de route officiel, dénormalisé et signable. |
| `MaintenanceTask` | Échéances de maintenance par machine (heures et/ou mois). |
| `BaptemeRequest` | Demandes de baptême issues de la page publique. |

### Règles de migration

- Les migrations actives vivent dans `prisma/migrations/`.
- L'historique ancien a été **écrasé** et déplacé dans
  `prisma/migrations_old_backup/` — **ne copiez jamais** depuis ce dossier pour
  écrire une nouvelle migration.
- `DIRECT_URL` doit être définie : Prisma refuse de migrer à travers le pooler.

---

## 📁 Structure du projet

```
aeroconnect/
├── prisma/
│   ├── schema.prisma            # Modèle de données
│   ├── migrations/              # Migrations actives
│   ├── migrations_old_backup/   # Historique écrasé — ne pas réutiliser
│   └── seed*.ts                 # Jeux de données de démonstration
├── src/
│   ├── api/
│   │   ├── db/                  # Server Actions (accès base de données)
│   │   ├── global function/     # Helpers partagés (dates, utils)
│   │   ├── client/              # Helpers côté client
│   │   └── prisma.ts            # Singleton Prisma
│   ├── app/                     # App Router (voir Architecture)
│   ├── components/              # Composants par domaine + `ui/` (Shadcn)
│   ├── config/                  # Constantes métier (classes ULM, horaires)
│   ├── emails/ · emails/        # Gabarits React Email
│   ├── hooks/                   # Hooks React
│   ├── lib/                     # Logique métier pure (testée unitairement)
│   ├── schemas/                 # Schémas Zod
│   ├── types/                   # Types partagés
│   └── utils/supabase/          # Fabriques Supabase (server / client / middleware)
├── public/ · static/            # Assets
├── script/                      # Utilitaires d'exploitation (Python)
├── middleware.ts                # Rafraîchissement de session Supabase
├── LICENSE                      # Licence propriétaire source-available
└── CLAUDE.md                    # Guide pour les agents de code
```

---

## 🚢 Déploiement

L'application se déploie sur toute plateforme compatible Next.js 16 disposant de
Node 22.

1. Renseignez l'ensemble des variables de la section
   [Variables d'environnement](#-variables-denvironnement) sur la plateforme.
2. Le build exécute `next build`, puis `postbuild` applique automatiquement
   `prisma migrate deploy` — les migrations en attente partent avec le déploiement.
3. Assurez-vous que `DIRECT_URL` est bien accessible depuis l'environnement de
   build, sinon l'étape de migration échouera.
4. Vérifiez que le bucket public Supabase Storage servant les photos de machines
   correspond à l'hôte autorisé dans `next.config.mjs`.

---

## 🔮 Roadmap

- [ ] **Paiements** — intégration Stripe pour les règlements en ligne.
- [ ] **Location** — module de location de machines hors instruction.
- [ ] **Maintenance avancée** — arrêts techniques (V.N.A.), impact automatique sur
      les réservations existantes.
- [ ] **Communication** — chat interne au club, mailing ciblé ou groupé.
- [ ] **Profil avancé** — statistiques détaillées et refonte UI/UX.
- [ ] **Application mobile** — portage React Native.
- [ ] **Synchronisation horaire** — gestion unifiée de l'écart client/serveur.

---

## 📝 Changelog

L'historique détaillé est tenu dans [`Version.md`](./Version.md).

### v3.6 — *Août 2026* (actuelle)

- Carnet de route officiel : signatures, validation Hobbs, export PDF.
- Baptêmes de l'air : page publique de réservation avec jeton révocable et hold TTL.
- Suivi de maintenance par machine (échéances heures et mois).
- Refonte de la page publique de baptême, corrections sur l'ouverture du calendrier.

### v2.0.x

- Refonte totale de l'interface (UI/UX).

### v1.4.x

- Fonctionnalité STEX, vue de version.

### v1.3.x — première version commercialisable

- Inscription « sans avion » et configuration utilisateur associée.

### v1.2.x

- Gestion des 6 classes ULM, soft delete des utilisateurs, améliorations calendrier.

### v1.1.x — *Janvier 2025*

- Version initiale : authentification, création club/utilisateur, sessions de base.

---

## 🛡 Sécurité

Si vous découvrez une vulnérabilité, **n'ouvrez pas d'issue publique**.
Écrivez directement à [thibault@jp-developpement.com](mailto:thibault@jp-developpement.com)
avec une description et, si possible, les étapes de reproduction.

Les signalements responsables sont les bienvenus et recevront une réponse dans
les meilleurs délais.

---

## 🤝 Contribuer

Ce projet est développé et maintenu **exclusivement** par son auteur. Les
contributions externes ne sont ni sollicitées ni acceptées, et les pull requests
seront fermées sans être fusionnées.

Les **signalements de bug** et les **retours d'usage** restent en revanche très
appréciés — utilisez les issues GitHub, ou l'adresse ci-dessus.

---

## 📄 Licence

**Propriétaire — Tous droits réservés.** © 2025-2026 Thibault JEANPIERRE.

Le code de ce dépôt est *source-available* : librement **consultable**, mais **pas
open source**. Sont autorisés la lecture, l'audit, et l'évaluation locale à titre
personnel. Sont interdits sans accord écrit préalable : l'exploitation en
production, la copie, le fork, la modification, la redistribution et toute
exploitation commerciale — SaaS inclus.

Le déploiement au sein d'un aéroclub ou d'un club d'ULM requiert une **licence
commerciale** distincte. Voir [LICENSE](./LICENSE) pour les termes complets.

Les bibliothèques tierces utilisées restent régies par leurs licences respectives
(voir `package.json`).

---

## 📞 Contact

**Thibault JEANPIERRE**

📧 [thibault@jp-developpement.com](mailto:thibault@jp-developpement.com)
🐙 [@jpthibault20](https://github.com/jpthibault20)

Pour toute question, demande de démonstration, devis de licence commerciale ou
retour technique — n'hésitez pas.
