# Lumina Notes AI

Lumina Notes AI is a Next.js + Convex study platform for AI-assisted note taking, transcription, flashcards, quizzes, and semantic search.

## Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Convex (backend/database/functions)
- Clerk (authentication)
- Google Gemini API (LLM + embeddings)
- UploadThing (file uploads)

## Prerequisites

- Node.js 20+
- npm 10+
- A Convex account
- A Clerk account
- A Google AI Studio API key (`GEMINI_API_KEY`)
- An UploadThing token (`UPLOADTHING_TOKEN`)

## Local Setup (Functioning App)

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

# Optional (currently not required to use the app)
NEXT_PUBLIC_PAYSTACK_SCHOLAR_PLAN_CODE=
```

3. Configure Clerk for Convex:

- Open `convex/auth.config.ts` and set `domain` to your Clerk frontend API URL.
- Keep `applicationID` as `convex` unless you intentionally changed your Convex auth integration.

4. Start Convex in terminal 1:

```bash
npx convex dev
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

## Scripts

- `npm run dev` - start Next.js dev server
- `npx convex dev` - start/sync Convex backend
- `npm run build` - production build
- `npm run start` - run production server
- `npm run lint` - run ESLint
- `npm test` - run Vitest once
- `npm run test:watch` - run Vitest in watch mode

## Troubleshooting

- If auth fails, verify Clerk keys in `.env.local` and the Clerk `domain` in `convex/auth.config.ts`.
- If Convex calls fail, verify both `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL` match the same deployment.
- If AI features fail, verify `GEMINI_API_KEY` is present.
- If image uploads fail, verify `UPLOADTHING_TOKEN` and that `/api/uploadthing` remains publicly reachable (see `proxy.ts`).
