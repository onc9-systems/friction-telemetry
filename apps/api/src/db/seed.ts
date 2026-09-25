// Loads the contracts' fixtures into the Neon dev branch so feature phases have data to run against.
// Idempotent: clears every row of the fixture organization, then inserts, in one transaction.
//
//   DATABASE_URL_UNPOOLED=<dev branch direct URL> bun run db:seed
//
// Never point it at the main (production) branch.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { eq, getTableName } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import type * as z from "zod";
import { FIXTURES, type FixtureName } from "@friction-telemetry/contracts";
import { linkEventToQA } from "../qa/links";
import * as schema from "./schema";

function load<N extends FixtureName>(name: N): z.infer<(typeof FIXTURES)[N]> {
  const path = fileURLToPath(import.meta.resolve(`@friction-telemetry/contracts/fixtures/${name}`));
  return FIXTURES[name].parse(JSON.parse(readFileSync(path, "utf8"))) as z.infer<(typeof FIXTURES)[N]>;
}

const date = (iso: string) => new Date(iso);
const dateOrNull = (iso: string | null) => (iso === null ? null : new Date(iso));

// Children before parents, so the clear never trips a foreign key.
const TABLES_IN_DELETE_ORDER = [
  schema.qaEntryEvent,
  schema.citation,
  schema.answer,
  schema.clusterMember,
  schema.insightCluster,
  schema.insightThesis,
  schema.fix,
  schema.insight,
  schema.cluster,
  schema.notice,
  schema.healthSnapshot,
  schema.qaEntry,
  schema.flag,
  schema.question,
  schema.passage,
  schema.document,
  schema.documentVersion,
  schema.initiativeMember,
  schema.thesis,
  schema.initiative,
] as const;

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED;
  if (!url) throw new Error("Set DATABASE_URL_UNPOOLED to the Neon dev branch direct URL.");

  const workspace = load("workspace.json");
  const org = workspace.organization.id;
  // Every sample flag and question is the signed-in employee's own (they are the my-record rows).
  const sender = workspace.signedInUserId;

  const initiatives = load("initiatives.json");
  const members = load("initiative-members.json");
  const theses = load("theses.json");
  const documents = load("documents.json");
  const versions = load("document-versions.json");
  const passages = load("passages.json");
  const flags = load("flags.json");
  const questions = load("questions.json");
  const answers = load("answers.json");
  const qaEntries = load("qa-entries.json");
  const clusters = load("clusters.json");
  const insights = load("insights.json");
  const fixes = load("fixes.json");
  const health = load("health.json");
  const notices = load("notices.json");

  for (const i of insights) {
    const fixId = fixes.find((f) => f.insightId === i.id)?.id ?? null;
    if (fixId !== i.fixId) throw new Error(`Insight ${i.id} names fix ${i.fixId}, but fixes.json gives ${fixId}`);
  }

  const client = new Client({ connectionString: url });
  await client.connect();
  const db = drizzle({ client, schema });

  try {
    await db.transaction(async (tx) => {
      for (const table of TABLES_IN_DELETE_ORDER) await tx.delete(table).where(eq(table.organizationId, org));

      await tx.insert(schema.initiative).values(
        initiatives.map((i) => ({
          id: i.id,
          organizationId: org,
          name: i.name,
          whatIsChanging: i.whatIsChanging,
          why: i.why,
          status: i.status,
          targetDate: i.targetDate,
          createdAt: date(i.createdAt),
          closedAt: dateOrNull(i.closedAt),
        })),
      );
      await tx.insert(schema.thesis).values(theses.map((t) => ({ ...t, organizationId: org })));
      await tx.insert(schema.initiativeMember).values(members.map((m) => ({ ...m, organizationId: org })));

      // Documents first without their active version (the two tables reference each other), then versions,
      // then point each document at its active version.
      await tx.insert(schema.document).values(
        documents.map((d) => ({
          id: d.id,
          organizationId: org,
          initiativeId: d.initiativeId,
          title: d.title,
          activeVersionId: null,
          suspect: d.suspect,
          createdAt: date(d.createdAt),
        })),
      );
      await tx.insert(schema.documentVersion).values(
        versions.map((v) => ({
          ...v,
          organizationId: org,
          createdAt: date(v.createdAt),
        })),
      );
      for (const d of documents) {
        if (d.activeVersionId) {
          await tx.update(schema.document).set({ activeVersionId: d.activeVersionId }).where(eq(schema.document.id, d.id));
        }
      }
      await tx.insert(schema.passage).values(passages.map((p) => ({ ...p, organizationId: org })));

      await tx.insert(schema.flag).values(
        flags.map((f) => ({ ...f, organizationId: org, userId: sender, createdAt: date(f.createdAt) })),
      );
      await tx.insert(schema.question).values(
        questions.map((q) => ({ ...q, organizationId: org, userId: sender, createdAt: date(q.createdAt) })),
      );

      await tx.insert(schema.qaEntry).values(
        qaEntries.map((e) => ({
          id: e.id,
          organizationId: org,
          initiativeId: e.initiativeId,
          question: e.question,
          answer: e.answer,
          status: e.status,
          approvedByUserId: e.approvedByUserId,
          approvedAt: dateOrNull(e.approvedAt),
        })),
      );

      await tx.insert(schema.answer).values(
        answers.map((a) => ({
          id: a.id,
          organizationId: org,
          flagId: a.flagId,
          questionId: a.questionId,
          text: a.text,
          provisionalShown: a.provisionalShown,
          createdAt: date(a.createdAt),
        })),
      );
      const citationRows = answers.flatMap((a) =>
        a.citations.map((c, i) => ({
          organizationId: org,
          answerId: a.id,
          ordinal: i + 1,
          passageId: c.passageId,
          qaEntryId: c.qaEntryId,
          quote: c.quote,
          documentTitle: c.documentTitle,
          locator: c.locator,
        })),
      );
      if (citationRows.length > 0) await tx.insert(schema.citation).values(citationRows);

      // An answer that cites a Q&A entry means its event asked that entry.
      for (const a of answers) {
        for (const c of a.citations) {
          if (c.qaEntryId === null) continue;
          await linkEventToQA(tx, {
            organizationId: org,
            qaEntryId: c.qaEntryId,
            eventId: a.flagId ?? a.questionId!,
            eventKind: a.flagId ? "flag" : "question",
            userId: sender,
            source: "cited",
          });
        }
      }

      await tx.insert(schema.cluster).values(
        clusters.map((c) => ({
          id: c.id,
          organizationId: org,
          initiativeId: c.initiativeId,
          canonical: c.canonical,
          memberCount: c.memberCount,
        })),
      );
      await tx.insert(schema.insight).values(
        insights.map((i) => ({
          id: i.id,
          organizationId: org,
          initiativeId: i.initiativeId,
          title: i.title,
          classAnswered: i.classSplit.answered,
          classUnanswerable: i.classSplit.unanswerable,
          classStillStuck: i.classSplit.stillStuck,
          ownerUserId: i.ownerUserId,
          evidenceVisible: i.evidenceVisible,
        })),
      );
      const insightClusters = insights.flatMap((i) =>
        i.clusterIds.map((clusterId) => ({ organizationId: org, insightId: i.id, clusterId })),
      );
      if (insightClusters.length > 0) await tx.insert(schema.insightCluster).values(insightClusters);
      const insightTheses = insights.flatMap((i) =>
        i.thesisLinks.map((l) => ({ organizationId: org, insightId: i.id, thesisId: l.thesisId, relation: l.relation })),
      );
      if (insightTheses.length > 0) await tx.insert(schema.insightThesis).values(insightTheses);
      await tx.insert(schema.fix).values(fixes.map((f) => ({ ...f, organizationId: org, recordedAt: date(f.recordedAt) })));

      await tx.insert(schema.notice).values(
        notices.map((n) => ({ ...n, organizationId: org, createdAt: date(n.createdAt), readAt: dateOrNull(n.readAt) })),
      );
      await tx.insert(schema.healthSnapshot).values(
        health.map((h) => ({
          organizationId: org,
          initiativeId: h.initiativeId,
          label: h.label,
          changeSummary: h.changeSummary,
          components: h.components,
          computedAt: date(h.computedAt),
        })),
      );
    });

    const counts: Record<string, number> = {};
    for (const table of [...TABLES_IN_DELETE_ORDER].reverse()) {
      counts[getTableName(table)] = await db.$count(table, eq(table.organizationId, org));
    }
    console.log(`Seeded organization ${org}:`);
    console.table(counts);
  } finally {
    await client.end();
  }
}

await main();
