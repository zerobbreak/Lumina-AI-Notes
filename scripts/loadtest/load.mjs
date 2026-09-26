// Simple virtual-user load test: node load.mjs <users> <seconds> <thinkMinMs> <thinkMaxMs>
const WEB = "https://lumina-web-production-e6ce.up.railway.app";
const API = "https://lumina-api-production-beed.up.railway.app";
const [users = 50, seconds = 60, thinkMin = 1000, thinkMax = 3000] = process.argv.slice(2).map(Number);

const html = await (await fetch(WEB + "/")).text();
const assets = process.env.NOASSETS ? [] : [...new Set([...html.matchAll(/\/_next\/static\/[^"'\s)]+\.(?:js|css)/g)].map((m) => m[0]))];

const stats = new Map();
function rec(name, ms, status) {
  let s = stats.get(name);
  if (!s) stats.set(name, (s = { lat: [], codes: {} }));
  s.lat.push(ms);
  s.codes[status] = (s.codes[status] || 0) + 1;
}
async function hit(name, url) {
  const t = performance.now();
  let status;
  try {
    const r = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(30000) });
    await r.arrayBuffer();
    status = r.status;
  } catch (e) {
    status = e.name === "TimeoutError" ? "timeout" : "neterr";
  }
  rec(name, performance.now() - t, status);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const think = () => sleep(thinkMin + Math.random() * (thinkMax - thinkMin));

const end = Date.now() + seconds * 1000;
async function user() {
  while (Date.now() < end) {
    // First visit: landing page + its JS/CSS in parallel, like a browser
    await hit("GET / (landing)", WEB + "/");
    await Promise.all(assets.map((a) => hit("static asset", WEB + a)));
    await think();
    await hit("GET /sign-in", WEB + "/sign-in");
    await think();
    await hit("GET /dashboard (redirect)", WEB + "/dashboard");
    await hit("GET /api/v1/users/me via web proxy (401)", WEB + "/api/v1/users/me");
    await hit("GET api /health", API + "/health");
    await think();
  }
}
const t0 = performance.now();
await Promise.all(Array.from({ length: users }, (_, i) => sleep(i * 100).then(user)));
const wall = (performance.now() - t0) / 1000;

const pct = (a, p) => a[Math.min(a.length - 1, Math.floor((p / 100) * a.length))];
let total = 0, bad = 0;
console.log(`\n${users} users, ${seconds}s, think ${thinkMin}-${thinkMax}ms, ${assets.length} assets/visit`);
console.log("endpoint".padEnd(42), "n".padStart(6), "p50".padStart(7), "p95".padStart(7), "p99".padStart(7), "max".padStart(7), " status");
for (const [name, s] of stats) {
  const a = s.lat.sort((x, y) => x - y);
  total += a.length;
  for (const [c, n] of Object.entries(s.codes)) if (!/^[23]/.test(c) && c !== "401") bad += n;
  const f = (v) => (v / 1000).toFixed(2) + "s";
  console.log(name.padEnd(42), String(a.length).padStart(6), f(pct(a, 50)).padStart(7), f(pct(a, 95)).padStart(7), f(pct(a, 99)).padStart(7), f(a[a.length - 1]).padStart(7), " " + JSON.stringify(s.codes));
}
console.log(`\ntotal ${total} requests in ${wall.toFixed(1)}s = ${(total / wall).toFixed(1)} req/s, unexpected errors: ${bad}`);
