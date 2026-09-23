/** Maps REST `id` fields to Convex-style `_id` for gradual UI migration. */
export function withConvexId<T extends { id: string }>(
  row: T,
): Omit<T, "id"> & { _id: string } {
  const { id, ...rest } = row;
  return { ...rest, _id: id };
}

export function withConvexIds<T extends { id: string }>(rows: T[]) {
  return rows.map(withConvexId);
}
