import * as z from "zod";
import { RECORD_KIND } from "../enums";
import { Id, Instant } from "../primitives";
import { ResolutionClass } from "./resolution-class";

/** Points at one flag or one question. */
export const RecordRef = z.object({ kind: z.enum(RECORD_KIND), id: Id });
export type RecordRef = z.infer<typeof RecordRef>;

export const Question = z.object({
  /** Generated on the Mac; also the idempotency key. */
  id: Id,
  initiativeId: Id,
  text: z.string().min(1),
  resolutionClass: ResolutionClass.nullable(),
  createdAt: Instant,
  /**
   * A follow-up: the flag or question whose answer this replies to. The reply joins that thread, stays in
   * its initiative, and is answered with the earlier turns as context. Null (or absent) starts a new thread.
   */
  inReplyTo: RecordRef.nullable().default(null),
});
export type Question = z.infer<typeof Question>;
