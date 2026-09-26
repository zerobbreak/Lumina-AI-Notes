import { getApiBaseUrl } from "./config";
import { ApiError } from "./errors";
import { notifyLimitReached } from "./limits";
import { queryString, type ApiPath, type QueryParams } from "./path";
import { freshToken, REJECTED_TOKEN_CODES, sessionLost } from "./session";

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

/** The API's error code, read from a copy so the caller can still read the body. */
async function errorCode(res: Response): Promise<string | undefined> {
  try {
    const payload = (await res.clone().json()) as { error?: { code?: string } };
    return payload.error?.code;
  } catch {
    return undefined;
  }
}

/**
 * Sends the request and returns the raw response. If the API refuses the
 * session token (expired, or stale after the device slept), it gets a fresh
 * token from Clerk and retries once. If that one is refused too the session is
 * gone, so the user is sent back to sign in rather than left on a dashboard
 * whose every request fails.
 */
export async function apiResponse(path: ApiPath, options: ApiFetchOptions = {}): Promise<Response> {
  const { token, body, headers, query, ...rest } = options;
  const send = (bearer: string | undefined) =>
    fetch(apiUrl(path, query), {
      ...rest,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  const res = await send(token);
  if (res.status !== 401 || !token || !REJECTED_TOKEN_CODES.has((await errorCode(res)) ?? "")) {
    return res;
  }

  const renewed = await freshToken();
  if (!renewed) {
    sessionLost();
    return res;
  }
  const retried = await send(renewed);
  if (retried.status === 401) {
    sessionLost();
  }
  return retried;
}

/** Turns a failed response into an ApiError with the API's message and code. */
export async function toApiError(res: Response): Promise<ApiError> {
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
  const error = new ApiError(message, res.status, code);
  notifyLimitReached(error);
  return error;
}

export async function apiFetch<T>(path: ApiPath, options: ApiFetchOptions = {}): Promise<T> {
  const res = await apiResponse(path, options);
  if (!res.ok) {
    throw await toApiError(res);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}
