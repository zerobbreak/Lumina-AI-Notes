import { sql } from "drizzle-orm";
import { customType, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Text primary key. Rows imported from Convex keep their Convex `_id`, so
 * existing links (e.g. /notes/<id>) keep working; new rows get a UUID.
 */
export const id = () =>
  text()
    .primaryKey()
    .default(sql`gen_random_uuid()::text`);

/** Convex stored ms numbers; Postgres gets real timestamps. */
export const timestamptz = () => timestamp({ withTimezone: true, mode: "date" });

export const createdAt = () => timestamptz().notNull().defaultNow();

export const updatedAt = () =>
  timestamptz()
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/** Full-text search column, always generated from other columns (see `searchVector`). */
export const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

/**
 * Replaces a Convex searchIndex. Takes the raw snake_case column name because
 * generated-column SQL is written verbatim into the migration.
 */
export const searchVector = (column: string) =>
  tsvector().generatedAlwaysAs(sql.raw(`to_tsvector('english', coalesce(${column}, ''))`));

/** gemini-embedding-001 with outputDimensionality 768. */
export const EMBEDDING_DIMENSIONS = 768;
