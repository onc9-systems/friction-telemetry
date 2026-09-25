import * as z from "zod";
import { Id, Instant } from "../primitives";
import { ResolutionClass } from "./resolution-class";

export const Question = z.object({
  /** Generated on the Mac; also the idempotency key. */
  id: Id,
  initiativeId: Id,
  text: z.string().min(1),
  resolutionClass: ResolutionClass.nullable(),
  createdAt: Instant,
});
export type Question = z.infer<typeof Question>;
