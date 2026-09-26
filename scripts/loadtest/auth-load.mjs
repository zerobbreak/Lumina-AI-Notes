// Signed-in load test: N virtual users sign in through Clerk (like the browser
// does) and then keep loading the dashboard.
//
//   LOADTEST_ACCOUNTS="email,password\nemail2,password2" node auth-load.mjs <users> <seconds> <thinkMinMs> <thinkMaxMs>
//
// Accounts are shared round-robin, so 50 users can run on a few test accounts
// (each virtual user gets its own Clerk client + session). Read-only: no AI
// calls, no writes to notes.
const WEB = process.env.WEB_URL ?? "https://lumina-web-production-e6ce.up.railway.app";
const FAPI = process.env.CLERK_FAPI ?? "https://settling-dinosaur-13.clerk.accounts.dev";
const [users = 50, seconds = 120, thinkMin = 2000, thinkMax = 6000] = process.argv.slice(2).map(Number);
// Spread sign-ins over this long, so we measure a busy morning, not a single-IP burst Clerk may throttle.
const RAMP_MS = Number(process.env.RAMP_MS ?? 30000);

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
const stats = new Map();
function rec(name, ms, status) {
  let s = stats.get(name);
  if (!s) stats.set(name, (s = { lat: [], codes: {} }));
  s.lat.push(ms);
  s.codes[status] = (s.codes[status] || 0) + 1;
}
async function timed(name, url, init = {}, ok = (r) => r.status) {
  const t = performance.now();
  try {
    const r = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(30000), ...init });
    const body = await r.text();
    rec(name, performance.now() - t, ok(r));
    return { status: r.status, body };
  } catch (e) {
    rec(name, performance.now() - t, e.name === "TimeoutError" ? "timeout" : "neterr");
    return { status: 0, body: "" };
  }
}
const json = (s) => { try { return JSON.parse(s); } catch { return null; } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const think = () => sleep(thinkMin + Math.random() * (thinkMax - thinkMin));

// ---- Clerk frontend API (dev instance) -----------------------------------
const clerkHeaders = { Origin: WEB, "Content-Type": "application/x-www-form-urlencoded" };
const fapi = (path, db) => `${FAPI}/v1${path}?_clerk_js_version=5${db ? `&__clerk_db_jwt=${db}` : ""}`;

const signInOutcomes = {};
async function signIn(account) {
  const dev = await timed("clerk: dev browser", fapi("/dev_browser"), { method: "POST", headers: clerkHeaders });
  const db = json(dev.body)?.token;
  if (!db) return null;
  const body = new URLSearchParams({ strategy: "password", identifier: account.email, password: account.password });
  const si = await timed("clerk: sign in (password)", fapi("/client/sign_ins", db), { method: "POST", headers: clerkHeaders, body });
  const res = json(si.body);
  const outcome = res?.response?.status ?? res?.errors?.[0]?.code ?? `http ${si.status}`;
  signInOutcomes[outcome] = (signInOutcomes[outcome] || 0) + 1;
  const sid = res?.response?.created_session_id;
  if (!sid) return null;
  const session = { db, sid, jwt: null };
  return (await refresh(session)) ? session : null;
}
async function refresh(session) {
  const r = await timed("clerk: session token", fapi(`/client/sessions/${session.sid}/tokens`, session.db), {
    method: "POST",
    headers: clerkHeaders,
  });
  session.jwt = json(r.body)?.jwt ?? session.jwt;
  return !!json(r.body)?.jwt;
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
const apiOk = (r) => r.status; // 2xx expected; anything else shows in the status column

async function dashboard(session) {
  const cookie = `__session=${session.jwt}; __client_uat=${Math.floor(Date.now() / 1000)}; __clerk_db_jwt=${session.db}`;
  await timed("web: GET /dashboard (signed in)", `${WEB}/dashboard`, { headers: { cookie } });
  const auth = { headers: { Authorization: `Bearer ${session.jwt}` } };
  const results = await Promise.all(
    DASHBOARD_CALLS.map((p) => timed(`api: GET ${p}`, `${WEB}/api/v1${p}`, auth, apiOk).then((r) => [p, r])),
  );
  // Then open a note, like resuming where you left off
  const recent = json(Object.fromEntries(results)["/notes/recent"]?.body);
  const list = Array.isArray(recent) ? recent : recent?.notes ?? recent?.items ?? [];
  const noteId = list[Math.floor(Math.random() * list.length)]?._id ?? list[0]?.id;
  if (noteId) await timed("api: GET /notes/:id", `${WEB}/api/v1/notes/${noteId}`, auth, apiOk);
}

// ---- run -----------------------------------------------------------------
let signedIn = 0;
const end = Date.now() + RAMP_MS + seconds * 1000;
async function user(i) {
  await sleep((RAMP_MS * i) / users);
  const session = await signIn(accounts[i % accounts.length]);
  if (!session) return;
  signedIn++;
  let lastRefresh = Date.now();
  while (Date.now() < end) {
    // Clerk session tokens live 60s; the browser refreshes ~every 50s.
    if (Date.now() - lastRefresh > 45000) {
      await refresh(session);
      lastRefresh = Date.now();
    }
    await dashboard(session);
    await think();
  }
}
const t0 = performance.now();
await Promise.all(Array.from({ length: users }, (_, i) => user(i)));
const wall = (performance.now() - t0) / 1000;

// ---- report --------------------------------------------------------------
const pct = (a, p) => a[Math.min(a.length - 1, Math.floor((p / 100) * a.length))];
const f = (v) => (v / 1000).toFixed(2) + "s";
let total = 0, bad = 0;
console.log(`\n${users} users on ${accounts.length} account(s), sign-ins over ${RAMP_MS / 1000}s, then ${seconds}s of dashboard loads, think ${thinkMin}-${thinkMax}ms`);
console.log(`signed in: ${signedIn}/${users}  sign-in outcomes: ${JSON.stringify(signInOutcomes)}`);
console.log("endpoint".padEnd(38), "n".padStart(6), "p50".padStart(7), "p95".padStart(7), "p99".padStart(7), "max".padStart(7), " status");
for (const [name, s] of [...stats].sort(([a], [b]) => a.localeCompare(b))) {
  const a = s.lat.sort((x, y) => x - y);
  total += a.length;
  for (const [c, n] of Object.entries(s.codes)) if (!/^[23]/.test(c)) bad += n;
  console.log(name.padEnd(38), String(a.length).padStart(6), f(pct(a, 50)).padStart(7), f(pct(a, 95)).padStart(7), f(pct(a, 99)).padStart(7), f(a[a.length - 1]).padStart(7), " " + JSON.stringify(s.codes));
}
console.log(`\ntotal ${total} requests in ${wall.toFixed(1)}s = ${(total / wall).toFixed(1)} req/s, non-2xx/3xx: ${bad}`);
if (signedIn === 0) process.exit(1);
