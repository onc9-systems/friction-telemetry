import type { Context } from "hono";
import type { ApiError } from "@friction-telemetry/contracts";
import type { Actor as RequestActor, AppEnv } from "../auth/actor";

export type Actor = Pick<RequestActor, "organizationId" | "userId">;

/** The caller, as the identity middleware (`requireActor`) resolved it. Never read from a request body. */
export function actorOf(c: Context<AppEnv>): Actor {
  const { organizationId, userId } = c.var.actor;
  return { organizationId, userId };
}

/** A JSON error in the contracts' `ApiError` shape. */
export const apiError = (
  c: Context,
  status: 400 | 403 | 404 | 409 | 413 | 415 | 503,
  error: string,
  message: string,
) => c.json({ error, message } satisfies ApiError, status);
