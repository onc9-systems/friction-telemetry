// Role gates (02-auth-workspace). Applied centrally from LEADER_ROUTES so route files stay untouched.
import { createMiddleware } from "hono/factory";
import type { ApiError, Role } from "@friction-telemetry/contracts";
import type { AppEnv } from "./actor";

export const requireRole = (role: Role) =>
  createMiddleware<AppEnv>(async (c, next) => {
    if (!c.var.actor.roles.includes(role)) {
      return c.json({ error: "role_required", message: `This needs the ${role} role.`, role } satisfies ApiError & { role: Role }, 403);
    }
    await next();
  });

/** Every route that needs the leader role, from 02-auth-workspace, plus the people directory read. */
export const LEADER_ROUTES: ReadonlyArray<readonly [method: string, path: string]> = [
  ["POST", "/v1/initiatives"],
  ["PATCH", "/v1/initiatives/:id"],
  ["POST", "/v1/initiatives/:id/close"],
  ["POST", "/v1/initiatives/:id/publish"],
  ["POST", "/v1/initiatives/:id/documents"],
  ["PUT", "/v1/documents/:id"],
  ["DELETE", "/v1/documents/:id"],
  ["GET", "/v1/documents/:id/status"],
  ["GET", "/v1/initiatives/:id/insights"],
  ["POST", "/v1/insights/:id/owner"],
  ["GET", "/v1/initiatives/:id/health"],
  ["GET", "/v1/people"],
];
