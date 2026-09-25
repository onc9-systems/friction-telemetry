// The signed-in person: who they are (02), their own record and notices (flows 11 and 21), the people directory (02).
import { Hono } from "hono";
import type { AppEnv } from "../auth/actor";
import { DIRECTORY, findPerson, meOf } from "../auth/directory";
import { notImplemented } from "../lib/not-implemented";

const me = new Hono<AppEnv>()
  .get("/me", (c) => c.json(meOf(findPerson(c.var.actor.userId)!)))
  .get("/people", (c) => c.json(DIRECTORY.people))
  .get("/me/record", notImplemented(11))
  .get("/me/notices", notImplemented(21));

export default me;
