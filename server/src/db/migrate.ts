import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

// Runs as Railway's pre-deploy step, so it uses drizzle-orm (a runtime
// dependency) rather than drizzle-kit. Two levels up from both src/db and dist/db.
const migrationsFolder = fileURLToPath(new URL("../../drizzle", import.meta.url));

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

// Every service built from server/ runs this before deploying (one shared
// railway.json), so the API and worker can race. A session advisory lock makes
// the second wait, then find nothing left to apply.
const MIGRATION_LOCK = 7_310_424_117;

const client = new pg.Client({ connectionString });
try {
  await client.connect();
  await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK]);
  await migrate(drizzle(client), { migrationsFolder });
  console.log("Migrations applied");
} catch (err) {
  console.error("Migration failed:", err);
  process.exitCode = 1;
} finally {
  // Ending the session releases the lock too.
  await client.end().catch(() => {});
}
