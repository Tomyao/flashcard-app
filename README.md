# Flashcards

A flashcard PWA for studying topics broken into questions and answers. Data lives in the browser (IndexedDB) and works fully offline with no account — logging in additionally auto-backs up your cards, categories, and stars to the cloud so they can be restored on another device.

## Features

- **Cards & categories** — each card holds a topic and a numbered list of Q&A items; organize cards into categories (with a built-in "No Category" bucket)
- **Star system** — define custom named star colors, then star individual questions and/or whole cards; filter the board by one or more colors, by scope (cards / questions / both), or show only unstarred items
- **Stack view** — swipe or click through a category's cards, revealing answers on demand
- **Offline / installable** — a service worker (via `vite-plugin-pwa`) precaches assets so the app works offline and can be installed as a PWA
- **Accounts & cloud auto-backup** — log in (via the app icon menu) to auto-save your data to the cloud every 60 seconds, plus a manual "Save". On login or app start, if the cloud backup doesn't match this device's data, you're prompted to either restore the backup or overwrite it with this device's data (overwriting requires typing a confirm phrase). A header indicator shows Logged in / Logged out / Saving… / Saved!
- **Dark mode**

## Tech stack

**Frontend** (repo root)
- React 19 + TypeScript
- Vite 8, Tailwind CSS 4
- `idb` for IndexedDB persistence
- `vite-plugin-pwa` for offline support
- `framer-motion` for animations

**Backend** (`server/`)
- Express, deployed as a Vercel serverless function
- MongoDB Atlas via Mongoose (accounts + one backup document per user)
- JWT auth (bearer token, `localStorage`) with `bcryptjs` password hashing
- `helmet`, a `CLIENT_ORIGIN` CORS allowlist, and `express-rate-limit` on auth routes

## Project structure

This is two independently deployed apps in one repo:

- **`/`** — the frontend (Vite/React), a static build
- **`/server`** — the backend (Express + MongoDB), its own Vercel project

Each has its own `package.json` and `vercel.json`, and each project's `ignoreCommand` skips redeploying when only the other side changed.

## Development

Frontend:

```bash
npm install
npm run dev
```

Other frontend scripts:

```bash
npm run build    # type-check (tsc -b) and build for production
npm run preview  # preview the production build locally
npm run lint      # run oxlint
```

Backend (run alongside the frontend if you want auth/backup working locally):

```bash
cd server
npm install
cp .env.example .env   # fill in MONGODB_URI and JWT_SECRET
npm run dev
```

The frontend talks to the backend via `VITE_API_BASE_URL` — copy the root `.env.example` to `.env.local` (defaults to `http://localhost:4000`, matching the backend's default `PORT`).

## Deployment

Both halves deploy to [Vercel](https://vercel.com), as **two separate projects** pointed at the same GitHub repo:

- **Frontend project** — Root Directory `.`, static build via the included `vercel.json`. Needs `VITE_API_BASE_URL` set to the backend project's URL.
- **Backend project** — Root Directory `server`, Framework Preset "Express". Needs `MONGODB_URI` (Atlas connection string; allow `0.0.0.0/0` in Atlas Network Access, since Vercel functions have no static IP), `JWT_SECRET` (any long random string), and `CLIENT_ORIGIN` (comma-separated list of allowed frontend origins).
