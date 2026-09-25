// The signed-in person's own record and notices: flows 11 (my record) and 21 (fix notice).
import { Hono } from "hono";
import { notImplemented } from "../lib/not-implemented";

const me = new Hono<{ Bindings: Env }>()
  .get("/me/record", notImplemented(11))
  .get("/me/notices", notImplemented(21));

export default me;
