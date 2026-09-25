// The signed-in person: who they are (02), their own record and notices (flows 11 and 21), the people directory (02),
// and the live initiatives they can ask about or flag against (flows 6, 7: the Ask scope menu and the capture chip).
import { Hono } from "hono";
import type { InitiativeOption } from "@friction-telemetry/contracts";
import type { AppEnv } from "../auth/actor";
import { DIRECTORY, findPerson, meOf } from "../auth/directory";
import { openDb, withDb } from "../db/client";
import { liveInitiativesFor } from "../initiatives/membership";
import { actorOf } from "../lib/actor";
import { notImplemented } from "../lib/not-implemented";

const me = new Hono<AppEnv>()
  .get("/me", (c) => c.json(meOf(findPerson(c.var.actor.userId)!)))
  .get("/people", (c) => c.json(DIRECTORY.people))
  .get("/me/initiatives", async (c) => {
    const actor = actorOf(c);
    return withDb(openDb(c.env), async (db) => {
      const live = await liveInitiativesFor(db, actor);
      return c.json(live.map((i) => ({ initiativeId: i.id, name: i.name }) satisfies InitiativeOption));
    });
  })
  .get("/me/record", notImplemented(11))
  .get("/me/notices", notImplemented(21));

export default me;
