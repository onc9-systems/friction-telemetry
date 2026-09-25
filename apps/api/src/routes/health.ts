// Initiative health: flow 16. (Service liveness is GET /v1/health in system.ts.)
import { Hono } from "hono";
import { notImplemented } from "../lib/not-implemented";

const health = new Hono<{ Bindings: Env }>().get("/initiatives/:id/health", notImplemented(16));

export default health;
