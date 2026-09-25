import * as z from "zod";
import { RECORD_KIND, RECORD_OUTCOME, TIMELINE_STEP } from "../enums";
import { Id, Instant } from "../primitives";
import { ResolutionClass } from "./resolution-class";

export const RecordOutcome = z.enum(RECORD_OUTCOME);
export type RecordOutcome = z.infer<typeof RecordOutcome>;

export const TimelineEntry = z.object({
  step: z.enum(TIMELINE_STEP),
  at: Instant,
});
export type TimelineEntry = z.infer<typeof TimelineEntry>;

/** Home row view model (flow 11): one flag or question the signed-in person sent, and what became of it. */
export const MyRecordItem = z.object({
  kind: z.enum(RECORD_KIND),
  /** The Flag or Question id. */
  id: Id,
  /** The person's own words, in full. */
  text: z.string().min(1),
  initiativeId: Id.nullable(),
  initiativeName: z.string().nullable(),
  resolutionClass: ResolutionClass.nullable(),
  othersCount: z.int().nonnegative(),
  outcome: RecordOutcome,
  /** Owner routed to, for Sent to owner and Still stuck ("Procurement owner"). */
  routedTo: z.string().nullable(),
  answerId: Id.nullable(),
  createdAt: Instant,
  timeline: z.array(TimelineEntry),
});
export type MyRecordItem = z.infer<typeof MyRecordItem>;
