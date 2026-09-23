/** Base URL for the Express API (includes `/api/v1`). */
export function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_API_URL is not set. Example: http://localhost:4000/api/v1",
    );
  }
  return url.replace(/\/$/, "");
}
