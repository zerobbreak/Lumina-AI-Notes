---
name: run-desktop
description: Build, run, and drive the Lumina Notes AI Electron desktop app. Use when asked to start the desktop app, take a screenshot of it, or interact with its UI headlessly.
---

Lumina Notes AI's Electron app is driven headlessly via a Playwright REPL
at `.claude/skills/run-desktop/driver.mjs`, run under `xvfb-run` (this
container has no display).

## Prerequisites

```bash
apt-get install -y xvfb libnss3 libgbm1 libasound2t64 libgtk-3-0 \
  libxss1 libxkbcommon0 libatk-bridge2.0-0 libcups2 libdrm2
```
(Usually already present in this environment.)

## Run (dev mode — requires `next dev` already running on :3000)

```bash
export CLERK_SECRET_KEY=... NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=... NEXT_PUBLIC_CONVEX_URL=...
export NODE_ENV=development
xvfb-run -a node .claude/skills/run-desktop/driver.mjs
```

Wrap in tmux for interactive/agent use:

```bash
tmux new-session -d -s desktop -x 200 -y 50
tmux send-keys -t desktop 'cd <repo> && export NODE_ENV=development && xvfb-run -a node .claude/skills/run-desktop/driver.mjs' Enter
timeout 20 bash -c 'until tmux capture-pane -t desktop -p | grep -q "driver>"; do sleep 0.3; done'
tmux send-keys -t desktop 'launch' Enter
timeout 60 bash -c 'until tmux capture-pane -t desktop -p | grep -qE "LAUNCHED_MS|ERROR"; do sleep 0.3; done'
tmux send-keys -t desktop 'ss landing' Enter
tmux capture-pane -t desktop -p
```

Screenshots land in `/tmp/shots/` (override: `SCREENSHOT_DIR`).

### Commands

| command | what it does |
|---|---|
| `launch` | launch the app, wait for the first window, print load time |
| `ss [name]` | screenshot -> `/tmp/shots/<name>.png` |
| `text [css-sel]` | print innerText of an element (or body) |
| `url` | print the current window's URL |
| `windows` | list all window URLs (find the real UI vs. devtools) |
| `quit` | close app, exit |

## Run (human path)

```bash
npm run electron:dev   # opens a real window; needs a display
```

## Gotchas

- **`app.firstWindow()` may return the DevTools window**, not the app —
  `electron/main.js` calls `webContents.openDevTools()` in dev mode. Use
  `windows` to see all windows and pick by URL if `launch`'s reported URL
  starts with `devtools://`.
- **Requires real Clerk/Convex credentials to render past sign-in.**
  `clerkMiddleware` (in `proxy.ts`) redirects the first load to a Clerk
  handshake URL (`https://<instance>.clerk.accounts.dev/v1/client/handshake`)
  — with placeholder keys this 404s/fails; with real keys it should
  round-trip and land back on `/sign-in` rendered.
- **In this remote sandbox specifically, Electron's Chromium cannot
  complete outbound HTTPS at all** (confirmed against `https://example.com`,
  not just Clerk) — `ERR_TUNNEL_CONNECTION_FAILED`. Node/curl reach the
  internet fine through the same proxy; Chromium's tunnel through it does
  not, likely a CA-trust gap. This means the sign-in screen cannot be
  fully verified from this sandbox regardless of credentials — run on a
  machine with real Chromium network egress for that.
- **`--no-sandbox` is required** — Electron's sandbox needs privileges
  this container doesn't grant.

## Troubleshooting

- **Launch timeout:** is `next dev` actually up on :3000 (dev mode) or
  does `node_modules/electron/dist/electron` exist (`npm install` ran)?
- **`chrome-error://chromewebdata/` as the window URL:** the page failed
  to load — check `text`/`windows` and cross-reference the Gotchas above.
