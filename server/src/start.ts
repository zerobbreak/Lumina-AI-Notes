/**
 * Railway entry point for every service built from server/. They share one
 * railway.json (start command, /health check, migrations), so the service's
 * LUMINA_ROLE variable picks what runs: the API by default, or "worker".
 */
const role = process.env.LUMINA_ROLE ?? "api";

if (role === "worker") {
  await import("./worker.js");
} else if (role === "api") {
  await import("./index.js");
} else {
  console.error(`Unknown LUMINA_ROLE "${role}"; expected "api" or "worker"`);
  process.exit(1);
}
