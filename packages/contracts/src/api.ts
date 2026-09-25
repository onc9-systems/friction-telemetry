import * as z from "zod";
import { Flag } from "./concepts/flag";
import { Question } from "./concepts/question";

/**
 * Body of `POST /v1/events`: a Flag or a Question, exactly as the Mac serialized it.
 * The two shapes do not overlap (`transcript` and `appNames` versus `text`), so a plain union decides.
 */
export const EventBody = z.union([Flag, Question]);
export type EventBody = z.infer<typeof EventBody>;

/** Every not-yet-built route answers 501 with this body. */
export const NotImplemented = z.object({ flow: z.int().positive(), status: z.literal("not_implemented") });
export type NotImplemented = z.infer<typeof NotImplemented>;

export const HealthCheck = z.object({ ok: z.literal(true), version: z.string().min(1) });
export type HealthCheck = z.infer<typeof HealthCheck>;

export const ApiError = z.object({ error: z.string().min(1), message: z.string() });
export type ApiError = z.infer<typeof ApiError>;
