# Lumina Notes AI

Lumina Notes AI is a Next.js study workspace for AI-assisted notes, structured capture from audio and PDFs, flashcards, quizzes, search, and sharing. The frontend talks to an **Express + Postgres REST API** (`server/`) via TanStack Query. The app targets **version 0.1.0** and ships as a **web app** with an **optional Electron desktop shell** (a native window onto the deployed web app, with custom-protocol sign-in).

## Current application status

**Working today**

- **Authentication** — Clerk sign-in/sign-up with JWT-backed REST API calls.
- **Onboarding** — Major, semester, courses, and modules stored on the user profile.
- **Dashboard** — Course/module sidebar, smart folder hub, note editor (Tiptap), quick notes vs nested pages, archive, tags, and theme preferences.
- **AI note generation** — Gemini-powered generation from audio, PDFs, and pasted text; multiple note styles (e.g. standard, Cornell, outline, mind map-oriented output).
- **Rich editor** — Math (KaTeX), diagrams, images, tasks, charts, and mind-map style diagram tooling (`components/diagram/`).
- **Flashcards & quizzes** — Decks and quiz flows tied to notes and courses; quiz results stored for review.
- **Search** — Global search dialog over notes, files, and flashcard decks with filters and tags.
- **Embeddings** — Note vectors for semantic features in the AI layer (Postgres + server AI routes).
- **Sharing & collaboration (first phase)** — Public share links for notes, collaborator records, and **presence** (who is currently viewing a note), with heartbeats from the note editor.
- **Files** — UploadThing uploads and PDF ingestion pipeline.
- **Usage & engagement** — Monthly usage fields, study streaks, badges, and daily goals (Postgres user model).

**In progress / limitations**

- **Paid plans** — Paystack checkout is **temporarily disabled** in the app; all tiers are treated as free until the integration is restored. The landing page states this plainly rather than advertising paid plans.
- **Semantic search** — Keyword search is wired in the dashboard; deeper embedding-backed search continues to evolve on the REST backend.
- **Marketing vs product** — The landing page lists unbuilt work (including live co-editing cursors) in its own “Not built yet” section; today you get **presence** and **shared notes**, not full real-time co-editing cursors.

## Upcoming features (in active development)

These align with the public roadmap on the home page (`components/home/landing/Roadmap.tsx`) and ongoing backend work:

| Initiative | Direction |
| --- | --- |
| **Lumina Brain Sync** | Cross-note / cross-course linking so the system surfaces connections across your knowledge base. |
| **Dynamic Mind Maps** | Richer automatic graph views of note structure (early diagram tooling exists; this extends it toward a fuller “dynamic” experience). |
| **Adaptive Quiz Forge** | Quizzes that emphasize weak areas using performance history (schema already has hooks such as optional difficulty on questions). |
| **Payments** | Re-enable Scholar (and related) checkout once the Paystack path is stable. |
| **Search UX** | Tighter wiring between embeddings-backed search in `ai.ts` and any unified search surface. |

Roadmap copy and progress indicators on the marketing site are illustrative and may move faster or slower than the items above.

## Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Express + Postgres REST API (`server/`) with TanStack Query on the client
- Clerk (authentication)
- Google Gemini API (LLM + embeddings)
- UploadThing (file uploads)
- Tiptap editor + Radix UI + Tailwind CSS 4
- Electron + Electron Forge (optional desktop packaging)
- Vitest (tests)

## Project structure

- `app/` — Routes, layouts, API routes, static marketing home, dashboard, share, onboarding, Electron auth callback
- `server/` — Express REST API, Postgres schema (Drizzle), AI routes
- `components/` — UI, dashboard, editor, diagrams, home sections
- `electron/` — Main process, preload, desktop window and custom protocol for auth
- `lib/` — Shared helpers
- `hooks/` — React hooks
- `types/` — Shared TypeScript types
- `tests/` — Vitest tests

## Prerequisites

- Node.js 20+
- npm 10+
- A Clerk account
- Postgres (local or hosted, e.g. Railway) for the REST API
- A Google AI Studio API key (`GEMINI_API_KEY`)
- An UploadThing token (`UPLOADTHING_TOKEN`)

## Local setup (web)

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` in the project root:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard

# REST API (Express backend in server/)
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1

# Gemini (server-side — see server/.env.example)
GEMINI_API_KEY=your_gemini_api_key

# UploadThing
UPLOADTHING_TOKEN=your_uploadthing_token

# Optional — Scholar plan when payments return
NEXT_PUBLIC_PAYSTACK_SCHOLAR_PLAN_CODE=
```

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk frontend key |
| `CLERK_SECRET_KEY` | Yes | Clerk backend key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Yes | Sign-in route |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Yes | Sign-up route |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | Yes | Post sign-in redirect |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | Yes | Post sign-up redirect |
| `NEXT_PUBLIC_API_URL` | Yes | REST API base URL for the Next.js client; `/api/v1` when using `API_PROXY_TARGET` |
| `API_PROXY_TARGET` | No | API origin that Next proxies `/api/v1/*` to, so requests are same-origin and skip CORS preflights |
| `GEMINI_API_KEY` | Yes (server) | Google AI Studio key — set in `server/.env` |
| `GEMINI_MODELS` | No (server) | Comma-separated Gemini models, tried in order when one is overloaded; defaults to `gemini-3.8-flash,gemini-3.5-flash,gemini-3.5-flash-lite` |
| `UPLOADTHING_TOKEN` | Yes | UploadThing API token |
| `NEXT_PUBLIC_PAYSTACK_SCHOLAR_PLAN_CODE` | No | Paystack plan code when billing is enabled |

3. Configure the REST API — copy `server/.env.example` to `server/.env` and fill in Postgres, Clerk, Gemini, and UploadThing values.

4. Start the API in terminal 1:

```bash
npm run server:dev
```

5. Start Next.js in terminal 2:

```bash
npm run dev
```

6. Open the app:

- [http://localhost:3000](http://localhost:3000)

## Desktop (Electron)

The repo includes an Electron wrapper for development and packaging:

- **`npm run electron:dev`** — Runs the Next.js dev server and opens an Electron window at `http://localhost:3000/sign-in`. Run the API too (`npm run server:dev`).
- **`npm run electron:start`** — Same, but through `electron-forge start`.
- **`npm run package`** / **`npm run make`** — Electron Forge package / installers (see `forge.config.js`). No Next.js build is involved.
- **`npm run test:electron`** — Playwright smoke tests for the shell (preload bridge, deep-link ticket relay).

The packaged app bundles no web code: `electron/main.js` loads the deployed web app (`https://lumina-web-production-e6ce.up.railway.app`, override with `LUMINA_APP_URL`), which reaches the Express API through its `/api/v1` rewrite. That keeps `CLERK_SECRET_KEY` and `UPLOADTHING_TOKEN` out of the installer, and web deploys reach desktop users without a new build. It needs a connection; when the site can't load, the window shows a retry page.

Sign-in happens in the window with Clerk's `<SignIn/>`. For providers that block embedded browsers, the "log in with browser" button opens `/electron-auth` in the system browser, which mints a 60-second Clerk sign-in ticket (`POST /api/electron/ticket`) and hands it back through `lumina-notes://auth?ticket=…`; the window redeems it with `signIn.create({ strategy: "ticket" })`. Treat the desktop target as **experimental** unless you have verified packaging on your OS.

## Scripts

- `npm run dev` — Start Next.js dev server
- `npm run server:dev` — Start Express REST API
- `npm run server:test` — Run server tests
- `npm run build` — Production build (web)
- `npm run start` — Run production server
- `npm run electron:dev` — Dev Electron + Next
- `npm run package` / `npm run make` — Electron Forge package / make installers
- `npm run lint` — ESLint
- `npm test` — Vitest once
- `npm run test:watch` — Vitest watch mode

## Deployment notes

- Deploy the Next.js app (e.g. Vercel) with `API_PROXY_TARGET` set to your hosted API's origin and `NEXT_PUBLIC_API_URL=/api/v1`, or point `NEXT_PUBLIC_API_URL` straight at the API.
- Deploy the Express API (e.g. Railway) with Postgres and server env vars from `server/.env.example`.
- Ensure Clerk domains match deployed URLs on both frontend and API.
- Electron builds are separate artifacts; ship them through your desktop release process, not only Vercel.

## Troubleshooting

- If auth fails, verify Clerk keys in `.env.local` and that the API accepts your Clerk JWT.
- If API calls fail, verify `NEXT_PUBLIC_API_URL` points at a running server (`npm run server:dev`).
- If AI features fail, verify `GEMINI_API_KEY` is present.
- If image uploads fail, verify `UPLOADTHING_TOKEN` and that `/api/uploadthing` remains publicly reachable (see `proxy.ts` if used).
