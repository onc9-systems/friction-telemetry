// The answer pipeline (flow 8), shared by flags (6), questions (7) and follow-ups. Runs inside the request; the
// answer arrives in seconds and everything after `done` (routing effects, analysis) happens in Inngest.
//
// Order of events: meta, (provisional), delta+, citation*, class, (count), done. Or choose_initiative alone.
import type { TypeSafeClient } from "@typesafe-ai/sdk";
import type { CitationPayload, RecordRef, SSEEvent } from "@friction-telemetry/contracts";
import type { Db } from "../db/client";
import { embedQuery } from "../ai/embed";
import { liveInitiativesFor } from "../initiatives/membership";
import type { Actor } from "../lib/actor";
import { decideAfterCheck, decideBand, decideInitiative, routePassage, shouldShowProvisional, type Band, type PassageRoute, type PassageScores } from "./classify";
import { buildRequest, passagesAsAnswer, rewriteStandalone, writeAnswer, type MappedCitation, type Turn, type Written } from "./compose";
import { candidates, toJevState, type Candidate } from "./context";
import { COPY, REWRITE_PROMPT } from "./copy";
import { currentAnswers, type EventRow } from "./events";
import * as jev from "./jev";
import { othersCount } from "./others";
import { persistAnswer } from "./persist";
import { locatorText, retrieve, type Retrieved } from "./retrieve";
import { BUDGET, THRESHOLDS as T } from "./thresholds";

export type Emit = (event: SSEEvent) => void;

export type PipelineDeps = {
  env: Env;
  db: Db;
  /** Null when no TypeSafe key is configured: every judgment takes its degraded path. */
  jev: TypeSafeClient | null;
  now?: () => number;
};

export type PipelineInput = {
  actor: Actor;
  event: EventRow;
  /** The employee's explicit pick (flag), the question's scope, or the switch target. Null: Friction picks. */
  explicitInitiativeId: string | null;
  switchedFrom: string | null;
  /** Follow-ups: the earlier turns of the thread, oldest first. */
  thread: { root: RecordRef; priorTurns: Turn[] } | null;
};

export type PipelineResult =
  | { kind: "answered"; answerId: string; resolutionClass: "answered" | "unanswerable"; initiativeId: string; citations: MappedCitation[]; othersCount: number | null; provisionalShown: boolean; degraded: string[] }
  | { kind: "choose_initiative" }
  | { kind: "failed"; message: string };

const timeout = (ms: number, deadline: AbortSignal) => AbortSignal.any([AbortSignal.timeout(ms), deadline]);
const settle = <T>(p: Promise<T>, onError: () => void): Promise<T | null> =>
  p.catch(() => {
    onError();
    return null;
  });

export function citationPayload(c: MappedCitation): CitationPayload {
  const s = c.source;
  const base = {
    index: c.index,
    quote: c.quote || s.text,
    documentTitle: s.kind === "qa" ? (s.qaQuestion ?? "Owner answer") : s.title,
    locator: locatorText(s),
    charOffset: c.charOffset,
    sourceKind: s.kind,
    headingPath: s.headingPath,
    passageText: s.text,
    suspect: s.suspect,
    qaApprovedByUserId: s.qaApprovedByUserId,
    qaApprovedAt: s.qaApprovedAt ? s.qaApprovedAt.toISOString() : null,
  };
  return s.kind === "qa" ? { ...base, passageId: null, qaEntryId: s.id } : { ...base, passageId: s.id, qaEntryId: null };
}

export async function runAnswer(input: PipelineInput, deps: PipelineDeps, emit: Emit): Promise<PipelineResult> {
  const { actor, event } = input;
  const { env, db } = deps;
  const now = deps.now ?? Date.now;
  const t0 = now();
  // Local development reaches Workers AI, Neon and Jev over the internet; PIPELINE_BUDGET_SCALE stretches every
  // timeout there. Production leaves it at 1.
  const scale = Math.max(1, Number(env.PIPELINE_BUDGET_SCALE) || 1);
  const B = Object.fromEntries(Object.entries(BUDGET).map(([k, v]) => [k, v * scale])) as { [K in keyof typeof BUDGET]: number };
  const deadline = AbortSignal.timeout(B.deadline);
  const degraded: string[] = [];
  const timings: Record<string, number> = {};
  const mark = (step: string) => (timings[step] = now() - t0);
  const trace: Record<string, unknown> = { timings, thread: input.thread?.root ?? null };
  let jevModel: string | null = null;

  // Context: the employee's live initiatives, narrowed to the explicit one when there is one.
  const live = await liveInitiativesFor(db, actor);
  const pool = input.explicitInitiativeId ? live.filter((i) => i.id === input.explicitInitiativeId) : live;
  if (pool.length === 0) {
    emit({ event: "choose_initiative", data: { options: [] } });
    return { kind: "choose_initiative" };
  }

  // Follow-ups are rewritten to stand alone, so retrieval, judgment and "N others" see the whole question.
  const queryTextP: Promise<string> = input.thread
    ? rewriteStandalone(env, input.thread.priorTurns, event.text, timeout(B.rewrite, deadline), REWRITE_PROMPT)
        .catch(() => {
          degraded.push("rewrite_failed");
          const last = input.thread!.priorTurns.at(-1);
          return last ? `${last.text}\n${event.text}` : event.text;
        })
        .finally(() => mark("rewrite"))
    : Promise.resolve(event.text);

  const candidatesP = candidates(db, actor.organizationId, pool).finally(() => mark("context"));
  const embedP = queryTextP.then((text) =>
    settle(embedQuery(env.AI, text, B.embed), () => degraded.push("embed_failed")).finally(() => mark("embed")),
  );
  const retrievalP = Promise.all([queryTextP, embedP]).then(([text, vector]) =>
    settle(
      retrieve(db, { organizationId: actor.organizationId, initiativeIds: pool.map((i) => i.id), text, vector }),
      () => degraded.push("retrieve_failed"),
    ).finally(() => mark("retrieve")),
  );
  const screenshotP = event.screenshotKey ? settle(loadScreenshot(env, event.screenshotKey), () => degraded.push("screenshot_failed")) : Promise.resolve(null);

  const eventState = (text: string): jev.EventState => ({ kind: event.kind, text, apps: event.appNames });
  const needChoice = !input.explicitInitiativeId && pool.length > 1;
  const earlyP = Promise.all([candidatesP, queryTextP]).then(([cands, text]) =>
    deps.jev
      ? settle(jev.early(deps.jev, eventState(text), cands.map(toJevState), needChoice, timeout(B.jev, deadline)), () =>
          degraded.push("jev_early_failed"),
        ).finally(() => mark("jev_early"))
      : null,
  );

  // Which initiative. Waits on the early judgment only when Friction has to pick.
  const cands = await candidatesP;
  const earlyResult = needChoice ? await earlyP : null;
  const decision = decideInitiative({
    live: cands,
    explicitId: input.explicitInitiativeId,
    choice: earlyResult?.choice ?? null,
    about: earlyResult?.about ?? null,
  });
  trace.initiative = { choice: earlyResult?.choice ?? null, about: earlyResult?.about ?? null, decision: decision.kind };
  if (decision.kind === "choose") {
    emit({ event: "choose_initiative", data: { options: decision.options.map(({ initiativeId, name }) => ({ initiativeId, name })) } });
    return { kind: "choose_initiative" };
  }
  const chosen = cands.find((c) => c.initiativeId === decision.initiativeId) as Candidate;
  emit({
    event: "meta",
    data: {
      eventId: event.id,
      initiativeId: chosen.initiativeId,
      initiativeName: chosen.name,
      initiativeConfidence: decision.confidence,
      switchable: decision.switchable,
      alternatives: decision.alternatives.map(({ initiativeId, name }) => ({ initiativeId, name })),
      switchedFrom: input.switchedFrom,
      inReplyTo: event.inReplyTo,
    },
  });
  mark("meta");

  // The provisional line, if the early judgment is very sure the docs don't cover it and no words are out yet.
  let answerStarted = false;
  let provisionalShown = false;
  const provisionalP = earlyP.then((e) => {
    const covered = e?.covered[chosen.slug] ?? null;
    trace.covered = covered;
    if (e) jevModel = e.model;
    if (!answerStarted && shouldShowProvisional(covered)) {
      provisionalShown = true;
      emit({ event: "provisional", data: { message: COPY.provisional } });
    }
  });

  const othersP = embedP.then((v) =>
    v
      ? settle(
          withTimeout(othersCount(db, { organizationId: actor.organizationId, initiativeId: chosen.initiativeId, userId: actor.userId, vector: v }), B.others),
          () => degraded.push("others_failed"),
        )
      : null,
  );

  const delta = (text: string) => {
    answerStarted = true;
    emit({ event: "delta", data: { text } });
  };

  const [retrieved, queryText, screenshot] = await Promise.all([retrievalP, queryTextP, screenshotP]);
  const top: Retrieved[] = retrieved?.get(chosen.initiativeId) ?? [];
  trace.passages = top.map((r) => ({ key: r.key, fusedRank: r.fusedRank, score: r.score, cosine: r.cosine, vectorRank: r.vectorRank, textRank: r.textRank }));

  let text = "";
  let citations: MappedCitation[] = [];
  let resolutionClass: "answered" | "unanswerable" = "unanswerable";
  let band: Band | "degraded" = "unanswerable";

  if (!retrieved) {
    text = COPY.couldNotAnswer;
    delta(text);
  } else if (top.length === 0) {
    text = COPY.unanswerable(chosen.name);
    delta(text);
  } else {
    // Packed verification: four judgments per passage in one request.
    const labelled = top.map((r, i) => ({
      label: `P${String(i + 1).padStart(2, "0")}`,
      source: r.kind === "qa" ? `Answered by the ${chosen.name} owner` : r.title,
      kind: r.kind === "qa" ? ("owner_answer" as const) : ("document" as const),
      text: r.kind === "qa" ? `Q: ${r.qaQuestion}\nA: ${r.text}` : r.text,
    }));
    const verified = deps.jev
      ? await settle(jev.verify(deps.jev, eventState(queryText), labelled, timeout(B.jev, deadline)), () => degraded.push("jev_verify_failed")).finally(() =>
          mark("jev_verify"),
        )
      : (degraded.push("jev_verify_failed"), null);

    let routes: PassageRoute[] = [];
    let scores: PassageScores[] = [];
    if (verified) {
      jevModel = verified.model;
      scores = verified.scores;
      routes = scores.map(routePassage);
      band = decideBand(routes.map((route, i) => ({ route, evidence: scores[i]!.evidence })));
    } else {
      band = "degraded";
    }
    trace.verification = verified ? top.map((r, i) => ({ key: r.key, ...scores[i], route: routes[i] })) : null;
    trace.band = band;

    // Passages for Claude: include and conflict, strongest evidence first, owner answers first on ties.
    const usable = verified
      ? top
          .map((r, i) => ({ r, s: scores[i]!, route: routes[i]! }))
          .filter((x) => x.route === "include" || x.route === "conflict")
          .sort((a, b) => b.s.evidence - a.s.evidence || Number(b.r.kind === "qa") - Number(a.r.kind === "qa"))
      : top.map((r) => ({ r, s: null, route: "include" as PassageRoute }));
    const forClaude = usable.slice(0, T.claudePassages).map((x) => x.r);
    const conflictKeys = new Set(usable.filter((x) => x.route === "conflict").map((x) => x.r.key));
    const includeOnly = usable.filter((x) => x.route === "include").map((x) => x.r);
    const request = () =>
      buildRequest({
        sources: forClaude,
        conflictKeys,
        event: { kind: event.kind, text: event.text, appNames: event.appNames },
        screenshot,
        priorTurns: input.thread?.priorTurns ?? [],
      });
    const claudeSignal = timeout(B.claudeTotal, deadline);

    if (band === "unanswerable" || forClaude.length === 0) {
      band = "unanswerable";
      text = COPY.unanswerable(chosen.name);
      delta(text);
    } else if (band === "answered" || band === "degraded") {
      let written: Written | null = null;
      try {
        written = await writeAnswer(env, request(), forClaude, { onDelta: delta, signal: claudeSignal, firstTokenMs: B.claudeFirstToken });
        trace.claudeUsage = written.usage;
      } catch (err) {
        degraded.push("claude_failed");
        trace.claudeError = err instanceof Error ? err.message : String(err);
      }
      mark("claude");
      if (written) {
        text = written.text;
        citations = written.citations;
        // Zero citations means Claude said the documents don't answer it: the class follows the words shown.
        resolutionClass = citations.length > 0 ? "answered" : "unanswerable";
      } else if (answerStarted) {
        text = COPY.cutOff;
        delta(`\n\n${COPY.cutOff}`);
        citations = passagesAsAnswer(chosen.name, includeOnly.slice(0, 1)).citations;
        resolutionClass = band === "answered" && citations.length ? "answered" : "unanswerable";
      } else if (band === "answered" && includeOnly.length) {
        const fallback = passagesAsAnswer(chosen.name, includeOnly.slice(0, T.fallbackPassages));
        text = fallback.text;
        citations = fallback.citations;
        resolutionClass = "answered";
        delta(text);
      } else {
        text = COPY.couldNotAnswer;
        delta(text);
      }
    } else {
      // Middle band: write, check every cited claim, and show the answer only if it holds up.
      let accepted = false;
      try {
        const written = await writeAnswer(env, request(), forClaude, { signal: claudeSignal, firstTokenMs: B.claudeFirstToken });
        trace.claudeUsage = written.usage;
        trace.draft = written.text;
        const cited = written.claims.filter((c) => c.sourceKeys.length > 0);
        const byKey = new Map(forClaude.map((r) => [r.key, r]));
        const checked = cited.length && deps.jev
          ? await jev.citationCheck(
              deps.jev,
              cited.map((c) => ({ claim: c.text, section: byKey.get(c.sourceKeys[0]!)!.text })),
              timeout(B.jev, deadline),
            )
          : null;
        trace.citationChecks = checked?.results ?? null;
        let k = 0;
        accepted = decideAfterCheck(
          written.claims.map((c) => ({ text: c.text, cited: c.sourceKeys.length > 0, check: c.sourceKeys.length > 0 ? (checked?.results[k++] ?? null) : null })),
        );
        if (accepted) {
          text = written.text;
          citations = written.citations;
          resolutionClass = "answered";
          delta(text);
        }
      } catch (err) {
        degraded.push("middle_band_failed");
        trace.claudeError = err instanceof Error ? err.message : String(err);
      }
      mark("middle_band");
      if (!accepted) {
        text = COPY.unanswerable(chosen.name);
        delta(text);
      }
    }
  }

  await provisionalP;
  for (const c of citations) emit({ event: "citation", data: citationPayload(c) });
  const others = await othersP;
  const embedding = await embedP;
  trace.others = others;

  let saved: { answerId: string; routed: boolean };
  try {
    saved = await persistAnswer(db, event, {
      initiativeId: chosen.initiativeId,
      initiativeConfidence: decision.confidence,
      text,
      citations,
      resolutionClass,
      band,
      provisionalShown,
      othersCount: others,
      embedding,
      standaloneText: input.thread ? queryText : null,
      jevModel,
      trace,
      degraded,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(JSON.stringify({ msg: "persist_failed", eventId: event.id, error: message }));
    emit({ event: "error", data: { code: "persist_failed", message: "Couldn't save the answer. Try again." } });
    return { kind: "failed", message };
  }
  mark("persist");
  emit({ event: "class", data: { resolutionClass, routed: saved.routed } });
  if (others !== null) emit({ event: "count", data: { othersCount: others } });
  emit({ event: "done", data: { answerId: saved.answerId } });
  return { kind: "answered", answerId: saved.answerId, resolutionClass, initiativeId: chosen.initiativeId, citations, othersCount: others, provisionalShown, degraded };
}

/** Re-POST of an answered event: the same card again, without calling any model. */
export async function replay(db: Db, event: EventRow, initiativeName: string, emit: Emit): Promise<string | null> {
  const current = (await currentAnswers(db, [event])).get(event.id);
  if (!current) return null;
  const { answer: a, citations } = current;
  emit({
    event: "meta",
    data: {
      eventId: event.id,
      initiativeId: a.initiativeId ?? event.initiativeId!,
      initiativeName,
      initiativeConfidence: 1,
      switchable: false,
      alternatives: [],
      switchedFrom: null,
      inReplyTo: event.inReplyTo,
    },
  });
  if (a.provisionalShown) emit({ event: "provisional", data: { message: COPY.provisional } });
  emit({ event: "delta", data: { text: a.text } });
  for (const c of citations) emit({ event: "citation", data: storedCitation(c) });
  const cls = event.resolutionClass === "still_stuck" ? "still_stuck" : (event.resolutionClass ?? "unanswerable");
  emit({ event: "class", data: { resolutionClass: cls, routed: event.routedAt !== null } });
  if (a.othersCount !== null) emit({ event: "count", data: { othersCount: a.othersCount } });
  emit({ event: "done", data: { answerId: a.id } });
  return a.id;
}

type StoredCitation = Awaited<ReturnType<typeof currentAnswers>> extends Map<string, infer V> ? V extends { citations: Array<infer C> } ? C : never : never;

/** A citation row as the stream and the thread view show it. */
export function storedCitation(c: StoredCitation): CitationPayload {
  const base = {
    index: c.ordinal,
    quote: c.quote,
    documentTitle: c.documentTitle,
    locator: c.locator,
    charOffset: c.charOffset,
    sourceKind: c.sourceKind === "qa" ? ("qa" as const) : ("document" as const),
    headingPath: c.headingPath,
    passageText: c.passageText || c.quote,
    suspect: c.liveSuspect ?? false,
    qaApprovedByUserId: c.qaApprovedByUserId,
    qaApprovedAt: c.qaApprovedAt ? c.qaApprovedAt.toISOString() : null,
  };
  return c.qaEntryId ? { ...base, passageId: null, qaEntryId: c.qaEntryId } : { ...base, passageId: c.passageId!, qaEntryId: null };
}

async function loadScreenshot(env: Env, key: string): Promise<{ mediaType: string; base64: string } | null> {
  const object = await env.FILES.get(key);
  if (!object) return null;
  const bytes = new Uint8Array(await object.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return { mediaType: object.httpMetadata?.contentType ?? "image/png", base64: btoa(binary) };
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`timed out after ${ms} ms`)), ms))]);
}
