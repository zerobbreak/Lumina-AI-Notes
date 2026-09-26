// Signed-in load test: N virtual users sign in through Clerk (like the browser
// does), then all load the dashboard at once: first at a normal pace, then with
// no pause between loads (stress).
//
//   LOADTEST_ACCOUNTS="user,password\nuser2,password2" node auth-load.mjs <users> <paceSeconds> <stressSeconds>
//
// Accounts are "email-or-username,password", shared round-robin (each virtual
// user gets its own Clerk client + session). Read-only: no AI calls, no writes.
//
// Every sign-in comes from one CI machine, so Clerk throttles them per IP; that
// is a test-harness limit, not something real users (on their own devices) hit.
// Sign-ins are paced and retried on 429, and the load only starts once all
// users are in.
const WEB = process.env.WEB_URL ?? "https://lumina-web-production-e6ce.up.railway.app";
const FAPI = process.env.CLERK_FAPI ?? "https://settling-dinosaur-13.clerk.accounts.dev";
const [users = 50, paceSeconds = 120, stressSeconds = 60] = process.argv.slice(2).map(Number);
const THINK_MIN = 2000;
const THINK_MAX = 6000;

const accounts = (process.env.LOADTEST_ACCOUNTS ?? "")
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter(Boolean)
  .map((l) => {
    const i = l.indexOf(",");
    return { email: l.slice(0, i).trim(), password: l.slice(i + 1) };
  });
if (accounts.length === 0 || accounts.some((a) => !a.email || !a.password)) {
  console.error("Set LOADTEST_ACCOUNTS to one 'email,password' per line.");
  process.exit(1);
}

// ---- stats ---------------------------------------------------------------
let stats = new Map();
function rec(name, ms, status) {
  let s = stats.get(name);
  if (!s) stats.set(name, (s = { lat: [], codes: {} }));
  s.lat.push(ms);
  s.codes[status] = (s.codes[status] || 0) + 1;
}
async function timed(name, url, init = {}) {
  const t = performance.now();
  try {
    const r = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(30000), ...init });
    const body = await r.text();
    rec(name, performance.now() - t, r.status);
    return { status: r.status, body, headers: r.headers };
  } catch (e) {
    rec(name, performance.now() - t, e.name === "TimeoutError" ? "timeout" : "neterr");
    return { status: 0, body: "", headers: new Headers() };
  }
}
const json = (s) => { try { return JSON.parse(s); } catch { return null; } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- Clerk frontend API (dev instance) -----------------------------------
const clerkHeaders = { Origin: WEB, "Content-Type": "application/x-www-form-urlencoded" };
const fapiUrl = (path, db) => `${FAPI}/v1${path}?_clerk_js_version=5${db ? `&__clerk_db_jwt=${db}` : ""}`;

let throttled = 0;
/** POST to Clerk, waiting out 429s (per-IP throttling of our single CI machine). */
async function clerk(name, path, db, body) {
  for (let attempt = 0; ; attempt++) {
    const r = await timed(name, fapiUrl(path, db), {
      method: "POST",
      headers: clerkHeaders,
      body: body ? new URLSearchParams(body) : undefined,
    });
    if (r.status !== 429 || attempt >= 8) return json(r.body);
    throttled++;
    await sleep((Number(r.headers.get("retry-after")) || 2 * (attempt + 1)) * 1000);
  }
}

const signInOutcomes = {};
async function signIn(account) {
  const db = (await clerk("clerk: dev browser", "/dev_browser"))?.token;
  if (!db) return null;
  let res = await clerk("clerk: sign in (password)", "/client/sign_ins", db, {
    strategy: "password",
    identifier: account.email,
    password: account.password,
  });
  // Clerk asks for an email code on a new device. +clerk_test addresses get no
  // real mail and accept Clerk's fixed test code.
  if (res?.response?.status === "needs_second_factor") {
    const id = res.response.id;
    const factor = res.response.supported_second_factors?.find((x) => x.strategy === "email_code");
    if (factor) {
      await clerk("clerk: 2nd factor prepare", `/client/sign_ins/${id}/prepare_second_factor`, db, {
        strategy: "email_code",
        email_address_id: factor.email_address_id,
      });
      res = await clerk("clerk: 2nd factor attempt", `/client/sign_ins/${id}/attempt_second_factor`, db, {
        strategy: "email_code",
        code: "424242",
      });
    }
  }
  const outcome = res?.response?.status ?? res?.errors?.[0]?.code ?? "no response";
  signInOutcomes[outcome] = (signInOutcomes[outcome] || 0) + 1;
  const sid = res?.response?.created_session_id;
  if (!sid) return null;
  // The browser's __client_uat cookie is the client's last-updated time; a
  // session token older than it makes Clerk's middleware redirect.
  const session = { db, sid, jwt: null, uat: Math.floor(Date.now() / 1000) - 5, refreshedAt: 0 };
  return (await refresh(session)) ? session : null;
}
async function refresh(session) {
  const r = await clerk("clerk: session token", `/client/sessions/${session.sid}/tokens`, session.db);
  if (!r?.jwt) return false;
  session.jwt = r.jwt;
  session.refreshedAt = Date.now();
  return true;
}

// ---- dashboard load, as the browser does it (API via the web origin) -----
const DASHBOARD_CALLS = [
  "/users/me",
  "/users/me/gamification",
  "/users/me/usage",
  "/notes/resume-target",
  "/home",
  "/notes/recent",
  "/notes/pinned",
  "/notes/quick",
  "/notifications/unread-count",
  "/notifications",
  "/tags",
  "/deadlines/upcoming",
  "/announcements/events",
];

// The bundle a bare /dashboard asks for (lib/api/dashboardBundle.ts), with UTC as the timezone.
const BUNDLE_PATHS = [
  "/users/me",
  "/notes/quick?limit=10",
  "/notes/pinned?limit=20",
  "/tags",
  "/files?limit=10",
  "/flashcards/today-queue",
  "/deadlines/upcoming?limit=1",
  "/announcements/events",
  "/notes/resume-target",
  "/home?tzOffsetMinutes=0",
  "/users/me/gamification",
  "/notes/recent?limit=5",
  "/deadlines/upcoming?limit=6&windowDays=30",
];

let dashboardLoads = [];
/** "bundle": the app today. "separate": one GET per call, as before the bundle. */
let mode = "bundle";
async function dashboard(session) {
  // Clerk session tokens live 60s; the browser refreshes ~every 50s.
  if (Date.now() - session.refreshedAt > 45000) await refresh(session);
  const t = performance.now();
  const cookie = `__session=${session.jwt}; __client_uat=${session.uat}; __clerk_db_jwt=${session.db}`;
  await timed("web: GET /dashboard (signed in)", `${WEB}/dashboard`, { headers: { cookie } });
  const auth = { headers: { Authorization: `Bearer ${session.jwt}` } };
  let recentBody;
  if (mode === "bundle") {
    // What the app does since 7a8ef1e: one request for the opening reads.
    const r = await timed("api: POST /dashboard/bundle", `${WEB}/api/v1/dashboard/bundle`, {
      method: "POST",
      headers: { ...auth.headers, "Content-Type": "application/json" },
      body: JSON.stringify({ paths: BUNDLE_PATHS }),
    });
    const results = json(r.body)?.results ?? {};
    for (const [path, entry] of Object.entries(results)) {
      if (entry.status >= 400) rec(`  bundle entry ${path}`, 0, entry.status);
    }
    recentBody = JSON.stringify(results["/notes/recent?limit=5"]?.body ?? []);
  } else {
    const results = await Promise.all(DASHBOARD_CALLS.map((p) => timed(`api: GET ${p}`, `${WEB}/api/v1${p}`, auth)));
    recentBody = results[DASHBOARD_CALLS.indexOf("/notes/recent")].body;
  }
  // Then open a note, like resuming where you left off
  const recent = json(recentBody);
  const list = Array.isArray(recent) ? recent : recent?.notes ?? recent?.items ?? [];
  const note = list[Math.floor(Math.random() * list.length)];
  const noteId = note?._id ?? note?.id;
  if (noteId) await timed("api: GET /notes/:id", `${WEB}/api/v1/notes/${noteId}`, auth);
  dashboardLoads.push(performance.now() - t);
}

// ---- report --------------------------------------------------------------
const pct = (a, p) => a[Math.min(a.length - 1, Math.floor((p / 100) * a.length))];
const f = (v) => (v / 1000).toFixed(2) + "s";
function report(title, wall) {
  let total = 0, bad = 0;
  console.log(`\n=== ${title} ===`);
  console.log("endpoint".padEnd(38), "n".padStart(6), "p50".padStart(7), "p95".padStart(7), "p99".padStart(7), "max".padStart(7), " status");
  for (const [name, s] of [...stats].sort(([a], [b]) => a.localeCompare(b))) {
    const a = s.lat.sort((x, y) => x - y);
    total += a.length;
    for (const [c, n] of Object.entries(s.codes)) if (!/^[23]/.test(c)) bad += n;
    console.log(name.padEnd(38), String(a.length).padStart(6), f(pct(a, 50)).padStart(7), f(pct(a, 95)).padStart(7), f(pct(a, 99)).padStart(7), f(a[a.length - 1]).padStart(7), " " + JSON.stringify(s.codes));
  }
  if (dashboardLoads.length) {
    const d = dashboardLoads.sort((x, y) => x - y);
    console.log(`whole dashboard load (page + opening reads + open a note): n=${d.length} p50 ${f(pct(d, 50))} p95 ${f(pct(d, 95))} p99 ${f(pct(d, 99))} max ${f(d[d.length - 1])}`);
  }
  console.log(`total ${total} requests in ${wall.toFixed(1)}s = ${(total / wall).toFixed(1)} req/s, non-2xx/3xx: ${bad}`);
  stats = new Map();
  dashboardLoads = [];
}

// ---- run -----------------------------------------------------------------
// 1. Sign everyone in, one at a time (bursts trip Clerk's per-IP limit harder).
let t0 = performance.now();
const sessions = [];
for (let i = 0; i < users; i++) {
  const s = await signIn(accounts[i % accounts.length]);
  if (s) sessions.push(s);
  if ((i + 1) % 5 === 0) {
    console.log(`  sign-in ${i + 1}/${users}: ${sessions.length} ok, ${throttled} throttled so far, ${((performance.now() - t0) / 1000).toFixed(0)}s`);
  }
  await sleep(250);
}
console.log(`\n${users} users on ${accounts.length} account(s)`);
console.log(`signed in: ${sessions.length}/${users}  outcomes: ${JSON.stringify(signInOutcomes)}  429 retries (CI-IP throttling): ${throttled}`);
report("sign-in (Clerk, paced, includes retries)", (performance.now() - t0) / 1000);
if (sessions.length === 0) process.exit(1);

// 2. Everyone on the dashboard at once, normal pace, then flat out.
async function phase(seconds, thinkMin, thinkMax) {
  const end = Date.now() + seconds * 1000;
  await Promise.all(
    sessions.map(async (s, i) => {
      await sleep(Math.random() * 2000); // not all on the same millisecond
      while (Date.now() < end) {
        await dashboard(s);
        await sleep(thinkMin + Math.random() * (thinkMax - thinkMin));
      }
    }),
  );
}
t0 = performance.now();
await phase(paceSeconds, THINK_MIN, THINK_MAX);
report(`${sessions.length} concurrent users, normal pace (${THINK_MIN / 1000}-${THINK_MAX / 1000}s between dashboard loads), ${paceSeconds}s`, (performance.now() - t0) / 1000);

t0 = performance.now();
await phase(stressSeconds, 0, 0);
report(`${sessions.length} concurrent users, stress (no pause), ${stressSeconds}s`, (performance.now() - t0) / 1000);

// Same stress, the old way (13 separate GETs), to compare on the same deploy.
mode = "separate";
t0 = performance.now();
await phase(stressSeconds, 0, 0);
report(`${sessions.length} concurrent users, stress, separate GETs (pre-bundle client), ${stressSeconds}s`, (performance.now() - t0) / 1000);
