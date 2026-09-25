// Service liveness. Not a numbered flow: the Mac and uptime checks call it.
import { Hono } from "hono";
import type { HealthCheck } from "@friction-telemetry/contracts";
import pkg from "../../package.json";

const system = new Hono<{ Bindings: Env }>().get("/health", (c) =>
  c.json({ ok: true, version: pkg.version } satisfies HealthCheck),
);

export default system;
