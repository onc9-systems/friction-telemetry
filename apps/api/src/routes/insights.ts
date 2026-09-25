// Insights: flows 14 (insights per initiative), 17 (assign owner), 20 (record fix).
import { Hono } from "hono";
import { notImplemented } from "../lib/not-implemented";

const insights = new Hono<{ Bindings: Env }>()
  .get("/initiatives/:id/insights", notImplemented(14))
  .post("/insights/:id/owner", notImplemented(17))
  .post("/insights/:id/fix", notImplemented(20));

export default insights;
