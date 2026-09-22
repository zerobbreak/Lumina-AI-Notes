import { sql } from "drizzle-orm";
import type { AnyColumn } from "drizzle-orm";

/** Generated tsvector @@ websearch_to_tsquery('english', query). */
export const matchesSearch = (column: AnyColumn, query: string) =>
  sql`${column} @@ websearch_to_tsquery('english', ${query})`;
