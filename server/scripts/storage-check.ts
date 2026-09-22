/**
 * End-to-end check of the Railway bucket, doing what a client would:
 * signed PUT -> stat -> signed GET -> rejected tampering -> CORS preflight -> delete.
 *
 *   npm run storage:check
 *
 * Uses server/.env. Writes only under `healthcheck/` and deletes what it creates.
 */
import { randomUUID } from "node:crypto";
import { request as httpsRequest } from "node:https";
import { loadEnv } from "../src/env.js";
import { createStorage } from "../src/storage/s3.js";

try {
  process.loadEnvFile(".env");
} catch {
  // Fall back to the real environment.
}
const env = loadEnv();
const storage = createStorage({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  bucket: env.S3_BUCKET,
  accessKeyId: env.S3_ACCESS_KEY_ID,
  secretAccessKey: env.S3_SECRET_ACCESS_KEY,
});

/**
 * fetch() treats Origin and Access-Control-Request-* as forbidden headers and
 * drops them, so a real preflight has to go out over plain https.
 */
function rawPreflight(url: string, origin: string) {
  return new Promise<{ status: number; allowOrigin: string | undefined }>((resolve, reject) => {
    const req = httpsRequest(
      url,
      {
        method: "OPTIONS",
        headers: {
          Origin: origin,
          "Access-Control-Request-Method": "PUT",
          "Access-Control-Request-Headers": "content-type",
        },
      },
      (res) => {
        res.resume();
        const allow = res.headers["access-control-allow-origin"];
        resolve({ status: res.statusCode ?? 0, allowOrigin: Array.isArray(allow) ? allow[0] : allow });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures++;
}

const key = `healthcheck/${randomUUID()}/hello.txt`;
const body = new TextEncoder().encode(`lumina storage check ${new Date().toISOString()}`);

try {
  // 1. Signed upload, exactly as the browser will do it.
  const upload = await storage.createUploadUrl(key, "text/plain", body.byteLength);
  const put = await fetch(upload.url, { method: "PUT", headers: upload.headers, body });
  check("upload via signed PUT", put.ok, `HTTP ${put.status}`);

  // 2. The API can confirm it landed before saving a DB row.
  const stat = await storage.stat(key);
  check(
    "stat reports size and type",
    stat?.size === body.byteLength && stat?.contentType === "text/plain",
    JSON.stringify(stat),
  );

  // 3. Signed download returns the same bytes.
  const get = await fetch(await storage.createDownloadUrl(key, "hello.txt"));
  const downloaded = new Uint8Array(await get.arrayBuffer());
  check(
    "download via signed GET",
    get.ok && Buffer.from(downloaded).equals(Buffer.from(body)),
    `HTTP ${get.status}, ${downloaded.byteLength} bytes`,
  );

  // 4. The bucket stays private without a signature.
  const bare = await fetch(`https://${env.S3_BUCKET}.${new URL(env.S3_ENDPOINT).host}/${key}`);
  check("unsigned GET is refused", !bare.ok, `HTTP ${bare.status}`);

  // 5. A signed URL can't be reused for a bigger file...
  const sizeKey = `healthcheck/${randomUUID()}/size.txt`;
  const sized = await storage.createUploadUrl(sizeKey, "text/plain", 10);
  const tooBig = await fetch(sized.url, {
    method: "PUT",
    headers: sized.headers,
    body: new Uint8Array(10_000),
  }).catch((e: Error) => ({ ok: false, status: e.message }));
  check("oversized body is rejected", !tooBig.ok, `HTTP ${tooBig.status}`);
  await storage.delete(sizeKey);

  // 6. ...or for a different file type.
  const typeKey = `healthcheck/${randomUUID()}/type.txt`;
  const typed = await storage.createUploadUrl(typeKey, "text/plain", body.byteLength);
  const wrongType = await fetch(typed.url, {
    method: "PUT",
    headers: { "Content-Type": "application/x-msdownload" },
    body,
  });
  check("mismatched content type is rejected", !wrongType.ok, `HTTP ${wrongType.status}`);
  await storage.delete(typeKey);

  // 7. Browsers preflight cross-origin PUTs; the bucket must answer for our origins.
  for (const origin of env.CORS_ORIGINS) {
    const preflight = await rawPreflight(upload.url, origin);
    const allowed = preflight.allowOrigin;
    check(
      `browser CORS preflight from ${origin}`,
      preflight.status < 300 && (allowed === origin || allowed === "*"),
      `HTTP ${preflight.status}, allow-origin=${allowed ?? "none"}`,
    );
  }

  // 8. Delete, then confirm it's gone.
  await storage.delete(key);
  check("delete removes the object", (await storage.stat(key)) === null);
} catch (err) {
  failures++;
  console.error("FAIL  unexpected error:", err);
  await storage.delete(key).catch(() => {});
}

console.log(failures ? `\n${failures} check(s) failed` : "\nAll storage checks passed");
process.exit(failures ? 1 : 0);
