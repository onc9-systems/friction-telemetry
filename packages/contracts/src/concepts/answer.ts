import * as z from "zod";
import { Id, Instant } from "../primitives";

/** A citation points at exactly one source: a document passage or a Q&A entry. */
const CitationSource = z.xor([
  z.object({ passageId: Id, qaEntryId: z.null() }),
  z.object({ passageId: z.null(), qaEntryId: Id }),
]);

export const Citation = z
  .object({
    quote: z.string().min(1),
    documentTitle: z.string().min(1),
    /** Human-readable place in the source, for example "Section 4.2 Approvals". */
    locator: z.string().nullable(),
  })
  .and(CitationSource);
export type Citation = z.infer<typeof Citation>;

/** An answer replies to exactly one flag or one question. */
const AnswerTarget = z.xor([
  z.object({ flagId: Id, questionId: z.null() }),
  z.object({ flagId: z.null(), questionId: Id }),
]);

export const Answer = z
  .object({
    id: Id,
    text: z.string(),
    citations: z.array(Citation),
    provisionalShown: z.boolean(),
    createdAt: Instant,
  })
  .and(AnswerTarget);
export type Answer = z.infer<typeof Answer>;
