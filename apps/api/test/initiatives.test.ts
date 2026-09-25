import { env, exports } from "cloudflare:workers";
import { afterAll, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { Client } from "pg";
import * as schema from "../src/db/schema";

// Flow 4 autosave, against the real database: theses in a PATCH replace the whole ordered list. An entry with
// an id keeps that thesis (edited in place), an entry without one is new, and a saved thesis left out is removed.
//
//   CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE=<Neon dev branch URL> bunx vitest run test/initiatives.test.ts

const LEADER = "usr_andres";
const initiativeId = crypto.randomUUID();
const call = (method: string, path: string, body?: object) =>
  exports.default.fetch(`http://api.test${path}`, {
    method,
    headers: { "x-ft-user": LEADER, ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });

type Thesis = { id: string; statement: string; position: number };
const thesesOf = async (res: Response) => {
  expect(res.status).toBe(200);
  return ((await res.json()) as { theses: Thesis[] }).theses.map(({ id, statement, position }) => ({ id, statement, position }));
};

// Remote Neon round trips: several per test, on top of the Worker boot.
describe.skipIf(env.FT_DB_TESTS !== "1")("PATCH /v1/initiatives/:id theses", { timeout: 60_000 }, () => {
  afterAll(async () => {
    const client = new Client({ connectionString: env.HYPERDRIVE.connectionString });
    await client.connect();
    const db = drizzle({ client, schema });
    await db.delete(schema.thesis).where(eq(schema.thesis.initiativeId, initiativeId));
    await db.delete(schema.initiativeMember).where(eq(schema.initiativeMember.initiativeId, initiativeId));
    await db.delete(schema.initiative).where(eq(schema.initiative.id, initiativeId));
    await client.end();
  });

  it("given saved theses, when the leader edits one by id, drops one and adds one, then the list is exactly the patch", async () => {
    expect((await call("POST", "/v1/initiatives", { id: initiativeId, name: "Thesis autosave test" })).status).toBe(201);
    const [a, b] = await thesesOf(await call("PATCH", `/v1/initiatives/${initiativeId}`, { theses: [{ statement: "A" }, { statement: "B" }] }));

    const after = await thesesOf(
      await call("PATCH", `/v1/initiatives/${initiativeId}`, { theses: [{ statement: "C" }, { id: b!.id, statement: "B edited" }] }),
    );

    expect(after).toHaveLength(2);
    expect(after[0]).toMatchObject({ statement: "C", position: 0 });
    expect(after[0]!.id).not.toBe(a!.id);
    expect(after[1]).toStrictEqual({ id: b!.id, statement: "B edited", position: 1 });
  });

  it("given one saved thesis, when the leader saves it again by id, then it keeps its id", async () => {
    const [only] = await thesesOf(await call("PATCH", `/v1/initiatives/${initiativeId}`, { theses: [{ statement: "Solo" }] }));
    const again = await thesesOf(await call("PATCH", `/v1/initiatives/${initiativeId}`, { theses: [{ id: only!.id, statement: "Solo, reworded" }] }));
    expect(again).toStrictEqual([{ id: only!.id, statement: "Solo, reworded", position: 0 }]);
  });
});
