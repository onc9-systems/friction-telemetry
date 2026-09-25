// The search visibility invariant (spec 06, retrieval), against real Postgres with pgvector:
// only the active version of a live initiative's non-removed documents, only published Q&A, only this organization.
//
//   FT_DB_URL=<Neon branch direct URL, never main> bunx vitest run --project node test/retrieve.node.test.ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, inArray } from "drizzle-orm";
import { Client } from "pg";
import * as schema from "../src/db/schema";
import { retrieve } from "../src/answer/retrieve";
import { toPgVector } from "../src/ai/embed";
import { sql } from "drizzle-orm";

const url = process.env.FT_DB_URL;
const ORG = `org_rt_${crypto.randomUUID().slice(0, 8)}`;
const OTHER_ORG = `${ORG}_other`;
const id = () => crypto.randomUUID();
const unit = Array.from({ length: 1024 }, (_, i) => (i === 0 ? 1 : 0));

const ids = {
  live: id(), closed: id(),
  doc: id(), v1: id(), v2: id(), removedDoc: id(), removedV: id(), closedDoc: id(), closedV: id(),
  pOld: id(), pActive: id(), pRemoved: id(), pClosed: id(), pOtherOrg: id(),
  qaPublished: id(), qaDraft: id(),
};

describe.skipIf(!url)("retrieve: the search visibility invariant", () => {
  const client = new Client({ connectionString: url });
  const db = drizzle({ client, schema });

  beforeAll(async () => {
    await client.connect();
    const words = "Approval threshold rule for purchase orders in Ariba.";
    await db.insert(schema.initiative).values([
      { id: ids.live, organizationId: ORG, name: "Live", status: "live" },
      { id: ids.closed, organizationId: ORG, name: "Closed", status: "closed" },
    ]);
    await db.insert(schema.document).values([
      { id: ids.doc, organizationId: ORG, initiativeId: ids.live, title: "Policy" },
      { id: ids.removedDoc, organizationId: ORG, initiativeId: ids.live, title: "Removed", removedAt: new Date() },
      { id: ids.closedDoc, organizationId: ORG, initiativeId: ids.closed, title: "Closed policy" },
    ]);
    const version = (vid: string, documentId: string) => ({ id: vid, organizationId: ORG, documentId, r2Key: vid, mimeType: "text/html", byteSize: 1, status: "ready" as const });
    await db.insert(schema.documentVersion).values([version(ids.v1, ids.doc), version(ids.v2, ids.doc), version(ids.removedV, ids.removedDoc), version(ids.closedV, ids.closedDoc)]);
    await db.update(schema.document).set({ activeVersionId: ids.v2 }).where(eq(schema.document.id, ids.doc));
    await db.update(schema.document).set({ activeVersionId: ids.removedV }).where(eq(schema.document.id, ids.removedDoc));
    await db.update(schema.document).set({ activeVersionId: ids.closedV }).where(eq(schema.document.id, ids.closedDoc));
    const passage = (pid: string, versionId: string, initiativeId: string, organizationId = ORG) => ({
      id: pid, organizationId, initiativeId, documentVersionId: versionId, headingPath: "2.2 Thresholds", text: words, position: 0,
      embedding: sql`${toPgVector(unit)}::vector`,
    });
    await db.insert(schema.passage).values([
      passage(ids.pOld, ids.v1, ids.live),
      passage(ids.pActive, ids.v2, ids.live),
      passage(ids.pRemoved, ids.removedV, ids.live),
      passage(ids.pClosed, ids.closedV, ids.closed),
      passage(ids.pOtherOrg, ids.v2, ids.live, OTHER_ORG),
    ]);
    await db.insert(schema.qaEntry).values([
      { id: ids.qaPublished, organizationId: ORG, initiativeId: ids.live, question: "Approval threshold for purchase orders?", answer: "Line manager up to 5,000 AED.", status: "published", embedding: sql`${toPgVector(unit)}::vector` },
      { id: ids.qaDraft, organizationId: ORG, initiativeId: ids.live, question: "Approval threshold for purchase orders?", answer: "Draft.", status: "draft", embedding: sql`${toPgVector(unit)}::vector` },
    ]);
  });

  afterAll(async () => {
    await db.delete(schema.initiative).where(inArray(schema.initiative.id, [ids.live, ids.closed]));
    await client.end();
  });

  for (const arm of ["full text only", "vector and full text"] as const) {
    it(`given ${arm}, then only the active passage and the published Q&A entry return`, async () => {
      const results = await retrieve(db as never, {
        organizationId: ORG,
        initiativeIds: [ids.live, ids.closed],
        text: "approval threshold purchase order",
        vector: arm === "full text only" ? null : unit,
      });
      expect([...results.get(ids.live)!.map((r) => r.key)].sort()).toStrictEqual([`document:${ids.pActive}`, `qa:${ids.qaPublished}`].sort());
      expect(results.get(ids.closed)).toStrictEqual([]);
    });
  }
});
