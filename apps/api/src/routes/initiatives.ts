// Initiatives: flows 3 (create, publish), 4 (edit), 5 (close), and the owner's "Sent to owner" list (8, 9).
import { Hono } from "hono";
import type { AppEnv } from "../auth/actor";
import { zValidator } from "@hono/zod-validator";
import { and, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import * as z from "zod";
import {
  CreateInitiativeBody,
  PatchInitiativeBody,
  type InitiativeDetail,
  type InitiativeListItem,
  type RoutedItem,
} from "@friction-telemetry/contracts";
import { openDb, openFreshDb, withDb, type Db, type Tx } from "../db/client";
import { citation, flag, initiative, initiativeMember, question, answer, suspectMark, thesis } from "../db/schema";
import { documentStatuses } from "../documents/status";
import { canManage, canSeeRouted, initiativeWithRoles, membersOf, type InitiativeRow } from "../initiatives/membership";
import { actorOf, apiError, type Actor } from "../lib/actor";

const invalid = (r: { success: boolean; error?: z.core.$ZodError }, c: Parameters<typeof apiError>[0]) =>
  r.success ? undefined : apiError(c, 400, "invalid_body", z.prettifyError(r.error!));

const iso = (d: Date | null) => (d ? d.toISOString() : null);
const initiativeView = (i: InitiativeRow) => ({
  id: i.id,
  organizationId: i.organizationId,
  name: i.name,
  whatIsChanging: i.whatIsChanging,
  why: i.why,
  status: i.status,
  targetDate: i.targetDate,
  createdAt: i.createdAt.toISOString(),
  closedAt: iso(i.closedAt),
});

/** Publish needs a name and one ready document (flow 3a). The reason is UI copy. */
function publishBlock(i: InitiativeRow, readyDocuments: number): string | null {
  if (i.status !== "draft") return i.status === "live" ? "Already live" : "Closed";
  if (!i.name.trim()) return "Needs a name";
  if (readyDocuments === 0) return "Needs one ready document";
  return null;
}

async function detail(db: Db | Tx, actor: Actor, i: InitiativeRow): Promise<InitiativeDetail> {
  const [theses, members, docs] = await Promise.all([
    db.select().from(thesis).where(eq(thesis.initiativeId, i.id)).orderBy(thesis.position),
    membersOf(db, [i.id]),
    documentStatuses(db, actor.organizationId, { initiativeId: i.id }),
  ]);
  const block = publishBlock(i, docs.filter((d) => d.activeVersion).length);
  return {
    ...initiativeView(i),
    theses: theses.map((t) => ({ id: t.id, initiativeId: t.initiativeId, statement: t.statement, verdict: t.verdict, position: t.position })),
    members: members.map((m) => ({ initiativeId: m.initiativeId, userId: m.userId, role: m.role })),
    documents: docs,
    canPublish: block === null,
    publishBlockedReason: i.status === "draft" ? block : null,
  };
}

const initiatives = new Hono<AppEnv>()
  // Flow 3: create a draft. The creator becomes its leader. Idempotent on the client id.
  .post("/initiatives", zValidator("json", CreateInitiativeBody, invalid), async (c) => {
    const actor = actorOf(c);
    const body = c.req.valid("json");
    return withDb(openDb(c.env), async (db) => {
      const row = await db.transaction(async (tx) => {
        await tx
          .insert(initiative)
          .values({ id: body.id, organizationId: actor.organizationId, name: body.name, whatIsChanging: body.whatIsChanging, why: body.why, targetDate: body.targetDate })
          .onConflictDoNothing();
        await tx
          .insert(initiativeMember)
          .values({ organizationId: actor.organizationId, initiativeId: body.id, userId: actor.userId, role: "leader" })
          .onConflictDoNothing();
        const [i] = await tx.select().from(initiative).where(and(eq(initiative.id, body.id), eq(initiative.organizationId, actor.organizationId)));
        return i ? detail(tx, actor, i) : null;
      });
      return row ? c.json(row, 201) : apiError(c, 409, "id_conflict", "That id belongs to another organization's initiative");
    });
  })
  // Flow 4: the initiatives the caller leads, owns, or is affected by.
  .get("/initiatives", async (c) => {
    const actor = actorOf(c);
    return withDb(openDb(c.env), async (db) => {
      const mine = await db
        .selectDistinct({ i: initiative })
        .from(initiative)
        .innerJoin(initiativeMember, eq(initiativeMember.initiativeId, initiative.id))
        .where(and(eq(initiative.organizationId, actor.organizationId), eq(initiativeMember.userId, actor.userId)));
      const ids = mine.map((r) => r.i.id);
      const [members, docs] = await Promise.all([
        membersOf(db, ids),
        Promise.all(ids.map((id) => documentStatuses(db, actor.organizationId, { initiativeId: id }))),
      ]);
      const items: InitiativeListItem[] = mine.map(({ i }, k) => {
        const d = docs[k]!;
        return {
          ...initiativeView(i),
          ownerUserIds: members.filter((m) => m.initiativeId === i.id && m.role === "owner").map((m) => m.userId),
          affectedCount: members.filter((m) => m.initiativeId === i.id && m.role === "affected").length,
          documentsTotal: d.length,
          documentsReady: d.filter((x) => x.activeVersion).length,
          documentsProcessing: d.filter((x) => x.pendingVersion && ["extracting", "indexing", "uploading"].includes(x.pendingVersion.status)).length,
        };
      });
      return c.json(items);
    });
  })
  .get("/initiatives/:id", async (c) => {
    const actor = actorOf(c);
    return withDb(openFreshDb(c.env), async (db) => {
      const access = await initiativeWithRoles(db, actor, c.req.param("id"));
      if (!access || access.roles.length === 0) return apiError(c, 404, "not_found", "No such initiative");
      return c.json(await detail(db, actor, access.initiative));
    });
  })
  // Flow 4: autosaved edits. Theses and members, when present, replace the whole list.
  .patch("/initiatives/:id", zValidator("json", PatchInitiativeBody, invalid), async (c) => {
    const actor = actorOf(c);
    const body = c.req.valid("json");
    return withDb(openDb(c.env), async (db) => {
      const access = await initiativeWithRoles(db, actor, c.req.param("id"));
      if (!access) return apiError(c, 404, "not_found", "No such initiative");
      if (!canManage(access.roles)) return apiError(c, 403, "not_leader", "You no longer have permission to edit initiatives.");
      if (access.initiative.status === "closed") return apiError(c, 409, "closed_initiative", "This initiative is closed.");
      const id = access.initiative.id;
      const org = actor.organizationId;
      const updated = await db.transaction(async (tx) => {
        const { theses, members, ...fields } = body;
        if (Object.keys(fields).length > 0) await tx.update(initiative).set(fields).where(eq(initiative.id, id));
        if (theses) {
          const keep = theses.flatMap((t) => (t.id ? [t.id] : []));
          await tx.delete(thesis).where(and(eq(thesis.initiativeId, id), keep.length ? sql`${thesis.id} <> all(${keep})` : sql`true`));
          for (const [position, t] of theses.entries()) {
            await tx
              .insert(thesis)
              .values({ id: t.id ?? crypto.randomUUID(), organizationId: org, initiativeId: id, statement: t.statement, position })
              .onConflictDoUpdate({ target: thesis.id, set: { statement: t.statement, position } });
          }
        }
        if (members) {
          await tx.delete(initiativeMember).where(eq(initiativeMember.initiativeId, id));
          const rows = [...members, { userId: actor.userId, role: "leader" as const }];
          await tx
            .insert(initiativeMember)
            .values(rows.map((m) => ({ organizationId: org, initiativeId: id, userId: m.userId, role: m.role })))
            .onConflictDoNothing();
        }
        const [i] = await tx.select().from(initiative).where(eq(initiative.id, id));
        return detail(tx, actor, i!);
      });
      return c.json(updated);
    });
  })
  .post("/initiatives/:id/publish", async (c) => {
    const actor = actorOf(c);
    return withDb(openDb(c.env), async (db) => {
      const access = await initiativeWithRoles(db, actor, c.req.param("id"));
      if (!access) return apiError(c, 404, "not_found", "No such initiative");
      if (!canManage(access.roles)) return apiError(c, 403, "not_leader", "You no longer have permission to edit initiatives.");
      const current = await detail(db, actor, access.initiative);
      if (!current.canPublish) return apiError(c, 409, "cannot_publish", current.publishBlockedReason ?? "Cannot publish");
      await db.update(initiative).set({ status: "live" }).where(and(eq(initiative.id, access.initiative.id), eq(initiative.status, "draft")));
      const [i] = await db.select().from(initiative).where(eq(initiative.id, access.initiative.id));
      return c.json(await detail(db, actor, i!));
    });
  })
  .post("/initiatives/:id/close", async (c) => {
    const actor = actorOf(c);
    return withDb(openDb(c.env), async (db) => {
      const access = await initiativeWithRoles(db, actor, c.req.param("id"));
      if (!access) return apiError(c, 404, "not_found", "No such initiative");
      if (!canManage(access.roles)) return apiError(c, 403, "not_leader", "You no longer have permission to edit initiatives.");
      await db
        .update(initiative)
        .set({ status: "closed", closedAt: new Date() })
        .where(and(eq(initiative.id, access.initiative.id), sql`${initiative.status} <> 'closed'`));
      const [i] = await db.select().from(initiative).where(eq(initiative.id, access.initiative.id));
      return c.json(await detail(db, actor, i!));
    });
  })
  // Flows 8, 9: what reached the owners. No names, no screenshots, the day only. Newest first.
  .get("/initiatives/:id/routed", async (c) => {
    const actor = actorOf(c);
    return withDb(openFreshDb(c.env), async (db) => {
      const access = await initiativeWithRoles(db, actor, c.req.param("id"));
      if (!access || !canSeeRouted(access.roles)) return apiError(c, 404, "not_found", "No such initiative");
      const id = access.initiative.id;
      const [flags, questions] = await Promise.all([
        db.select().from(flag).where(and(eq(flag.initiativeId, id), isNotNull(flag.routedAt))),
        db.select().from(question).where(and(eq(question.initiativeId, id), isNotNull(question.routedAt))),
      ]);
      const eventIds = [...flags.map((f) => f.id), ...questions.map((q) => q.id)];
      const marks = eventIds.length
        ? await db
            .select({ eventId: suspectMark.eventId, documentTitle: citation.documentTitle, headingPath: citation.headingPath })
            .from(suspectMark)
            .innerJoin(answer, and(isNull(answer.supersededAt), sql`coalesce(${answer.flagId}, ${answer.questionId}) = ${suspectMark.eventId}`))
            .innerJoin(citation, and(eq(citation.answerId, answer.id), eq(citation.passageId, suspectMark.passageId)))
            .where(inArray(suspectMark.eventId, eventIds))
        : [];
      const day = (d: Date) => d.toISOString().slice(0, 10);
      const marked = (eventId: string) =>
        marks.filter((m) => m.eventId === eventId).map((m) => ({ documentTitle: m.documentTitle, headingPath: m.headingPath }));
      const items: Array<RoutedItem & { at: number }> = [
        ...flags.map((f) => ({
          kind: "flag" as const, id: f.id, text: f.transcript, appNames: f.appNames, day: day(f.createdAt),
          resolutionClass: f.resolutionClass ?? "unanswerable", stillStuckReason: f.stillStuckReason, markedPassages: marked(f.id), at: f.routedAt!.getTime(),
        })),
        ...questions.map((q) => ({
          kind: "question" as const, id: q.id, text: q.text, appNames: [], day: day(q.createdAt),
          resolutionClass: q.resolutionClass ?? "unanswerable", stillStuckReason: q.stillStuckReason, markedPassages: marked(q.id), at: q.routedAt!.getTime(),
        })),
      ];
      return c.json(items.sort((a, b) => b.at - a.at).map(({ at: _at, ...item }) => item));
    });
  });

export default initiatives;
