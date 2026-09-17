# Security review focus for Lumina AI Notes

Stack: Next.js (App Router) + Convex backend + Clerk auth + Gemini AI +
UploadThing + an Electron desktop shell. Review the pull request diff and
report only findings that are exploitable in this codebase, with the file,
the line, the concrete attack path, and a suggested fix.

## Prioritize

**Convex functions (`convex/*.ts`)** — this is the real backend surface.
- Any `query`/`mutation`/`action` that does not establish identity via
  `ctx.auth.getUserIdentity()` before reading or writing user data.
- Handlers that trust a `userId`, `ownerId`, or similar argument from the
  client instead of deriving it from the authenticated identity.
- Missing ownership checks: fetching a document by id (notes, chats,
  recordings, flashcards, quizzes, files) and acting on it without
  confirming it belongs to the caller. Sequential/guessable ids make this
  an IDOR.
- `internalMutation`/`internalAction` logic reachable from a public
  function that skips those checks.
- Sharing and collaboration paths (`collaboration.ts`, `shared/`) that
  widen access beyond what the owner granted, or that leak documents
  through search/listing endpoints.
- Scheduled jobs and crons (`crons.ts`, `cleanup.ts`) acting on data
  across users without scoping.

**Secrets and configuration**
- Server-only secrets (`CLERK_SECRET_KEY`, Gemini/UploadThing/Paystack
  keys) read in client components or exposed through a `NEXT_PUBLIC_`
  variable.
- Hardcoded keys, tokens, or credentials in source, tests, or fixtures.

**AI/LLM paths (`convex/ai*.ts`, `geminiEmbedding.ts`)**
- Untrusted note/file/transcript content concatenated into a prompt in a
  way that lets it redirect the model into privileged actions, or model
  output used to drive a tool call, database write, or fetch without
  validation.
- Per-user quota or rate limiting removed or bypassable on paid AI calls.

**Web and rendering**
- `dangerouslySetInnerHTML`, raw HTML from markdown (`marked`,
  `react-markdown` with `rehype-raw`), or Tiptap content rendered without
  sanitization — stored XSS from note content.
- Unvalidated redirects, and user-controlled URLs passed to `fetch`,
  `puppeteer-core`, or the PDF/export pipeline (SSRF, local file reads).
- Auth gaps in `proxy.ts` and route handlers; over-permissive CORS.

**File upload (`lib/uploadthing.ts`, `convex/files.ts`)**
- Missing auth in the upload middleware, missing type/size limits, or
  path traversal in stored filenames.

**Electron (`electron/main.js`, `electron/preload.js`)**
- `nodeIntegration: true`, `contextIsolation: false`, disabled
  `webSecurity`, or a preload bridge exposing arbitrary IPC, `require`,
  shell, or filesystem access to page scripts.
- `shell.openExternal` or window navigation with a URL the page controls.

## Do not report

- Style, formatting, typing, performance, or general code-quality issues.
- Findings in `convex/_generated/`, `node_modules/`, `.next/`, or `out/`.
- Missing HTTPS, CSRF, or rate limiting on inherently public, read-only,
  unauthenticated endpoints where no user data is involved.
- Theoretical issues with no reachable path from untrusted input, or
  pre-existing code the diff does not touch.
