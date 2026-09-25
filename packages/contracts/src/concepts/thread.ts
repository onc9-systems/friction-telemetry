import * as z from "zod";
import { RECORD_KIND } from "../enums";
import { Id, Instant } from "../primitives";
import { CitationPayload } from "../sse";
import { RecordRef } from "./question";
import { ResolutionClass } from "./resolution-class";

// A thread (flows 7, 8, 9): a flag or question and every follow-up question that replied to it, in order.
// `GET /v1/events/:id/thread` returns it for any turn's id. It is the employee's own record: only its
// sender can read it.

/** The answer a turn received, exactly as its card showed it when the stream finished. */
export const ThreadAnswer = z.object({
  id: Id,
  text: z.string(),
  citations: z.array(CitationPayload),
  provisionalShown: z.boolean(),
  /** Distinct other employees who hit the same thing. Null when it could not be counted. */
  othersCount: z.int().nonnegative().nullable(),
  createdAt: Instant,
});
export type ThreadAnswer = z.infer<typeof ThreadAnswer>;

export const ThreadTurn = z.object({
  kind: z.enum(RECORD_KIND),
  id: Id,
  /** The employee's own words, in full (flag transcript or question text). */
  text: z.string(),
  inReplyTo: RecordRef.nullable(),
  resolutionClass: ResolutionClass.nullable(),
  /** The turn went to the initiative's owners. */
  routed: z.boolean(),
  /** What the employee typed when they said the answer did not solve it. */
  stillStuckReason: z.string().nullable(),
  /** Null while the answer is still being written, or when the turn has no initiative. */
  answer: ThreadAnswer.nullable(),
  createdAt: Instant,
});
export type ThreadTurn = z.infer<typeof ThreadTurn>;

export const Thread = z.object({
  root: RecordRef,
  initiativeId: Id.nullable(),
  initiativeName: z.string().nullable(),
  /** Oldest first. The first turn is the root. */
  turns: z.array(ThreadTurn),
});
export type Thread = z.infer<typeof Thread>;
