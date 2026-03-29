# Lumina Notes AI

Lumina Notes AI is a Next.js + Convex study workspace for AI-assisted notes, structured capture from audio and PDFs, flashcards, quizzes, search, and sharing. The app targets **version 0.1.0** and ships as a **web app** with an **optional Electron desktop shell** (static export + packaged window) for local use and custom-protocol sign-in.

## Current application status

**Working today**

- **Authentication** — Clerk sign-in/sign-up, session sync with Convex (`convex/auth.config.ts`).
- **Onboarding** — Major, semester, courses, and modules stored on the user profile.
- **Dashboard** — Course/module sidebar, smart folder hub, note editor (Tiptap), quick notes vs nested pages, archive, tags, and theme preferences.
- **AI note generation** — Gemini-powered generation from audio, PDFs, and pasted text; multiple note styles (e.g. standard, Cornell, outline, mind map-oriented output).
- **Rich editor** — Math (KaTeX), diagrams, images, tasks, charts, and mind-map style diagram tooling (`components/diagram/`).
- **Flashcards & quizzes** — Decks and quiz flows tied to notes and courses; quiz results stored for review.
- **Search** — Global search dialog over notes, files, and flashcard decks (`convex/search.search`) with filters and tags.
- **Embeddings** — Note vectors for semantic features in the AI layer (`convex/ai.ts`); the database is set up for vector search on notes.
- **Sharing & collaboration (first phase)** — Public share links for notes, collaborator records, and **presence** (who is currently viewing a note), with heartbeats from the note editor.
- **Files** — UploadThing uploads and PDF ingestion pipeline.
- **Usage & engagement** — Monthly usage fields, study streaks, badges, and daily goals (Convex user model).

**In progress / limitations**

- **Paid plans** — Paystack checkout is **temporarily disabled** in the app; all tiers are treated as free until the integration is restored (see `convex/ai.ts`, `components/home/PricingSection.tsx`).
- **Semantic search query** — The `semanticSearch` **query** in `convex/search.ts` is a stub; meaningful semantic retrieval is implemented via **actions** in `convex/ai.ts`. The dashboard search UI uses the keyword/title-style `search` query.
- **Marketing vs product** — The landing page describes some capabilities (e.g. “live cursors”) as a **vision**; today you get **presence** and **shared notes**, not full real-time co-editing cursors.

## Upcoming features (in active development)

These align with the public **Living Roadmap** on the home page (`components/home/WIPRoadmap.tsx`) and ongoing backend work:

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
- Convex (database, queries, mutations, actions)
- Clerk (authentication)
- Google Gemini API (LLM + embeddings)
- UploadThing (file uploads)
- Tiptap editor + Radix UI + Tailwind CSS 4
- Electron + Electron Forge (optional desktop packaging)
- Vitest (tests)

## Project structure

- `app/` — Routes, layouts, API routes, static marketing home, dashboard, share, onboarding, Electron auth callback
- `convex/` — Schema, functions, AI and search actions
- `components/` — UI, dashboard, editor, diagrams, home sections
- `electron/` — Main process, preload, desktop window and custom protocol for auth
- `lib/` — Shared helpers
- `hooks/` — React hooks
- `types/` — Shared TypeScript types
- `tests/` — Vitest tests

## Prerequisites

- Node.js 20+
- npm 10+
- A Convex account
- A Clerk account
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

# Convex
CONVEX_DEPLOYMENT=dev:your-deployment-name
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Gemini
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
| `CONVEX_DEPLOYMENT` | Yes | Convex deployment name |
| `NEXT_PUBLIC_CONVEX_URL` | Yes | Convex URL |
| `GEMINI_API_KEY` | Yes | Google AI Studio key |
| `UPLOADTHING_TOKEN` | Yes | UploadThing API token |
| `NEXT_PUBLIC_PAYSTACK_SCHOLAR_PLAN_CODE` | No | Paystack plan code when billing is enabled |

3. Configure Clerk for Convex:

- Open `convex/auth.config.ts` and set `domain` to your Clerk frontend API URL.
- Keep `applicationID` as `convex` unless you intentionally changed your Convex auth integration.

4. Start Convex in terminal 1:

```bash
npm run convex:dev
```

Notes:

- The first run will prompt login/project selection.
- This command syncs backend functions and updates generated files.

5. Start Next.js in terminal 2:

```bash
npm run dev
```

6. Open the app:

- [http://localhost:3000](http://localhost:3000)

## Desktop (Electron)

The repo includes an Electron wrapper for development and packaging:

- **`npm run electron:dev`** — Runs Next.js dev server and opens an Electron window pointed at `http://localhost:3000`.
- **`npm run build:static`** — Next.js static export (`STATIC_EXPORT=true`) for embedding in the packaged app.
- **`npm run make`** — Builds static output and runs Electron Forge makers (see `forge.config.js`).

Custom protocol handling and the `/electron-auth` route support bringing Clerk session tokens into the desktop shell. Treat the desktop target as **experimental** unless you have verified packaging on your OS.

## Scripts

- `npm run dev` — Start Next.js dev server
- `npm run convex:dev` — Start/sync Convex backend
- `npm run convex:deploy` — Deploy Convex functions
- `npm run build` — Production build (web)
- `npm run build:static` — Static export for Electron
- `npm run start` — Run production server
- `npm run electron:dev` — Dev Electron + Next
- `npm run package` / `npm run make` — Electron Forge package / make installers
- `npm run lint` — ESLint
- `npm test` — Vitest once
- `npm run test:watch` — Vitest watch mode

## Deployment notes

- Deploy the Next.js app (e.g. Vercel) and set all environment variables.
- Deploy Convex separately with `npm run convex:deploy`.
- Ensure Clerk domains and Convex auth settings match deployed URLs.
- Electron builds are separate artifacts; ship them through your desktop release process, not only Vercel.

## Troubleshooting

- If auth fails, verify Clerk keys in `.env.local` and the Clerk `domain` in `convex/auth.config.ts`.
- If Convex calls fail, verify both `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL` match the same deployment.
- If AI features fail, verify `GEMINI_API_KEY` is present.
- If image uploads fail, verify `UPLOADTHING_TOKEN` and that `/api/uploadthing` remains publicly reachable (see `proxy.ts` if used).
