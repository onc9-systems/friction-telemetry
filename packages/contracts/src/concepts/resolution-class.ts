import * as z from "zod";
import { RESOLUTION_CLASS } from "../enums";

/** UI copy maps `unanswerable` to "Sent to owner". */
export const ResolutionClass = z.enum(RESOLUTION_CLASS);
export type ResolutionClass = z.infer<typeof ResolutionClass>;
