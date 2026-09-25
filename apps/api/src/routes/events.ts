// Flags and questions: flows 6 (flag), 7 (question and follow-up), 8 (answer pipeline), 9 (still stuck).
//
//   POST /v1/events                  a Flag or a Question; answers as an SSE stream (contracts: sse.ts)
//   POST /v1/events/:id/initiative   the employee chose or switched a flag's initiative; same SSE stream
//   POST /v1/events/:id/still-stuck  the answer did not solve it (Answered only)
//   GET  /v1/events/:id/thread       the thread this flag or question belongs to, every turn with its answer
//
// Every error before the stream starts is JSON (`ApiError`), never SSE.
import { Hono, type Context } from "hono";
import type { AppEnv } from "../auth/actor";
import { zValidator } from "@hono/zod-validator";
import { streamSSE } from "hono/streaming";
import { and, eq, isNull } from "drizzle-orm";
import * as z from "zod";
import {
  EventBody,
  StillStuckBody,
  SwitchInitiativeBody,
  type ApiError,
  type StillStuckResult,
  type Thread,
} from "@friction-telemetry/contracts";
import { openFreshDb, withDb, type Db } from "../db/client";
import { answer, citation, document, flag, initiative, question } from "../db/schema";
import { inngest } from "../inngest/client";
import { eventAnswered, eventStillStuck } from "../inngest/events";
import { liveInitiativesFor } from "../initiatives/membership";
import { actorOf, apiError, type Actor } from "../lib/actor";
import { buildStubScript, scriptNameFromHeader, stubPace } from "../sse/stub";
import { currentAnswers, loadEvent, loadThreadEvents, threadRootOf, type EventRow } from "../answer/events";
import { jevClient } from "../answer/jev";
import { replay, runAnswer, storedCitation, type Emit, type PipelineInput, type PipelineResult } from "../answer/pipeline";
import { BUDGET } from "../answer/thresholds";

type C = Context<AppEnv>;

/** Questions longer than this are refused; the Mac disables Send first ("Keep a question under 4,000 characters."). */
const MAX_QUESTION_CHARS = 4000;

/**
 * A body that is neither a Flag nor a Question fails the union as a whole, which Zod reports only as
 * "Invalid input". Name what is wrong under each reading so the client can see the field.
 */
function describeEventBodyError(error: z.core.$ZodError): string {
  const [issue] = error.issues;
  if (error.issues.length !== 1 || issue?.code !== "invalid_union" || issue.errors.length !== 2) {
    return z.prettifyError(error);
  }
  const [asFlag = [], asQuestion = []] = issue.errors;
  return [
    `Not a Flag:\n${z.prettifyError(new z.ZodError(asFlag))}`,
    `Not a Question:\n${z.prettifyError(new z.ZodError(asQuestion))}`,
  ].join("\n");
}

const useStub = (c: C) =>
  c.env.ANSWER_PIPELINE === "stub" || (c.env.ENVIRONMENT === "development" && c.req.header("x-ft-stub-script") !== undefined);

function stubStream(c: C, eventId: string) {
  const steps = buildStubScript(scriptNameFromHeader(c.req.header("x-ft-stub-script")), eventId);
  const pace = stubPace(c.env.STUB_PACE);
  // No onError argument: Hono's would write its own plain-text `error` frame. Contract errors are ours.
  return streamSSE(c, async (stream) => {
    try {
      for (const step of steps) {
        if (stream.aborted) return;
        const delay = step.delayMs * pace;
        if (delay > 0) await stream.sleep(delay);
        await stream.writeSSE({ event: step.event, data: JSON.stringify(step.data) });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await stream.writeSSE({ event: "error", data: JSON.stringify({ code: "stub_failed", message }) });
    }
  });
}

type Prepared =
  | { kind: "error"; response: Response }
  | { kind: "replay"; event: EventRow; initiativeName: string }
  | { kind: "run"; input: PipelineInput };

const initiativeName = async (db: Db, id: string | null) =>
  id ? ((await db.select({ name: initiative.name }).from(initiative).where(eq(initiative.id, id)))[0]?.name ?? "") : "";

/** Whether the person can raise events against the initiative now. Returns an error response or null. */
async function checkScope(c: C, db: Db, actor: Actor, initiativeId: string, live: Awaited<ReturnType<typeof liveInitiativesFor>>) {
  if (live.some((i) => i.id === initiativeId)) return null;
  const [row] = await db
    .select({ name: initiative.name, status: initiative.status })
    .from(initiative)
    .where(and(eq(initiative.id, initiativeId), eq(initiative.organizationId, actor.organizationId)));
  if (row?.status === "closed") {
    return apiError(c, 409, "closed_initiative", `${row.name} is closed, so it no longer takes questions.`);
  }
  return apiError(c, 403, "not_member", "You're not part of this initiative.");
}

/** Validates the event, stores it, and decides whether to replay, refuse, or run the pipeline. */
async function prepare(c: C, db: Db, actor: Actor, body: EventBody): Promise<Prepared> {
  const kind = "transcript" in body ? "flag" : "question";
  const fail = (response: Response): Prepared => ({ kind: "error", response });

  const existing = await loadEvent(db, actor.organizationId, body.id);
  if (existing) {
    if (existing.userId !== actor.userId || existing.kind !== kind) return fail(apiError(c, 409, "id_conflict", "This id belongs to another event."));
    const current = (await currentAnswers(db, [existing])).get(existing.id);
    if (current) return { kind: "replay", event: existing, initiativeName: await initiativeName(db, current.answer.initiativeId) };
    if (Date.now() - existing.createdAt.getTime() < BUDGET.inProgressWindow) {
      return fail(apiError(c, 409, "in_progress", "This event is still being answered. Retry shortly."));
    }
  }

  const live = await liveInitiativesFor(db, actor);
  if (kind === "flag") {
    const f = body as Extract<EventBody, { transcript: string }>;
    if (f.initiativeId) {
      const refused = await checkScope(c, db, actor, f.initiativeId, live);
      if (refused) return fail(refused);
    }
    await db
      .insert(flag)
      .values({
        id: f.id,
        organizationId: actor.organizationId,
        userId: actor.userId,
        initiativeId: f.initiativeId,
        transcript: f.transcript,
        screenshotKey: f.screenshotKey,
        clipKey: f.clipKey,
        appNames: f.appNames,
      })
      .onConflictDoNothing();
    const event = (await loadEvent(db, actor.organizationId, f.id, "flag"))!;
    return { kind: "run", input: { actor, event, explicitInitiativeId: f.initiativeId, switchedFrom: null, thread: null } };
  }

  const q = body as Extract<EventBody, { text: string }>;
  if (q.text.length > MAX_QUESTION_CHARS) return fail(apiError(c, 400, "question_too_long", "Keep a question under 4,000 characters."));
  const refused = await checkScope(c, db, actor, q.initiativeId, live);
  if (refused) return fail(refused);

  let thread: PipelineInput["thread"] = null;
  if (q.inReplyTo) {
    const parent = await loadEvent(db, actor.organizationId, q.inReplyTo.id, q.inReplyTo.kind);
    if (!parent || parent.userId !== actor.userId) return fail(apiError(c, 404, "parent_not_found", "The message this replies to was not found."));
    if (parent.initiativeId !== q.initiativeId) {
      return fail(apiError(c, 409, "initiative_mismatch", "A follow-up stays in the initiative of the message it replies to."));
    }
    const root = threadRootOf(parent);
    const turns = await loadThreadEvents(db, actor.organizationId, root);
    const upToParent = turns.slice(0, turns.findIndex((t) => t.id === parent.id) + 1);
    const answers = await currentAnswers(db, upToParent);
    if (!answers.get(parent.id)) return fail(apiError(c, 409, "parent_unanswered", "The message this replies to has no answer yet."));
    thread = { root, priorTurns: upToParent.map((t) => ({ text: t.standaloneText ?? t.text, answer: answers.get(t.id)?.answer.text ?? null })) };
  }
  await db
    .insert(question)
    .values({
      id: q.id,
      organizationId: actor.organizationId,
      userId: actor.userId,
      initiativeId: q.initiativeId,
      text: q.text,
      inReplyToKind: q.inReplyTo?.kind ?? null,
      inReplyToId: q.inReplyTo?.id ?? null,
      threadRootKind: thread?.root.kind ?? null,
      threadRootId: thread?.root.id ?? null,
    })
    .onConflictDoNothing();
  const event = (await loadEvent(db, actor.organizationId, q.id, "question"))!;
  return { kind: "run", input: { actor, event, explicitInitiativeId: q.initiativeId, switchedFrom: null, thread } };
}

/** Streams the pipeline. The work continues after a client disconnect (waitUntil) and closes its connection. */
function answerStream(c: C, db: Db, run: (emit: Emit) => Promise<PipelineResult | void>) {
  return streamSSE(c, async (stream) => {
    let chain: Promise<unknown> = Promise.resolve();
    const emit: Emit = (e) => {
      chain = chain
        .then(() => (stream.aborted ? undefined : stream.writeSSE({ event: e.event, data: JSON.stringify(e.data) })))
        .catch(() => undefined);
    };
    const work = (async () => {
      try {
        await run(emit);
      } catch (err) {
        console.error(JSON.stringify({ msg: "answer_failed", error: err instanceof Error ? err.stack : String(err) }));
        emit({ event: "error", data: { code: "internal", message: "Couldn't answer this right now. Try again." } });
      } finally {
        await chain;
        await db.$client.end();
      }
    })();
    c.executionCtx.waitUntil(work);
    await work;
  });
}

async function afterAnswer(env: Env, input: PipelineInput, result: PipelineResult | void) {
  if (!result || result.kind !== "answered") return;
  try {
    await inngest.send(
      eventAnswered.create(
        {
          organizationId: input.actor.organizationId,
          eventId: input.event.id,
          kind: input.event.kind,
          initiativeId: result.initiativeId,
          answerId: result.answerId,
          resolutionClass: result.resolutionClass,
          citedPassageIds: result.citations.flatMap((c) => (c.source.kind === "document" ? [c.source.id] : [])),
          citedQaEntryIds: result.citations.flatMap((c) => (c.source.kind === "qa" ? [c.source.id] : [])),
          othersCount: result.othersCount,
          provisionalShown: result.provisionalShown,
          degraded: result.degraded,
          threadRoot: input.thread?.root ?? null,
        },
        { id: `answered-${result.answerId}` },
      ),
    );
  } catch (err) {
    console.error(JSON.stringify({ msg: "inngest_send_failed", event: "ft/event.answered", error: String(err) }));
  }
}

const jevFor = (env: Env) =>
  env.TYPESAFE_API_KEY
    ? jevClient({ apiKey: env.TYPESAFE_API_KEY, timeoutMs: BUDGET.jev * Math.max(1, Number(env.PIPELINE_BUDGET_SCALE) || 1) })
    : null;

const events = new Hono<AppEnv>()
  .post(
    "/events",
    zValidator("json", EventBody, (result, c) => {
      if (!result.success) {
        return c.json({ error: "invalid_body", message: describeEventBodyError(result.error) } satisfies ApiError, 400);
      }
    }),
    async (c) => {
      const body = c.req.valid("json");
      if (useStub(c)) return stubStream(c, body.id);
      const actor = actorOf(c);
      let db: Db;
      try {
        db = await openFreshDb(c.env);
      } catch {
        return apiError(c, 503, "unavailable", "Couldn't reach Friction.");
      }
      let prepared: Prepared;
      try {
        prepared = await prepare(c, db, actor, body);
      } catch (err) {
        await db.$client.end();
        console.error(JSON.stringify({ msg: "event_store_failed", error: String(err) }));
        return apiError(c, 503, "unavailable", "Couldn't reach Friction.");
      }
      if (prepared.kind === "error") {
        await db.$client.end();
        return prepared.response;
      }
      if (prepared.kind === "replay") {
        const { event, initiativeName: name } = prepared;
        return answerStream(c, db, async (emit) => void (await replay(db, event, name, emit)));
      }
      const { input } = prepared;
      return answerStream(c, db, async (emit) => {
        const result = await runAnswer(input, { env: c.env, db, jev: jevFor(c.env) }, emit);
        await afterAnswer(c.env, input, result);
        return result;
      });
    },
  )
  // Flow 8, states 3 and 4: the employee picked the initiative for a flag. The earlier answer is superseded.
  .post(
    "/events/:id/initiative",
    zValidator("json", SwitchInitiativeBody, (r, c) => (r.success ? undefined : apiError(c, 400, "invalid_body", z.prettifyError(r.error)))),
    async (c) => {
      const actor = actorOf(c);
      const { initiativeId } = c.req.valid("json");
      const db = await openFreshDb(c.env);
      const event = await loadEvent(db, actor.organizationId, c.req.param("id"));
      const close = async (r: Response) => (await db.$client.end(), r);
      if (!event || event.userId !== actor.userId) return close(apiError(c, 404, "not_found", "No such flag."));
      if (event.kind !== "flag") return close(apiError(c, 409, "question_scope_fixed", "A question's initiative is chosen when it is asked."));
      const refused = await checkScope(c, db, actor, initiativeId, await liveInitiativesFor(db, actor));
      if (refused) return close(refused);
      const previous = (await currentAnswers(db, [event])).get(event.id);
      const switchedFrom = previous && previous.answer.initiativeId !== initiativeId ? await initiativeName(db, previous.answer.initiativeId) : null;
      await db.update(answer).set({ supersededAt: new Date() }).where(and(eq(answer.flagId, event.id), isNull(answer.supersededAt)));
      await db.update(flag).set({ initiativeId, resolutionClass: null, routedAt: null }).where(eq(flag.id, event.id));
      const input: PipelineInput = { actor, event: { ...event, initiativeId }, explicitInitiativeId: initiativeId, switchedFrom, thread: null };
      return answerStream(c, db, async (emit) => {
        const result = await runAnswer(input, { env: c.env, db, jev: jevFor(c.env) }, emit);
        await afterAnswer(c.env, input, result);
        return result;
      });
    },
  )
  // Flow 9: the documents cover it and the employee is still blocked. The cited documents become suspect.
  .post(
    "/events/:id/still-stuck",
    zValidator("json", StillStuckBody, (r, c) => (r.success ? undefined : apiError(c, 400, "invalid_body", z.prettifyError(r.error)))),
    async (c) => {
      const actor = actorOf(c);
      const { reason } = c.req.valid("json");
      return withDb(openFreshDb(c.env), async (db) => {
        const event = await loadEvent(db, actor.organizationId, c.req.param("id"));
        if (!event || event.userId !== actor.userId) return apiError(c, 404, "not_found", "No such flag or question.");
        const current = (await currentAnswers(db, [event])).get(event.id);
        if (!current || (event.resolutionClass !== "answered" && event.resolutionClass !== "still_stuck")) {
          return apiError(c, 409, "not_answered", "Only an answered flag or question can be marked still stuck.");
        }
        const cited = await db
          .selectDistinct({ documentId: citation.documentId, title: document.title })
          .from(citation)
          .innerJoin(document, eq(document.id, citation.documentId))
          .where(eq(citation.answerId, current.answer.id));
        const result: StillStuckResult = {
          resolutionClass: "still_stuck",
          citedDocuments: cited.map((d) => ({ documentId: d.documentId!, title: d.title })),
        };
        if (event.resolutionClass === "still_stuck") return c.json(result);
        const set = { resolutionClass: "still_stuck" as const, stillStuckAt: new Date(), stillStuckReason: reason?.trim() || null, routedAt: new Date() };
        if (event.kind === "flag") await db.update(flag).set(set).where(eq(flag.id, event.id));
        else await db.update(question).set(set).where(eq(question.id, event.id));
        await inngest
          .send(
            eventStillStuck.create(
              {
                organizationId: actor.organizationId,
                eventId: event.id,
                kind: event.kind,
                initiativeId: current.answer.initiativeId ?? event.initiativeId!,
                answerId: current.answer.id,
                citedPassageIds: current.citations.flatMap((x) => (x.passageId ? [x.passageId] : [])),
                citedQaEntryIds: current.citations.flatMap((x) => (x.qaEntryId ? [x.qaEntryId] : [])),
              },
              { id: `still-stuck-${event.id}` },
            ),
          )
          .catch((err) => console.error(JSON.stringify({ msg: "inngest_send_failed", event: "ft/event.still_stuck", error: String(err) })));
        return c.json(result);
      });
    },
  )
  // The employee's own thread: any turn's id returns the whole conversation, oldest first.
  .get("/events/:id/thread", async (c) => {
    const actor = actorOf(c);
    return withDb(openFreshDb(c.env), async (db) => {
      const event = await loadEvent(db, actor.organizationId, c.req.param("id"));
      if (!event || event.userId !== actor.userId) return apiError(c, 404, "not_found", "No such flag or question.");
      const root = threadRootOf(event);
      const turns = await loadThreadEvents(db, actor.organizationId, root);
      const answers = await currentAnswers(db, turns);
      const initiativeId = turns[0]?.initiativeId ?? null;
      const thread: Thread = {
        root,
        initiativeId,
        initiativeName: initiativeId ? await initiativeName(db, initiativeId) : null,
        turns: turns.map((t) => {
          const a = answers.get(t.id);
          return {
            kind: t.kind,
            id: t.id,
            text: t.text,
            inReplyTo: t.inReplyTo,
            resolutionClass: t.resolutionClass,
            routed: t.routedAt !== null,
            stillStuckReason: t.stillStuckReason,
            answer: a
              ? {
                  id: a.answer.id,
                  text: a.answer.text,
                  citations: a.citations.map(storedCitation),
                  provisionalShown: a.answer.provisionalShown,
                  othersCount: a.answer.othersCount,
                  createdAt: a.answer.createdAt.toISOString(),
                }
              : null,
            createdAt: t.createdAt.toISOString(),
          };
        }),
      };
      return c.json(thread);
    });
  });

export default events;
