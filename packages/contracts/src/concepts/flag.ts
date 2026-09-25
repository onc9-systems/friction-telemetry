import * as z from "zod";
import { Id, Instant } from "../primitives";
import { ResolutionClass } from "./resolution-class";

export const Flag = z.object({
  /** Generated on the Mac; also the idempotency key, so a retried send upserts. */
  id: Id,
  /** Null until the service judges which initiative the flag is about. */
  initiativeId: Id.nullable(),
  transcript: z.string(),
  screenshotKey: z.string().nullable(),
  clipKey: z.string().nullable(),
  appNames: z.array(z.string()),
  /** Null until answered. */
  resolutionClass: ResolutionClass.nullable(),
  createdAt: Instant,
});
export type Flag = z.infer<typeof Flag>;
