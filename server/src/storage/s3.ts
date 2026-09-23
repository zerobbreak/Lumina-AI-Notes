import { randomUUID } from "node:crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  NotFound,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export type StorageConfig = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
};

export type UploadTarget = {
  key: string;
  url: string;
  method: "PUT";
  /** The client must send exactly these headers; they're part of the signature. */
  headers: Record<string, string>;
  expiresAt: string;
};

export type StoredObject = { size: number; contentType: string | undefined };

/** Presigned URLs are short-lived; the client should use them straight away. */
const UPLOAD_URL_TTL_SECONDS = 5 * 60;
const DOWNLOAD_URL_TTL_SECONDS = 60 * 60;

/**
 * The Railway bucket is private. The API never proxies file bytes: it signs
 * short-lived URLs and clients PUT/GET directly against the bucket.
 * Replaces Convex's generateUploadUrl / storage.getUrl / storage.delete.
 */
export function createStorage(config: StorageConfig) {
  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    // Railway buckets use virtual-host style URLs (<bucket>.<endpoint host>).
    forcePathStyle: false,
  });
  const Bucket = config.bucket;

  return {
    /**
     * Signs a single PUT for exactly `size` bytes of `contentType`. Content-Length
     * is signed, so the bucket rejects a body of any other size.
     */
    async createUploadUrl(key: string, contentType: string, size: number): Promise<UploadTarget> {
      const command = new PutObjectCommand({
        Bucket,
        Key: key,
        ContentType: contentType,
        ContentLength: size,
      });
      const url = await getSignedUrl(client, command, {
        expiresIn: UPLOAD_URL_TTL_SECONDS,
        signableHeaders: new Set(["content-type", "content-length"]),
      });
      return {
        key,
        url,
        method: "PUT",
        headers: { "Content-Type": contentType },
        expiresAt: new Date(Date.now() + UPLOAD_URL_TTL_SECONDS * 1000).toISOString(),
      };
    },

    /** `filename` makes browsers download with that name instead of the key. */
    async createDownloadUrl(key: string, filename?: string): Promise<string> {
      // Anything that could run script when opened (older SVG uploads, say)
      // is always downloaded, never rendered on the bucket's origin.
      const disposition = isActiveContent(key) || (filename && isActiveContent(filename)) ? "attachment" : "inline";
      const command = new GetObjectCommand({
        Bucket,
        Key: key,
        ResponseContentDisposition: filename
          ? `${disposition}; filename*=UTF-8''${encodeURIComponent(filename)}`
          : disposition === "attachment"
            ? "attachment"
            : undefined,
      });
      return getSignedUrl(client, command, { expiresIn: DOWNLOAD_URL_TTL_SECONDS });
    },

    /** Size and type of an uploaded object, or null if it isn't there (yet). */
    async stat(key: string): Promise<StoredObject | null> {
      try {
        const head = await client.send(new HeadObjectCommand({ Bucket, Key: key }));
        return { size: head.ContentLength ?? 0, contentType: head.ContentType };
      } catch (err) {
        if (err instanceof NotFound || (err as { name?: string }).name === "NotFound") {
          return null;
        }
        throw err;
      }
    },

    /** For server-produced files, e.g. isolated audio or generated exports. */
    async put(key: string, body: Uint8Array, contentType: string): Promise<void> {
      await client.send(new PutObjectCommand({ Bucket, Key: key, Body: body, ContentType: contentType }));
    },

    /** For server-side processing, e.g. extracting text from an uploaded PDF. */
    async getBytes(key: string): Promise<Uint8Array> {
      const res = await client.send(new GetObjectCommand({ Bucket, Key: key }));
      if (!res.Body) {
        throw new Error(`Empty body for ${key}`);
      }
      return res.Body.transformToByteArray();
    },

    /** Idempotent: deleting a missing key succeeds. */
    async delete(key: string): Promise<void> {
      await client.send(new DeleteObjectCommand({ Bucket, Key: key }));
    },

    client,
    bucket: Bucket,
  };
}

export type Storage = ReturnType<typeof createStorage>;

/** File types a browser would execute script from if shown inline. */
const ACTIVE_CONTENT = /\.(?:svgz?|html?|xhtml|xht|xml|mht|mhtml)$/i;

export function isActiveContent(name: string): boolean {
  return ACTIVE_CONTENT.test(name.trim());
}

/** Every object a user uploads lives under this prefix; ownership checks rely on it. */
export function userPrefix(userId: string): string {
  return `users/${userId}/`;
}

/**
 * `users/<userId>/<uuid>/<safe filename>`. The uuid folder keeps keys unique
 * while the original name stays readable in the bucket and in download links.
 */
export function newObjectKey(userId: string, filename: string): string {
  const safe =
    filename
      .normalize("NFKD")
      .replace(/[^\w.\- ]+/g, "")
      // No "..": isOwnedKey refuses keys containing it, which would lock the owner out.
      .replace(/\.{2,}/g, ".")
      .replace(/^\.+/, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(-100) || "file";
  return `${userPrefix(userId)}${randomUUID()}/${safe}`;
}

export function isOwnedKey(userId: string, key: string): boolean {
  return key.startsWith(userPrefix(userId)) && !key.includes("..");
}
