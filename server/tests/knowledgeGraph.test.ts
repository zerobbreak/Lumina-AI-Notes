import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildKnowledgeGraph } from "../src/knowledgeGraph/buildGraph.js";
import type { Db } from "../src/db/client.js";
import { users } from "../src/db/schema/index.js";
import { bearer, buildApp, createTestDb } from "./helpers.js";

const ALICE = "user_alice";

let db: Db;
let closeDb: () => Promise<void>;
let app: ReturnType<typeof buildApp>;

beforeAll(async () => {
  ({ db, close: closeDb } = await createTestDb());
});
afterAll(() => closeDb?.());

beforeEach(async () => {
  await db.delete(users);
  app = buildApp({ db });
});

const as = (user: string) => ({
  get: (path: string) => request(app).get(path).set("Authorization", bearer(user)),
  post: (path: string) => request(app).post(path).set("Authorization", bearer(user)),
});

describe("buildKnowledgeGraph", () => {
  it("links notes via wikilinks", () => {
    const graph = buildKnowledgeGraph([
      { id: "a", title: "Alpha", content: "See [[Beta]] for more", embedding: null },
      { id: "b", title: "Beta", content: "Detail", embedding: null },
    ]);
    expect(graph.edges).toContainEqual({ source: "a", target: "b", type: "wikilink" });
    expect(graph.nodes.find((n) => n.id === "a")?.connectionCount).toBe(1);
  });
});

describe("GET /api/v1/knowledge-graph", () => {
  it("returns wikilink edges for the user's notes", async () => {
    const alpha = await as(ALICE).post("/api/v1/notes").send({
      title: "Alpha",
      content: "Links to [[Beta]]",
    });
    await as(ALICE).post("/api/v1/notes").send({ title: "Beta", content: "Target note" });

    const res = await as(ALICE).get("/api/v1/knowledge-graph");
    expect(res.status).toBe(200);
    expect(res.body.nodes).toHaveLength(2);
    expect(res.body.edges).toContainEqual({
      source: alpha.body.id,
      target: expect.any(String),
      type: "wikilink",
    });
  });
});
