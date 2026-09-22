import request from "supertest";
import { describe, expect, it } from "vitest";
import { loadEnv } from "../src/env.js";
import { buildApp } from "./helpers.js";

// Uses the real Clerk middleware; no token means signed out.
const app = buildApp();

describe("server", () => {
  it("answers the healthcheck without auth", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("rejects API calls without a session token", async () => {
    for (const path of ["/api/v1/me", "/api/v1/uploads/download-url?key=x"]) {
      const res = await request(app).get(path);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("unauthenticated");
    }
  });

  it("returns JSON 404 for unknown routes", async () => {
    const res = await request(app).get("/nope");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("not_found");
  });

  it("returns JSON 400 for malformed bodies", async () => {
    const res = await request(app)
      .post("/api/v1/me")
      .set("Content-Type", "application/json")
      .send("{not json");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("bad_request");
  });

  it("allows the web app and packaged Electron origins only", async () => {
    const web = await request(app).get("/health").set("Origin", "http://localhost:3000");
    expect(web.headers["access-control-allow-origin"]).toBe("http://localhost:3000");

    const electron = await request(app).get("/health").set("Origin", "null");
    expect(electron.headers["access-control-allow-origin"]).toBe("null");

    const other = await request(app).get("/health").set("Origin", "https://evil.example");
    expect(other.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("reports every missing env var at once", () => {
    expect(() => loadEnv({})).toThrow(
      /DATABASE_URL[\s\S]*CLERK_PUBLISHABLE_KEY[\s\S]*CLERK_SECRET_KEY[\s\S]*S3_ENDPOINT/,
    );
  });
});
