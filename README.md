# Premium Outlets HRIS

**Powered by Nexvision Innovations Inc.**

A modern Human Resource Information System for **Premium Outlets** — a white-label deployment of the **NexHRIS** platform.

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local — see ENVIRONMENT.md

# Copy face-recognition models (one-time)
npm run copy-face-models

# Start dev server
npm run dev
```

Open <http://localhost:3000> → `/login`.

---

## 📚 Documentation

Read these before deploying:

| Document                                       | What's inside                                                |
| ---------------------------------------------- | ------------------------------------------------------------ |
| **[HANDOFF.md](HANDOFF.md)**                   | What this project is, ownership, support model               |
| **[PROJECT_CONTEXT.md](PROJECT_CONTEXT.md)**   | Full architecture map, module breakdown, design decisions    |
| **[ENVIRONMENT.md](ENVIRONMENT.md)**           | All environment variables, secrets, Vercel setup             |
| **[MIGRATIONS.md](MIGRATIONS.md)**             | Supabase database setup — copy-paste migration order         |
| **[BRANDING.md](BRANDING.md)**                 | Color palette, logos, theming rules                          |

---

## 🏗️ Stack

Next.js 16 · React 19 · TypeScript 5 · Tailwind v4 · shadcn/ui · Zustand 5 · Supabase · Jest

---

## 🧪 Testing

```bash
npm test                  # Run all tests
npm run test:coverage     # Coverage report → coverage/lcov-report/index.html
npm run test:ci           # CI mode (used by GitHub Actions)
```

---

## 🎨 Brand

Pure white · Deep black · A touch of champagne gold.

See [`BRANDING.md`](BRANDING.md) for the full palette and re-skinning guide.

---

## 🛡️ Ownership

This codebase is a licensed white-label deployment of the **NexHRIS** platform.

| Asset           | Owner                            |
| --------------- | -------------------------------- |
| Platform code   | **Nexvision Innovations Inc.**   |
| Deployment      | Premium Outlets infrastructure   |
| Customer data   | Premium Outlets (Supabase tenant) |

For platform support, contact Nexvision Innovations Inc.

---

© Nexvision Innovations Inc. — *Premium Outlets HRIS is a licensed white-label deployment of NexHRIS.*
