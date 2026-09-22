import type { ExtractTablesWithRelations } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import pg from "pg";
import * as schema from "./schema/index.js";

export function createDb(connectionString: string) {
  // The pool connects lazily, so creating it never blocks boot.
  const pool = new pg.Pool({ connectionString, max: 10 });
  const db = drizzle(pool, { schema, casing: "snake_case" });
  return { db, pool };
}

/**
 * Driver-agnostic handle: node-postgres in the app, PGlite in tests. Routes
 * should only use the query builder / db.query, not driver-specific results.
 */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>>;
