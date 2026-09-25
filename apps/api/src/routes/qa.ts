// Q&A: flows 10 (browse Q&A) and 18 (owner answers and approves).
import { Hono } from "hono";
import { notImplemented } from "../lib/not-implemented";

const qa = new Hono<{ Bindings: Env }>()
  .get("/initiatives/:id/qa", notImplemented(10))
  .post("/qa/:id/answer", notImplemented(18))
  .post("/qa/:id/approve", notImplemented(18));

export default qa;
