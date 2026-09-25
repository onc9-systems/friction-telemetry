import * as z from "zod";
import { THESIS_RELATION } from "../enums";
import { AuthId, CalendarDate, Id } from "../primitives";

export const ThesisRelation = z.enum(THESIS_RELATION);
export type ThesisRelation = z.infer<typeof ThesisRelation>;

export const ClassSplit = z.object({
  answered: z.int().nonnegative(),
  unanswerable: z.int().nonnegative(),
  stillStuck: z.int().nonnegative(),
});
export type ClassSplit = z.infer<typeof ClassSplit>;

export const Insight = z.object({
  id: Id,
  initiativeId: Id,
  title: z.string().min(1),
  clusterIds: z.array(Id),
  thesisLinks: z.array(z.object({ thesisId: Id, relation: ThesisRelation })),
  classSplit: ClassSplit,
  /** The Owner concept: the person accountable for acting on this insight. */
  ownerUserId: AuthId.nullable(),
  fixId: Id.nullable(),
  /** False below the anonymity threshold: evidence stays hidden. */
  evidenceVisible: z.boolean(),
});
export type Insight = z.infer<typeof Insight>;

/**
 * View model for the insight evidence panel (flows 14, 17). Empty when `evidenceVisible` is false.
 * Excerpts carry no names and no audio; dates are by day only.
 */
export const InsightEvidence = z.object({
  insightId: Id,
  /** Reports per week, oldest first, for the trend sparkline. */
  weeklyCounts: z.array(z.int().nonnegative()),
  excerpts: z.array(
    z.object({
      text: z.string().min(1),
      day: CalendarDate,
      appNames: z.array(z.string()),
      hasScreenshot: z.boolean(),
    }),
  ),
  suspectDocumentIds: z.array(Id),
});
export type InsightEvidence = z.infer<typeof InsightEvidence>;
