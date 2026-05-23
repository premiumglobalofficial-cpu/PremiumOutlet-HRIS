# Premium Outlets HRIS — Handoff Document

**Powered by Nexvision Innovations Inc.**

---

## What This Is

**Premium Outlets HRIS** is a **white-label deployment** of the **NexHRIS** platform — a production-grade Human Resource Information System originally built and maintained by **Nexvision Innovations Inc.**

This repository contains a customer-customized copy of the NexHRIS codebase, re-branded for **Premium Outlets**:
- Branding: White, Black, with Gold accents
- Product name: *Premium Outlets HRIS*
- Manifest / PWA / metadata fully re-skinned
- All NexHRIS feature set retained (attendance, payroll, leave, kiosk, biometrics, projects, tasks, etc.)

> **Important:** This codebase is a derivative of the proprietary NexHRIS platform owned by Nexvision Innovations Inc. and licensed for use by Premium Outlets. Source-level modifications must be coordinated with Nexvision Innovations Inc.

---

## Branding

| Token             | Color              | Use                                  |
| ----------------- | ------------------ | ------------------------------------ |
| Primary           | `#000000` (black)  | Buttons, sidebar, titles             |
| Background        | `#FFFFFF` (white)  | Surfaces                             |
| Accent / Gold     | `#C9A24A`          | Highlights, focus rings, charts      |
| Destructive       | crimson            | Errors                               |

All theme tokens live in [`src/app/globals.css`](src/app/globals.css). Re-tone by editing only the `:root` / `.dark` blocks — every component reads from CSS variables.

---

## High-Level Stack

| Layer            | Tech                                                       |
| ---------------- | ---------------------------------------------------------- |
| Framework        | **Next.js 16.1.6** (App Router, React 19, TypeScript 5)    |
| Styling          | **Tailwind v4** + **shadcn/ui** + Radix primitives         |
| State            | **Zustand 5** stores (`src/store/*.store.ts`)              |
| Database / Auth  | **Supabase** (Postgres, RLS, Storage, Edge Functions)      |
| Forms            | react-hook-form + zod                                      |
| Testing          | Jest + React Testing Library (`src/__tests__/`)            |
| PWA              | Custom service worker + face-api.js models in `/public`    |
| Maps / Geo       | Leaflet + OpenStreetMap                                    |
| Biometrics       | `@vladmandic/face-api` + Fingerkey bridge script           |
| Deployment       | Vercel (recommended), region `sin1`                        |

---

## Feature Matrix (inherited from NexHRIS)

| Module                     | Status                                                     |
| -------------------------- | ---------------------------------------------------------- |
| Employee management        | ✅ Full CRUD, roles, departments, work types                |
| Attendance                 | ✅ Clock-in/out, kiosk, face, QR, geo-fencing               |
| Shifts & Schedules         | ✅ Template-based, recurring, holiday calendar              |
| Leave Management           | ✅ Multi-type, approval workflow, accruals                  |
| Payroll                    | ✅ PH-compliant (SSS, PhilHealth, Pag-IBIG, BIR), 13th mo. |
| Loans                      | ✅ Amortization, 30% net-pay cap                            |
| Government reports         | ✅ SSS, PhilHealth, Pag-IBIG, BIR Alphalist                 |
| Tasks & Projects           | ✅ Kanban + sprint planning                                 |
| Messages & Notifications   | ✅ In-app + push notifications                              |
| Kiosk Mode                 | ✅ Face recognition + QR check-in                           |
| Document Center            | ✅ Per-employee uploads, retention policies                 |
| Settings (theme, locale)   | ✅ Per-tenant configurable                                  |
| Mobile PWA                 | ✅ Installable                                              |

See [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md) for the full architecture map.

---

## Operations Quickstart

```bash
# 1. Install
npm install

# 2. Copy environment template
cp .env.example .env.local
# Fill in Supabase + service-role keys (see ENVIRONMENT.md)

# 3. Apply database schema
# Open Supabase SQL editor → run each file in supabase/migrations/ in order.
# See MIGRATIONS.md for the canonical order and seed instructions.

# 4. Copy face-recognition models (one-time)
npm run copy-face-models

# 5. Run dev server
npm run dev
```

App opens at <http://localhost:3000>. Default login route: `/login`.

---

## Repository Structure

```
PremiumOutletsHRIS/
├── src/
│   ├── app/                  # Next.js App Router (pages + API routes)
│   ├── components/           # UI components (shadcn-based)
│   ├── store/                # Zustand stores (domain state)
│   ├── lib/                  # Helpers (supabase clients, formatters)
│   ├── services/             # External integrations
│   ├── data/                 # Static seed data
│   ├── types/                # Shared TypeScript types
│   └── __tests__/            # Jest suites
├── supabase/migrations/      # ✅ Run these in Supabase SQL editor
├── public/                   # Static assets + PWA + face-api models
├── scripts/                  # CLI/setup scripts
├── HANDOFF.md                # ← you are here
├── PROJECT_CONTEXT.md        # Detailed architecture & module map
├── ENVIRONMENT.md            # Env vars + secret rotation guide
├── MIGRATIONS.md             # Supabase setup & migration order
└── BRANDING.md               # Theme tokens & re-skin guide
```

---

## Support & Ownership

| Item             | Owner                              |
| ---------------- | ---------------------------------- |
| Platform code    | **Nexvision Innovations Inc.**     |
| Deployment       | Premium Outlets infrastructure team |
| White-label skin | Nexvision Innovations Inc.          |
| Data residency   | Premium Outlets Supabase project   |

For platform-level issues, bug fixes, or feature requests, contact Nexvision Innovations Inc.

---

© Nexvision Innovations Inc. — *Premium Outlets HRIS is a licensed white-label deployment.*
