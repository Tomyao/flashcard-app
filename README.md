# Flashcards

A local-first flashcard PWA for studying topics broken into questions and answers. Data is stored entirely in the browser (IndexedDB) — no backend, no account, works offline.

## Features

- **Cards & categories** — each card holds a topic and a numbered list of Q&A items; organize cards into categories (with a built-in "No Category" bucket)
- **Star system** — define custom named star colors, then star individual questions and/or whole cards; filter the board by one or more colors, by scope (cards / questions / both), or show only unstarred items
- **Stack view** — swipe or click through a category's cards, revealing answers on demand
- **Offline / installable** — a service worker (via `vite-plugin-pwa`) precaches assets so the app works offline and can be installed as a PWA
- **Dark mode**

## Tech stack

- React 19 + TypeScript
- Vite 8, Tailwind CSS 4
- `idb` for IndexedDB persistence
- `vite-plugin-pwa` for offline support
- `framer-motion` for animations

## Development

```bash
npm install
npm run dev
```

Other scripts:

```bash
npm run build    # type-check (tsc -b) and build for production
npm run preview  # preview the production build locally
npm run lint      # run oxlint
```

## Deployment

The app is a static build (output in `dist/`) and deploys to [Vercel](https://vercel.com) with the included `vercel.json` — no environment variables or backend required.
