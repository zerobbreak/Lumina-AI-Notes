/**
 * Who uses what, and what it costs in Gemini tokens. Run it through the beta
 * to decide where Free/Pro limits go.
 *
 *   npm run usage:report            # last 7 days
 *   npm run usage:report -- 30      # last 30 days
 *
 * Uses DATABASE_URL from server/.env; point it at production deliberately.
 */
import { desc, isNull } from "drizzle-orm";
import { createDb } from "../src/db/client.js";
import { feedback } from "../src/db/schema/index.js";
import { usageByFeature, usageByUser } from "../src/plans/admin.js";

try {
  process.loadEnvFile(".env");
} catch {
  // Fall back to the real environment.
}

const days = Number(process.argv[2] ?? 7);
if (!process.env.DATABASE_URL || !(days > 0)) {
  console.error("Usage: npm run usage:report -- [days]  (needs DATABASE_URL)");
  process.exit(1);
}

const { db, pool } = createDb(process.env.DATABASE_URL);
try {
  const [byUser, byFeature] = await Promise.all([usageByUser(db, days), usageByFeature(db, days)]);
  console.log(`\nActive users, last ${days} days (${byUser.length})`);
  console.table(byUser);
  console.log(`\nTokens by feature, last ${days} days`);
  console.table(byFeature);
  console.log("Audio minutes are for the current calendar month. Storage per user: GET /users/me/usage.");

  // Normally empty: feedback lands in the Google Form. Anything here wasn't
  // sent (form not configured, closed, or changed) and exists only in Postgres.
  const unsent = await db
    .select({ createdAt: feedback.createdAt, kind: feedback.kind, message: feedback.message, page: feedback.page })
    .from(feedback)
    .where(isNull(feedback.forwardedAt))
    .orderBy(desc(feedback.createdAt))
    .limit(50);
  if (unsent.length > 0) {
    console.log(`
Feedback that never reached the Google Form (${unsent.length}, newest first)`);
    console.table(unsent.map((row) => ({ ...row, message: row.message.slice(0, 120) })));
  }
} finally {
  await pool.end();
}
