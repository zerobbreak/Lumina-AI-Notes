---
name: codebase-review
description: >-
  Reviews an entire repository or major subsystem for architecture, consistency,
  security, reliability, tests, and maintainability. Use when the user asks for a
  codebase review, repo health check, architecture review, technical debt audit,
  onboarding review of the project, or a holistic assessment of how the app is
  structured—not for single-file or PR-only nitpicks unless scope is explicitly narrow.
---

# Codebase review

Structured review of **how the project is built and operated**, not line-by-line style on one file. Prefer **evidence from the repo** (entry points, configs, patterns) over generic advice.

## Scope

1. Confirm breadth: full repo, `frontend`/`backend`/`app`, or a named area. If unclear, default to **app + API + shared libs** and state assumptions.
2. Skim **project identity**: `README`, root `package.json`, env examples (`.env.example`), and framework entry (e.g. Next `app/`, API routes, server bootstrap).

## What to inspect

| Area | Look for |
|------|----------|
| **Architecture** | Clear boundaries (UI vs API vs data); coupling; circular imports; god modules; where business logic lives |
| **Security** | Auth/session handling; secrets only via env; validation on inputs; CSRF/CORS/safe headers where relevant; file upload and SSRF patterns |
| **Reliability** | Error handling at boundaries; async failure modes; idempotency for webhooks/jobs; timeouts and retries |
| **Data** | Schema/migrations discipline; query patterns (N+1); indexes mentioned or missing in hot paths—only when code exposes them |
| **Frontend (if applicable)** | State ownership; unnecessary rerenders; accessibility basics on new UI; bundle/lazy-loading if obviously relevant |
| **Ops & DX** | Scripts (`lint`, `test`, `build`, `typecheck`); CI config; logging levels in prod paths; dead code and debug leftovers |
| **Tests** | What is covered vs critical paths; flaky patterns; missing integration tests for API/auth |

Use **semantic search** and **text search** to find auth, `process.env`, API route definitions, DB access, and error boundaries—then **read** the files that define behavior.

## Optional commands

When a review should reflect **current** health, run project scripts if present (e.g. `npm run lint`, `npm run test`, `npm run build`, `npx tsc --noEmit`). Summarize failures as findings with file references when the output names them.

## Output format

Use this structure (adapt depth to request size):

```markdown
## Executive summary
[2–4 sentences: overall health, biggest risks, biggest strengths]

## Context
[Stack, major folders, how requests/data flow at a high level—only what you verified]

## Findings

### Critical / High
- **[Area]** — [file or general location]: [issue]. [Why it matters]. [Concrete next step].

### Medium
- ...

### Low / follow-ups
- ...

## Strengths
[What is already done well—specific patterns or files]

## Recommended order of work
[Numbered list: security/reliability first, then architecture debt, then polish]
```

Severity: **Critical** = exploit or data loss / outage risk; **High** = serious bug or security gap; **Medium** = maintainability or partial exposure; **Low** = style, minor duplication, optional hardening.

## Boundaries

- **Not** a substitute for automated scanning alone: mention tools (eslint, dep audit) as complements, not the whole review.
- If the user only wants **bugs and magic constants**, point them to the project’s `codebase_analysis` skill (if present) or a focused static pass.
- If the user only wants **diff / PR** feedback, use a file-scoped review workflow instead of full-repo mapping.

## Concision

Prefer **fewer, evidenced findings** over a long generic checklist. Omit categories with nothing substantive to say.
