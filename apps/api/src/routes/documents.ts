// Documents: flows 3 and 3a (attach and index), 4 (replace, remove), 19 (owner corrects a document).
// The 501 body carries an integer flow, so indexing (3a) reports as 3.
import { Hono } from "hono";
import { notImplemented } from "../lib/not-implemented";

const documents = new Hono<{ Bindings: Env }>()
  .post("/initiatives/:id/documents", notImplemented(3))
  .put("/documents/:id", notImplemented(4))
  .delete("/documents/:id", notImplemented(4))
  .get("/documents/:id/status", notImplemented(3));

export default documents;
