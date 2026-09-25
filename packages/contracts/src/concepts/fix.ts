import * as z from "zod";
import { AuthId, Id, Instant } from "../primitives";

export const Fix = z.object({
  id: Id,
  insightId: Id,
  recordedByUserId: AuthId,
  summary: z.string().min(1),
  recordedAt: Instant,
});
export type Fix = z.infer<typeof Fix>;
