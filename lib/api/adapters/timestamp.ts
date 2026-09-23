/** Normalizes REST date fields (ISO strings or epoch ms) to Convex-style numbers. */
export function toTimestamp(value: string | number | null | undefined): number | undefined {
  if (value == null) return undefined;
  if (typeof value === "number") return value;
  return new Date(value).getTime();
}
