// Who is calling. Every /v1 handler reads `c.var.actor` and scopes its queries by `actor.organizationId`.
// Until phase 02, the actor is named by the `x-ft-user` header and must be in the fixed directory. Phase 02
// replaces the inside of `requireActor` with JWT verification; handlers keep reading the same `c.var.actor`.
import { createMiddleware } from "hono/factory";
import type { ApiError, Role } from "@friction-telemetry/contracts";
import { DIRECTORY, findPerson, rolesOf } from "./directory";

export type Actor = { userId: string; organizationId: string; roles: Role[] };

/** Hono env for any route that reads the actor. */
export type AppEnv = { Bindings: Env; Variables: { actor: Actor } };

export const ACTOR_HEADER = "x-ft-user";

/** Paths under /v1 that answer without an actor. */
const PUBLIC_PATHS = new Set(["/v1/health"]);

export const requireActor = createMiddleware<AppEnv>(async (c, next) => {
  if (PUBLIC_PATHS.has(c.req.path)) return next();
  const userId = c.req.header(ACTOR_HEADER);
  if (!userId) {
    return c.json({ error: "actor_required", message: `Send the ${ACTOR_HEADER} header naming who is acting.` } satisfies ApiError, 401);
  }
  const person = findPerson(userId);
  if (!person) {
    return c.json({ error: "unknown_person", message: `${userId} is not in the ${DIRECTORY.organization.name} directory.` } satisfies ApiError, 401);
  }
  c.set("actor", { userId: person.id, organizationId: DIRECTORY.organization.id, roles: rolesOf(person) });
  await next();
});
