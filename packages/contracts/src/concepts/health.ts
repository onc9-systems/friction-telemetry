import * as z from "zod";
import { HEALTH_DIRECTION, HEALTH_LABEL } from "../enums";
import { Id, Instant } from "../primitives";

export const HealthLabel = z.enum(HEALTH_LABEL);
export type HealthLabel = z.infer<typeof HealthLabel>;

export const HealthComponent = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  /** Display value in words and numbers, never a bare score ("3 of 5"). */
  value: z.string().min(1),
  changeSinceLastWeek: z.string(),
  /** Whether this component pushed health up or down this week. */
  direction: z.enum(HEALTH_DIRECTION),
});
export type HealthComponent = z.infer<typeof HealthComponent>;

export const Health = z.object({
  initiativeId: Id,
  label: HealthLabel,
  /** One line on what changed since last week. */
  changeSummary: z.string(),
  components: z.array(HealthComponent),
  computedAt: Instant,
});
export type Health = z.infer<typeof Health>;
