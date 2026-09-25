// The signed-in person's own record and notices: flows 11 (my record) and 21 (fix notice), and the live
// initiatives they can ask about or flag against (flows 6, 7: the Ask scope menu and the capture chip).
import { Hono } from "hono";
import type { InitiativeOption } from "@friction-telemetry/contracts";
import { openDb, withDb } from "../db/client";
import { liveInitiativesFor } from "../initiatives/membership";
import { actorOf } from "../lib/actor";
import { notImplemented } from "../lib/not-implemented";

const me = new Hono<{ Bindings: Env }>()
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
