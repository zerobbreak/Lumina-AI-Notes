/** True when the Next.js app should call the Express API instead of Convex. */
export function isRestApiEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_API_URL?.trim());
}
