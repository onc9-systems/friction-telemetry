import type { Context } from "hono";
import type { ApiError } from "@friction-telemetry/contracts";
import { SHELL_ACTOR } from "./shell-actor";

export type Actor = { organizationId: string; userId: string };

/**
 * The caller. Never read from a request body. Until phase 02 this is the shell's sample employee; in local
 * development (`ENVIRONMENT=development`) the `x-ft-dev-user` and `x-ft-dev-org` headers act as anyone,
 * so a frontend can exercise owners, leaders, and "N others". Phase 02 replaces the body of this function
 * with the verified session and keeps its signature.
 */
export function actorOf(c: Context<{ Bindings: Env }>): Actor {
  if (c.env.ENVIRONMENT === "development") {
    const userId = c.req.header("x-ft-dev-user");
    if (userId) return { organizationId: c.req.header("x-ft-dev-org") ?? SHELL_ACTOR.organizationId, userId };
  }
  return SHELL_ACTOR;
}

/** A JSON error in the contracts' `ApiError` shape. */
export const apiError = (
  c: Context,
  status: 400 | 403 | 404 | 409 | 413 | 415 | 503,
  error: string,
  message: string,
) => c.json({ error, message } satisfies ApiError, status);
