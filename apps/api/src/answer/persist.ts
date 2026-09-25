// Writes an answer, its citations, the event's class and routing, the evidence trace, and the Q&A links, in one
// transaction, before `done` is sent: the card, Home, the thread and Still stuck are consistent the moment the
// stream ends, and a client that disconnected still finds its answer.
import { eq, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import { answer, citation, flag, pipelineTrace, question } from "../db/schema";
import { toPgVector } from "../ai/embed";
import { linkEventToQA } from "../qa/links";
import type { MappedCitation } from "./compose";
import type { EventRow } from "./events";
import { locatorText } from "./retrieve";

export type Outcome = {
  initiativeId: string;
  initiativeConfidence: number;
  text: string;
  citations: MappedCitation[];
  resolutionClass: "answered" | "unanswerable";
  band: string;
  provisionalShown: boolean;
  othersCount: number | null;
  embedding: number[] | null;
  standaloneText: string | null;
  jevModel: string | null;
  trace: Record<string, unknown>;
  degraded: string[];
};

export async function persistAnswer(db: Db, event: EventRow, o: Outcome): Promise<{ answerId: string; routed: boolean }> {
  const answerId = crypto.randomUUID();
  const routed = o.resolutionClass === "unanswerable";
  await db.transaction(async (tx) => {
    await tx.insert(answer).values({
      id: answerId,
      organizationId: event.organizationId,
      flagId: event.kind === "flag" ? event.id : null,
      questionId: event.kind === "question" ? event.id : null,
      text: o.text,
      provisionalShown: o.provisionalShown,
      band: o.band,
      othersCount: o.othersCount,
      initiativeId: o.initiativeId,
    });
    if (o.citations.length) {
      await tx.insert(citation).values(
        o.citations.map((c) => ({
          organizationId: event.organizationId,
          answerId,
          ordinal: c.index,
          passageId: c.source.kind === "document" ? c.source.id : null,
          qaEntryId: c.source.kind === "qa" ? c.source.id : null,
          quote: c.quote,
          documentTitle: c.source.kind === "qa" ? (c.source.qaQuestion ?? "Owner answer") : c.source.title,
          locator: locatorText(c.source),
          charOffset: c.charOffset,
          sourceKind: c.source.kind,
          headingPath: c.source.headingPath,
          passageText: c.source.text,
          documentId: c.source.documentId,
          qaApprovedByUserId: c.source.qaApprovedByUserId,
          qaApprovedAt: c.source.qaApprovedAt,
        })),
      );
    }
    const common = {
      resolutionClass: o.resolutionClass,
      initiativeConfidence: o.initiativeConfidence,
      routedAt: routed ? new Date() : null,
      ...(o.embedding ? { embedding: sql`${toPgVector(o.embedding)}::vector` } : {}),
    };
    if (event.kind === "flag") {
      await tx.update(flag).set({ ...common, initiativeId: o.initiativeId }).where(eq(flag.id, event.id));
    } else {
      await tx.update(question).set({ ...common, standaloneText: o.standaloneText }).where(eq(question.id, event.id));
    }
    for (const c of o.citations) {
      if (c.source.kind !== "qa") continue;
      await linkEventToQA(tx, {
        organizationId: event.organizationId,
        qaEntryId: c.source.id,
        eventId: event.id,
        eventKind: event.kind,
        userId: event.userId,
        source: "cited",
      });
    }
    await tx.insert(pipelineTrace).values({
      organizationId: event.organizationId,
      eventKind: event.kind,
      eventId: event.id,
      answerId,
      jevModel: o.jevModel,
      trace: o.trace,
      degraded: o.degraded,
    });
  });
  return { answerId, routed };
}
