import * as z from "zod";
import { QA_ENTRY_STATUS } from "../enums";
import { AuthId, Id, Instant } from "../primitives";

export const QAEntryStatus = z.enum(QA_ENTRY_STATUS);
export type QAEntryStatus = z.infer<typeof QAEntryStatus>;

export const QAEntry = z.object({
  id: Id,
  initiativeId: Id,
  /** Canonical question, never an employee's own words. */
  question: z.string().min(1),
  /** Null while drafted. */
  answer: z.string().nullable(),
  status: QAEntryStatus,
  approvedByUserId: AuthId.nullable(),
  approvedAt: Instant.nullable(),
  askedCount: z.int().nonnegative(),
  /** Private to the signed-in person: they asked a question in this entry's cluster. */
  askedByMe: z.boolean(),
});
export type QAEntry = z.infer<typeof QAEntry>;
