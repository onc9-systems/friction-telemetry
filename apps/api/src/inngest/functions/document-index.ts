// Flow 3a: extract, chunk, embed, and publish one document version. Runs for first uploads, replacements and
// retries. Steps return counts only; document text never enters step state (spec 05).
import { NonRetriableError } from "inngest";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { inngest } from "../client";
import { documentReady, documentUploaded } from "../events";
import { openDb, withDb } from "../../db/client";
import { document, documentVersion, passage } from "../../db/schema";
import { embedDocuments, toPgVector } from "../../ai/embed";
import { chunkMarkdown } from "../../documents/chunk";
import { extractMarkdown } from "../../documents/extract";
import { DocumentFailure, FAILURE_REASON, extensionOf, isDocumentExtension } from "../../documents/files";

type WithEnv = { env: Env };

/** Passages embedded per step: 4 calls of 32 (the model's maxItems). */
const PASSAGES_PER_EMBED_STEP = 128;

export const documentIndexFn = inngest.createFunction(
  {
    id: "document-index",
    triggers: [documentUploaded],
    idempotency: "event.data.documentVersionId",
    retries: 4,
    concurrency: [
      { key: "event.data.organizationId", limit: 3 },
      { scope: "account", key: '"workers-ai"', limit: 5 },
    ],
    onFailure: async (ctx) => {
      const { env } = ctx as unknown as WithEnv;
      const code = failureCodeFrom(ctx.error.message);
      const versionId = (ctx.event.data.event.data as { documentVersionId: string }).documentVersionId;
      await withDb(openDb(env), (db) =>
        db
          .update(documentVersion)
          .set({ status: "failed", failureCode: code, failureReason: FAILURE_REASON[code], statusChangedAt: new Date() })
          .where(eq(documentVersion.id, versionId)),
      );
    },
  },
  async (ctx) => {
    const { event, step } = ctx;
    const { env } = ctx as unknown as WithEnv;
    const { documentVersionId: versionId, documentId } = event.data;

    const chunked = await step.run("extract-and-chunk", () => withDb(openDb(env), async (db) => {
      const [v] = await db.select().from(documentVersion).where(eq(documentVersion.id, versionId));
      const [d] = await db.select().from(document).where(eq(document.id, documentId));
      if (!v || !d) throw new NonRetriableError(`Version ${versionId} of document ${documentId} not found`);
      const ext = extensionOf(v.fileName || v.r2Key);
      if (!isDocumentExtension(ext)) throw new DocumentFailure("unreadable");
      const object = await env.FILES.get(v.r2Key);
      if (!object) throw new NonRetriableError(`R2 object ${v.r2Key} is missing`);
      const bytes = new Uint8Array(await object.arrayBuffer());

      let markdown: string;
      try {
        markdown = await extractMarkdown(env.AI, { name: v.fileName || v.r2Key, ext, mimeType: v.mimeType, bytes });
      } catch (err) {
        if (err instanceof DocumentFailure) throw new NonRetriableError(err.code, { cause: err });
        throw err;
      }
      const chunks = chunkMarkdown(markdown);
      if (chunks.length === 0) throw new NonRetriableError("no_text", { cause: new DocumentFailure("no_text") });

      await db.transaction(async (tx) => {
        // A retried step starts from nothing, so the version never holds two copies of a passage.
        await tx.delete(passage).where(eq(passage.documentVersionId, versionId));
        for (let i = 0; i < chunks.length; i += 500) {
          await tx.insert(passage).values(
            chunks.slice(i, i + 500).map((c) => ({
              organizationId: d.organizationId,
              initiativeId: d.initiativeId,
              documentVersionId: versionId,
              headingPath: c.headingPath,
              locator: c.locator,
              text: c.text,
              position: c.position,
            })),
          );
        }
        await tx
          .update(documentVersion)
          .set({ status: "indexing", passageCount: chunks.length, statusChangedAt: new Date() })
          .where(eq(documentVersion.id, versionId));
      });
      return { passageCount: chunks.length };
    }));

    const steps = Math.ceil(chunked.passageCount / PASSAGES_PER_EMBED_STEP);
    for (let i = 0; i < steps; i++) {
      await step.run(`embed-${i}`, () => withDb(openDb(env), async (db) => {
        const rows = await db
          .select({ id: passage.id, text: passage.text, headingPath: passage.headingPath })
          .from(passage)
          .where(and(eq(passage.documentVersionId, versionId), isNull(passage.embedding)))
          .orderBy(asc(passage.position))
          .limit(PASSAGES_PER_EMBED_STEP);
        if (rows.length === 0) return { embedded: 0 };
        // The heading path is embedded with the text: "4.2 Approvals" is often the only place the topic is named.
        const vectors = await embedDocuments(
          env.AI,
          rows.map((r) => (r.headingPath ? `${r.headingPath}\n\n${r.text}` : r.text)),
        );
        await db.transaction(async (tx) => {
          for (const [j, r] of rows.entries()) {
            await tx
              .update(passage)
              .set({ embedding: sql`${toPgVector(vectors[j]!)}::vector` })
              .where(eq(passage.id, r.id));
          }
        });
        return { embedded: rows.length };
      }));
    }

    const ready = await step.run("finalize", () => withDb(openDb(env), (db) =>
      db.transaction(async (tx) => {
        const [left] = await tx
          .select({ n: sql<number>`count(*)::int` })
          .from(passage)
          .where(and(eq(passage.documentVersionId, versionId), isNull(passage.embedding)));
        if ((left?.n ?? 0) > 0) throw new Error(`${left!.n} passages still have no embedding`);
        const [v] = await tx
          .update(documentVersion)
          .set({ status: "ready", statusChangedAt: new Date(), failureCode: null, failureReason: null })
          .where(eq(documentVersion.id, versionId))
          .returning();
        // The swap: from this statement on, search sees this version and never the previous one.
        const [d] = await tx
          .update(document)
          .set({ activeVersionId: versionId })
          .where(eq(document.id, documentId))
          .returning();
        return { organizationId: d!.organizationId, passageCount: v!.passageCount ?? 0 };
      }),
    ));

    await step.sendEvent(
      "document-ready",
      documentReady.create({ organizationId: ready.organizationId, documentId, documentVersionId: versionId, passageCount: ready.passageCount }),
    );
    return ready;
  },
);

/** NonRetriableError carries the failure code as its message. Anything else ran out of retries. */
function failureCodeFrom(message: string): keyof typeof FAILURE_REASON {
  return message in FAILURE_REASON ? (message as keyof typeof FAILURE_REASON) : "transient_exhausted";
}
