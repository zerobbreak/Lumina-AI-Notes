declare const apiPathBrand: unique symbol;

/**
 * A request path whose dynamic parts are safely encoded. `apiFetch` only takes
 * this type, so every path has to be built with the `apiPath` tag below.
 */
export type ApiPath = string & { readonly [apiPathBrand]: true };

/** Thrown when a value can't safely be used as a path segment. */
export class UnsafePathSegmentError extends Error {
  constructor(value: string) {
    super(`Refusing to use ${JSON.stringify(value)} as an API path segment`);
    this.name = "UnsafePathSegmentError";
  }
}

/**
 * Makes one value a single path segment. Ids often come from the address bar
 * (`?noteId=`), so they must never be able to change which endpoint a request
 * reaches: "/" and "?" and "#" are percent-encoded, and "." / ".." are refused
 * because browsers resolve those, even percent-encoded as %2E, as directory
 * steps, turning `/notes/../courses/1` into `/courses/1`.
 */
function segment(value: string | number): string {
  const text = String(value);
  if (text === "" || /^(?:\.|%2e){1,2}$/i.test(text)) {
    throw new UnsafePathSegmentError(text);
  }
  return encodeURIComponent(text);
}

/**
 * Tag for API paths: apiPath`/notes/${noteId}/presence`. Every interpolated
 * value is encoded as exactly one path segment. Query strings go in
 * apiFetch's `query` option, never in the path.
 */
export function apiPath(strings: TemplateStringsArray, ...values: Array<string | number>): ApiPath {
  let path = strings[0];
  values.forEach((value, i) => {
    path += segment(value) + strings[i + 1];
  });
  if (!path.startsWith("/") || /[?#]/.test(path)) {
    throw new Error(`API paths start with "/" and carry no query or fragment: ${path}`);
  }
  return path as ApiPath;
}

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

/** "?a=1&b=2" from the defined entries, or "" when there are none. */
export function queryString(params: QueryParams | undefined): string {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}
