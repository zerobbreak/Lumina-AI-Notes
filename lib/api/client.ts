import { getApiBaseUrl } from "./config";
import { ApiError } from "./errors";
import { queryString, type ApiPath, type QueryParams } from "./path";

type ApiFetchOptions = Omit<RequestInit, "body"> & {
  token?: string;
  body?: unknown;
  /** Sent as the query string; undefined and null values are left out. */
  query?: QueryParams;
};

/** Full URL for an API path. Build `path` with the `apiPath` tag. */
export function apiUrl(path: ApiPath, query?: QueryParams): string {
  return `${getApiBaseUrl()}${path}${queryString(query)}`;
}

export async function apiFetch<T>(path: ApiPath, options: ApiFetchOptions = {}): Promise<T> {
  const { token, body, headers, query, ...rest } = options;
  const res = await fetch(apiUrl(path, query), {
    ...rest,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let message = res.statusText;
    let code: string | undefined;
    try {
      const payload = (await res.json()) as {
        message?: string;
        error?: string | { message?: string; code?: string };
        code?: string;
      };
      if (payload.error && typeof payload.error === "object") {
        message = payload.error.message ?? message;
        code = payload.error.code ?? code;
      } else {
        message = payload.message ?? (typeof payload.error === "string" ? payload.error : message);
        code = payload.code ?? code;
      }
    } catch {
      // Non-JSON error body
    }
    throw new ApiError(message, res.status, code);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}
