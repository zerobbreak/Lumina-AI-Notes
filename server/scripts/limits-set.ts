/**
 * Raise (or cut) one beta tester's limits on top of their plan.
 *
 *   npm run limits:set -- student@uni.ac.za aiCallsPerDay=250 storageBytes=3GB
 *   npm run limits:set -- student@uni.ac.za --reset      # back to plan defaults
 *   npm run limits:set -- student@uni.ac.za               # just show their limits
 *
 * Keys: aiCallsPerMinute, aiCallsPerDay, audioMinutesPerMonth, storageBytes.
 * Uses DATABASE_URL from server/.env; point it at production deliberately.
 */
import { createDb } from "../src/db/client.js";
import { parseOverrides, setUserLimits } from "../src/plans/admin.js";

try {
  process.loadEnvFile(".env");
} catch {
  // Fall back to the real environment.
}

const [email, ...rest] = process.argv.slice(2);
if (!email || !process.env.DATABASE_URL) {
  console.error("Usage: npm run limits:set -- <email> [key=value ...] [--reset]  (needs DATABASE_URL)");
  process.exit(1);
}

const { db, pool } = createDb(process.env.DATABASE_URL);
try {
  const result = rest.includes("--reset")
    ? await setUserLimits(db, email, null)
    : await setUserLimits(db, email, parseOverrides(rest));
  console.log(`${result.email}`);
  console.log(`  overrides: ${JSON.stringify(result.overrides ?? {})}`);
  console.log(`  effective: ${JSON.stringify(result.limits)}`);
} catch (error) {
  console.error((error as Error).message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
