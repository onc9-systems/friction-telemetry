// Flow 9, after the response: the documents behind an answer that did not solve the problem are marked for
// review. Only the cited documents, never the whole initiative. Cited Q&A entries get a mark and keep their
// status; phase 08 decides what an owner does with them.
import { eq, inArray } from "drizzle-orm";
import { inngest } from "../client";
import { eventStillStuck } from "../events";
import { openDb, withDb } from "../../db/client";
import { citation, document, suspectMark } from "../../db/schema";
import { NoopAnalysis, type AnalysisSeam } from "../../analysis/seam";

type WithEnv = { env: Env };
const analysis: AnalysisSeam = new NoopAnalysis();

export const eventStillStuckFn = inngest.createFunction(
  { id: "event-still-stuck", triggers: [eventStillStuck], idempotency: "event.data.eventId" },
  async (ctx) => {
    const { event, step } = ctx;
    const { env } = ctx as unknown as WithEnv;
    const data = event.data;

    const marked = await step.run("mark-suspect", () =>
      withDb(openDb(env), (db) =>
        db.transaction(async (tx) => {
          const cited = await tx
            .select({ documentId: citation.documentId, passageId: citation.passageId, qaEntryId: citation.qaEntryId })
            .from(citation)
            .where(eq(citation.answerId, data.answerId));
          const documentIds = [...new Set(cited.flatMap((c) => (c.documentId ? [c.documentId] : [])))];
          if (documentIds.length) await tx.update(document).set({ suspect: true }).where(inArray(document.id, documentIds));
          if (cited.length) {
            await tx.insert(suspectMark).values(
              cited.map((c) => ({
                organizationId: data.organizationId,
                documentId: c.documentId,
                passageId: c.passageId,
                qaEntryId: c.qaEntryId,
                eventKind: data.kind,
                eventId: data.eventId,
              })),
            );
          }
          return { documents: documentIds.length, marks: cited.length };
        }),
      ),
    );

    await step.run("analysis", async () => {
      await analysis.onEventAnswered({
        organizationId: data.organizationId,
        eventId: data.eventId,
        kind: data.kind,
        initiativeId: data.initiativeId,
        answerId: data.answerId,
        resolutionClass: "still_stuck",
        citedPassageIds: data.citedPassageIds,
        citedQaEntryIds: data.citedQaEntryIds,
        othersCount: null,
        provisionalShown: false,
        degraded: [],
        threadRoot: null,
      });
      return { ok: true };
    });
    return marked;
  },
);
