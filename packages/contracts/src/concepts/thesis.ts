import * as z from "zod";
import { THESIS_VERDICT } from "../enums";
import { Id } from "../primitives";

export const ThesisVerdict = z.enum(THESIS_VERDICT);
export type ThesisVerdict = z.infer<typeof ThesisVerdict>;

export const Thesis = z.object({
  id: Id,
  initiativeId: Id,
  statement: z.string().min(1),
  verdict: ThesisVerdict,
  position: z.int().nonnegative(),
});
export type Thesis = z.infer<typeof Thesis>;
