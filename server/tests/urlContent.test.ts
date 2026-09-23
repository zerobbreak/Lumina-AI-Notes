import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { lookup as dnsLookup } from "node:dns";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  fetchReferenceUrlsForPrompt,
  fetchUrlTextSnippet,
  normalizeReferenceUrlList,
  type FetchPolicy,
} from "../src/ai/urlContent.js";
import { isPublicAddress } from "../src/net/publicAddress.js";

const SECRET = "INTERNAL-ONLY SECRET: db_password=hunter2, and enough text to count as readable";

/** Stands in for something on the private network. */
let internal: Server;
let internalPort: number;
/** Answers with a redirect to wherever the ?to= parameter says. */
let redirector: Server;
let redirectorPort: number;

const listen = (server: Server) =>
  new Promise<number>((resolve) => server.listen(0, "127.0.0.1", () => resolve((server.address() as AddressInfo).port)));

beforeAll(async () => {
  internal = createServer((_req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.end(`<html><title>Internal</title><body>${SECRET}</body></html>`);
  });
  redirector = createServer((req, res) => {
    const to = new URL(req.url ?? "/", "http://x").searchParams.get("to") ?? "/";
    res.writeHead(302, { Location: to });
    res.end();
  });
  internalPort = await listen(internal);
  redirectorPort = await listen(redirector);
});
afterAll(() => {
  internal.close();
  redirector.close();
});

/**
 * Resolves made-up names the way an attacker's DNS would, so tests never
 * touch the real network: every name in `records` resolves to that address.
 */
function fakeDns(records: Record<string, string>): typeof dnsLookup {
  return ((hostname: string, options: { all?: boolean }, callback: (...args: unknown[]) => void) => {
    const address = records[hostname];
    if (!address) {
      callback(Object.assign(new Error(`ENOTFOUND ${hostname}`), { code: "ENOTFOUND" }));
      return;
    }
    const family = address.includes(":") ? 6 : 4;
    if (options.all) callback(null, [{ address, family }]);
    else callback(null, address, family);
  }) as unknown as typeof dnsLookup;
}

/** Treats loopback as "public" so the local test servers can play the internet. */
const loopbackIsPublic = (ip: string) => ip === "127.0.0.1" || isPublicAddress(ip);

describe("isPublicAddress", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "::",
    "::1",
    "::ffff:127.0.0.1",
    "::ffff:7f00:1",
    "::ffff:a9fe:a9fe",
    "64:ff9b::7f00:1",
    "2002:7f00:1::",
    "fd12:3456::1",
    "fe80::1",
    "[::1]",
    "fe80::1%eth0",
    "not-an-ip",
  ])("refuses %s", (ip) => {
    expect(isPublicAddress(ip)).toBe(false);
  });

  it.each(["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111", "[2001:4860:4860::8888]"])("allows %s", (ip) => {
    expect(isPublicAddress(ip)).toBe(true);
  });
});

describe("normalizeReferenceUrlList", () => {
  it("drops literal internal addresses, including IPv6 spellings of IPv4 ones", () => {
    expect(
      normalizeReferenceUrlList([
        "http://[::ffff:127.0.0.1]/",
        "http://[::ffff:169.254.169.254]/",
        "http://[fd12::1]/",
        "http://[fe80::1]/",
        "http://[::]/",
        "http://postgres.railway.internal:5432/",
        "http://printer.local/",
      ]),
    ).toEqual([]);
  });

  it("keeps ordinary public links", () => {
    expect(normalizeReferenceUrlList(["en.wikipedia.org/wiki/Entropy"])).toEqual([
      "https://en.wikipedia.org/wiki/Entropy",
    ]);
  });
});

describe("fetchUrlTextSnippet", () => {
  it("fetches and extracts text from an allowed host", async () => {
    const result = await fetchUrlTextSnippet(`http://127.0.0.1:${internalPort}/`, {
      isAllowedAddress: loopbackIsPublic,
    });
    expect(result.error).toBeUndefined();
    expect(result.title).toBe("Internal");
    expect(result.text).toContain("db_password");
  });

  it("refuses an IPv4-mapped IPv6 literal that points at loopback", async () => {
    const result = await fetchUrlTextSnippet(`http://[::ffff:127.0.0.1]:${internalPort}/`);
    expect(result).toMatchObject({ text: "", error: "URL host is not allowed" });
  });

  it("refuses a public-looking name that resolves to an internal address", async () => {
    const policy: FetchPolicy = { lookup: fakeDns({ "innocent.example": "127.0.0.1" }) };
    const result = await fetchUrlTextSnippet(`http://innocent.example:${internalPort}/`, policy);
    expect(result).toMatchObject({ text: "", error: "URL host is not allowed" });
  });

  it("refuses a name that resolves to the cloud metadata address", async () => {
    const policy: FetchPolicy = { lookup: fakeDns({ "169.254.169.254.nip.io": "169.254.169.254" }) };
    const result = await fetchUrlTextSnippet("http://169.254.169.254.nip.io/latest/meta-data/", policy);
    expect(result).toMatchObject({ text: "", error: "URL host is not allowed" });
  });

  it("refuses a redirect from an allowed host to an internal name", async () => {
    const policy: FetchPolicy = {
      lookup: fakeDns({ "internal.example": "10.0.0.5" }),
      isAllowedAddress: loopbackIsPublic,
    };
    const to = encodeURIComponent("http://internal.example/");
    const result = await fetchUrlTextSnippet(`http://127.0.0.1:${redirectorPort}/?to=${to}`, policy);
    expect(result).toMatchObject({ text: "", error: "URL host is not allowed" });
  });

  it("refuses a redirect to a literal internal address", async () => {
    const to = encodeURIComponent(`http://[::ffff:127.0.0.1]:${internalPort}/`);
    const result = await fetchUrlTextSnippet(`http://127.0.0.1:${redirectorPort}/?to=${to}`, {
      isAllowedAddress: (ip) => ip === "127.0.0.1",
    });
    expect(result).toMatchObject({ text: "", error: "URL host is not allowed" });
  });

  it("refuses a redirect to a non-http scheme", async () => {
    const to = encodeURIComponent("file:///etc/passwd");
    const result = await fetchUrlTextSnippet(`http://127.0.0.1:${redirectorPort}/?to=${to}`, {
      isAllowedAddress: loopbackIsPublic,
    });
    expect(result).toMatchObject({ text: "", error: "Only http(s) URLs are allowed" });
  });

  it("follows a redirect between allowed hosts", async () => {
    const to = encodeURIComponent(`http://127.0.0.1:${internalPort}/`);
    const result = await fetchUrlTextSnippet(`http://127.0.0.1:${redirectorPort}/?to=${to}`, {
      isAllowedAddress: loopbackIsPublic,
    });
    expect(result.text).toContain("db_password");
  });

  it("gives up on a redirect loop", async () => {
    const self = `http://127.0.0.1:${redirectorPort}/`;
    const loop = `${self}?to=${encodeURIComponent(self)}`;
    const result = await fetchUrlTextSnippet(loop, { isAllowedAddress: loopbackIsPublic });
    expect(result).toMatchObject({ text: "", error: "Too many redirects" });
  });

  it("stops reading a response over the size cap", async () => {
    const big = createServer((_req, res) => {
      res.setHeader("Content-Type", "text/plain");
      res.end("x".repeat(2_000_000));
    });
    const port = await listen(big);
    try {
      const result = await fetchUrlTextSnippet(`http://127.0.0.1:${port}/`, { isAllowedAddress: loopbackIsPublic });
      expect(result).toMatchObject({ text: "", error: "Response too large" });
    } finally {
      big.close();
    }
  });
});

describe("fetchReferenceUrlsForPrompt", () => {
  it("never puts internal content into the prompt", async () => {
    const block = await fetchReferenceUrlsForPrompt(
      [`http://[::ffff:127.0.0.1]:${internalPort}/`, `http://innocent.example:${internalPort}/`],
      { lookup: fakeDns({ "innocent.example": "127.0.0.1" }) },
    );
    expect(block).not.toContain("db_password");
  });
});
