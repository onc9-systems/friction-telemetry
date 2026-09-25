import * as z from "zod";
import { Id } from "../primitives";

export const Cluster = z.object({
  id: Id,
  initiativeId: Id,
  /** Short description of the shared problem. */
  canonical: z.string().min(1),
  memberCount: z.int().nonnegative(),
});
export type Cluster = z.infer<typeof Cluster>;
