// Flags and questions read as one shape: an event. Plus threads (follow-up questions and the turn they reply to).
import { and, asc, desc, eq, inArray, isNull, or } from "drizzle-orm";
import type { RecordRef } from "@friction-telemetry/contracts";
import type { Db, Tx } from "../db/client";
import { answer, citation, document, flag, question } from "../db/schema";

export type EventRow = {
  kind: "flag" | "question";
  id: string;
  organizationId: string;
  userId: string;
  initiativeId: string | null;
  /** Flag transcript or question text: the employee's own words. */
  text: string;
  appNames: string[];
  screenshotKey: string | null;
  resolutionClass: "answered" | "unanswerable" | "still_stuck" | null;
  routedAt: Date | null;
  stillStuckReason: string | null;
  inReplyTo: RecordRef | null;
  threadRoot: RecordRef | null;
  standaloneText: string | null;
  createdAt: Date;
};

const fromFlag = (f: typeof flag.$inferSelect): EventRow => ({
  kind: "flag",
  id: f.id,
  organizationId: f.organizationId,
  userId: f.userId,
  initiativeId: f.initiativeId,
  text: f.transcript,
  appNames: f.appNames,
  screenshotKey: f.screenshotKey,
  resolutionClass: f.resolutionClass,
  routedAt: f.routedAt,
  stillStuckReason: f.stillStuckReason,
  inReplyTo: null,
  threadRoot: null,
  standaloneText: null,
  createdAt: f.createdAt,
});

const fromQuestion = (q: typeof question.$inferSelect): EventRow => ({
  kind: "question",
  id: q.id,
  organizationId: q.organizationId,
  userId: q.userId,
  initiativeId: q.initiativeId,
  text: q.text,
  appNames: [],
  screenshotKey: null,
  resolutionClass: q.resolutionClass,
  routedAt: q.routedAt,
  stillStuckReason: q.stillStuckReason,
  inReplyTo: q.inReplyToKind && q.inReplyToId ? { kind: q.inReplyToKind, id: q.inReplyToId } : null,
  threadRoot: q.threadRootKind && q.threadRootId ? { kind: q.threadRootKind, id: q.threadRootId } : null,
  standaloneText: q.standaloneText,
  createdAt: q.createdAt,
});

/** A flag or question by id in the organization, of either kind when `kind` is not given. */
export async function loadEvent(db: Db | Tx, organizationId: string, id: string, kind?: "flag" | "question"): Promise<EventRow | null> {
  if (kind !== "question") {
    const [f] = await db.select().from(flag).where(and(eq(flag.id, id), eq(flag.organizationId, organizationId)));
    if (f) return fromFlag(f);
  }
  if (kind !== "flag") {
    const [q] = await db.select().from(question).where(and(eq(question.id, id), eq(question.organizationId, organizationId)));
    if (q) return fromQuestion(q);
  }
  return null;
}

/** The root and every follow-up of a thread, oldest first. */
export async function loadThreadEvents(db: Db | Tx, organizationId: string, root: RecordRef): Promise<EventRow[]> {
  const first = await loadEvent(db, organizationId, root.id, root.kind);
  if (!first) return [];
  const replies = await db
    .select()
    .from(question)
    .where(and(eq(question.organizationId, organizationId), eq(question.threadRootId, root.id)))
    .orderBy(asc(question.createdAt), asc(question.id));
  return [first, ...replies.map(fromQuestion)];
}

export const threadRootOf = (e: EventRow): RecordRef => e.threadRoot ?? { kind: e.kind, id: e.id };

type AnswerRow = typeof answer.$inferSelect;
type CitationRow = typeof citation.$inferSelect & { liveSuspect: boolean | null };

/** Each event's current answer (the newest not superseded) and its citations, keyed by event id. */
export async function currentAnswers(db: Db | Tx, events: Array<Pick<EventRow, "kind" | "id">>) {
  const out = new Map<string, { answer: AnswerRow; citations: CitationRow[] }>();
  if (events.length === 0) return out;
  const flagIds = events.filter((e) => e.kind === "flag").map((e) => e.id);
  const questionIds = events.filter((e) => e.kind === "question").map((e) => e.id);
  const answers = await db
    .select()
    .from(answer)
    .where(
      and(
        isNull(answer.supersededAt),
        or(
          flagIds.length ? inArray(answer.flagId, flagIds) : undefined,
          questionIds.length ? inArray(answer.questionId, questionIds) : undefined,
        ),
      ),
    )
    .orderBy(desc(answer.createdAt));
  if (answers.length === 0) return out;
  const cites = await db
    .select({ c: citation, liveSuspect: document.suspect })
    .from(citation)
    .leftJoin(document, eq(document.id, citation.documentId))
    .where(inArray(citation.answerId, answers.map((a) => a.id)))
    .orderBy(asc(citation.ordinal));
  for (const a of answers) {
    const eventId = a.flagId ?? a.questionId!;
    if (out.has(eventId)) continue;
    out.set(eventId, {
      answer: a,
      citations: cites.filter((r) => r.c.answerId === a.id).map((r) => ({ ...r.c, liveSuspect: r.liveSuspect })),
    });
  }
  return out;
}
