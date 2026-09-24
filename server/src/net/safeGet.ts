/**
 * GET for URLs a user typed in. Only public internet addresses are ever
 * connected to (see guardedLookup), every redirect hop is re-checked, and the
 * body is capped, so a user-supplied URL can't reach Railway's private network
 * or the cloud metadata service.
 */

import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { get as httpGet } from "node:http";
import { get as httpsGet } from "node:https";
import { isIP, type LookupFunction } from "node:net";
import { UserFacingError } from "../ai/errors.js";
import { isPublicAddress } from "./publicAddress.js";

const MAX_REDIRECTS = 5;

/** Swappable in tests, so they can point names at a local server. */
export type FetchPolicy = {
  lookup?: typeof dnsLookup;
  isAllowedAddress?: (ip: string) => boolean;
};

export type SafeGetOptions = FetchPolicy & {
  maxBytes: number;
  timeoutMs: number;
  accept: string;
  /** Schemes allowed on the first request and every redirect. Default: http and https. */
  protocols?: string[];
};

export type RawResponse = { status: number; contentType: string; body: Buffer };

export class BlockedHostError extends UserFacingError {
  constructor() {
    super("URL host is not allowed");
  }
}

/**
 * Cheap early filter on the URL as written. The real guard is `guardedLookup`
 * below, which checks the address actually connected to; this just drops
 * obviously-internal links before any work is done.
 */
export function isHostnameAllowed(hostname: string, isAllowedAddress = isPublicAddress): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (isIP(h)) return isAllowedAddress(h);
  if (h === "localhost" || h.endsWith(".localhost")) return false;
  // Railway private networking and mDNS names never resolve to public hosts.
  if (h.endsWith(".internal") || h.endsWith(".local")) return false;
  return true;
}

type Resolved = Required<FetchPolicy>;

/**
 * DNS lookup that refuses to hand back a non-public address. Runs at connect
 * time, so the address checked is the one connected to: a name that resolves
 * somewhere safe for a pre-check and somewhere internal for the real request
 * (DNS rebinding) can't slip through.
 */
function guardedLookup(policy: Resolved): LookupFunction {
  return (hostname, options, callback) => {
    policy.lookup(hostname, { ...options, all: true }, (err, addresses) => {
      const cb = callback as (e: Error | null, a?: unknown, f?: number) => void;
      if (err) return cb(err);
      const list = addresses as LookupAddress[];
      if (list.length === 0 || list.some((a) => !policy.isAllowedAddress(a.address))) {
        return cb(new BlockedHostError());
      }
      if (options.all) return cb(null, list);
      cb(null, list[0].address, list[0].family);
    });
  };
}

/** One GET, no redirects, body capped at maxBytes. */
function requestOnce(
  url: URL,
  policy: Resolved,
  options: SafeGetOptions,
  signal: AbortSignal,
): Promise<RawResponse & { location?: string }> {
  // A literal IP skips DNS, so the lookup guard never sees it: check it here.
  const literal = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(literal) && !policy.isAllowedAddress(literal)) {
    return Promise.reject(new BlockedHostError());
  }
  const get = url.protocol === "https:" ? httpsGet : httpGet;
  return new Promise((resolve, reject) => {
    const req = get(
      url,
      {
        signal,
        lookup: guardedLookup(policy),
        headers: { "User-Agent": "LuminaNotes/1.0", Accept: options.accept },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const contentType = String(res.headers["content-type"] ?? "");
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          resolve({ status, contentType, body: Buffer.alloc(0), location: res.headers.location });
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > options.maxBytes) {
            // Stop reading rather than buffering an unbounded body first.
            req.destroy(new UserFacingError("Response too large"));
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => resolve({ status, contentType, body: Buffer.concat(chunks) }));
        res.on("error", reject);
      },
    );
    req.on("error", reject);
  });
}

/** GET that follows redirects itself, re-checking every hop. */
export async function safeGet(url: URL, options: SafeGetOptions): Promise<RawResponse> {
  const policy: Resolved = {
    lookup: options.lookup ?? dnsLookup,
    isAllowedAddress: options.isAllowedAddress ?? isPublicAddress,
  };
  const protocols = options.protocols ?? ["http:", "https:"];
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new UserFacingError("Request timed out")), options.timeoutMs);
  try {
    let current = url;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      if (!protocols.includes(current.protocol)) {
        throw new UserFacingError(
          protocols.includes("http:") ? "Only http(s) URLs are allowed" : "Only https URLs are allowed",
        );
      }
      if (!isHostnameAllowed(current.hostname, policy.isAllowedAddress)) throw new BlockedHostError();
      const res = await requestOnce(current, policy, options, ctrl.signal);
      if (res.location === undefined) return res;
      current = new URL(res.location, current);
    }
    throw new UserFacingError("Too many redirects");
  } finally {
    clearTimeout(timer);
  }
}
