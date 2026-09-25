// Initiatives: flows 3 (create, publish), 4 (edit), 5 (close).
import { Hono } from "hono";
import { notImplemented } from "../lib/not-implemented";

const initiatives = new Hono<{ Bindings: Env }>()
  .post("/initiatives", notImplemented(3))
  .get("/initiatives", notImplemented(4))
  .get("/initiatives/:id", notImplemented(4))
  .patch("/initiatives/:id", notImplemented(4))
  .post("/initiatives/:id/close", notImplemented(5))
  .post("/initiatives/:id/publish", notImplemented(3));

export default initiatives;
