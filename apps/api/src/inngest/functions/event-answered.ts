// After the answer (flow 8 hands off to flow 13). Routing is already visible (routed_at is written with the
// answer); this function reconciles a class decided without Jev and hands the event to the analysis seam.
import { and, eq, inArray, isNull } from "drizzle-orm";
import { inngest } from "../client";
import { eventAnswered } from "../events";
import { openDb, withDb } from "../../db/client";
import { answer, flag, passage, pipelineTrace, qaEntry, question } from "../../db/schema";
import { NoopAnalysis, type AnalysisSeam } from "../../analysis/seam";
import { decideBand, routePassage } from "../../answer/classify";
import * as jev from "../../answer/jev";

type WithEnv = { env: Env };
const analysis: AnalysisSeam = new NoopAnalysis();

export const eventAnsweredFn = inngest.createFunction(
  { id: "event-answered", triggers: [eventAnswered], idempotency: "event.data.answerId" },
  async (ctx) => {
    const { event, step } = ctx;
    const { env } = ctx as unknown as WithEnv;
    const data = event.data;

    if (data.degraded.includes("jev_verify_failed") && data.resolutionClass === "answered" && env.TYPESAFE_API_KEY) {
      // Claude answered without Jev's verification. Re-judge the same passages with retries; when Jev finds
      // nothing that answers it, the stored class becomes Unanswerable and the event reaches the owner.
      await step.run("reconcile-class", () =>
        withDb(openDb(env), async (db) => {
          const [t] = await db.select().from(pipelineTrace).where(eq(pipelineTrace.answerId, data.answerId));
          const keys = ((t?.trace.passages as Array<{ key: string }> | undefined) ?? []).map((p) => p.key);
          const docIds = keys.filter((k) => k.startsWith("document:")).map((k) => k.slice(9));
          const qaIds = keys.filter((k) => k.startsWith("qa:")).map((k) => k.slice(3));
          const docs = docIds.length ? await db.select({ id: passage.id, text: passage.text }).from(passage).where(inArray(passage.id, docIds)) : [];
          const qas = qaIds.length ? await db.select({ id: qaEntry.id, q: qaEntry.question, a: qaEntry.answer }).from(qaEntry).where(inArray(qaEntry.id, qaIds)) : [];
          const texts = keys.map((k) => {
            const d = docs.find((x) => `document:${x.id}` === k);
            const q = qas.find((x) => `qa:${x.id}` === k);
            return d ? d.text : q ? `Q: ${q.q}\nA: ${q.a ?? ""}` : "";
          });
          const [row] =
            data.kind === "flag"
              ? await db.select({ text: flag.transcript, apps: flag.appNames }).from(flag).where(eq(flag.id, data.eventId))
              : await db.select({ text: question.text, standalone: question.standaloneText }).from(question).where(eq(question.id, data.eventId))
                  .then((r) => r.map((x) => ({ text: x.standalone ?? x.text, apps: [] as string[] })));
          if (!row || texts.length === 0) return { changed: false };
          const verified = await jev.verify(
            jev.jevClient({ apiKey: env.TYPESAFE_API_KEY, background: true }),
            { kind: data.kind, text: row.text, apps: row.apps },
            texts.map((text, i) => ({
              label: `P${String(i + 1).padStart(2, "0")}`,
              source: keys[i]!,
              kind: keys[i]!.startsWith("qa:") ? ("owner_answer" as const) : ("document" as const),
              text,
            })),
          );
          const routes = verified.scores.map(routePassage);
          const band = decideBand(routes.map((route, i) => ({ route, evidence: verified.scores[i]!.evidence })));
          if (band !== "unanswerable") return { changed: false, band };
          const set = { resolutionClass: "unanswerable" as const, routedAt: new Date() };
          if (data.kind === "flag") await db.update(flag).set(set).where(and(eq(flag.id, data.eventId), eq(flag.resolutionClass, "answered")));
          else await db.update(question).set(set).where(and(eq(question.id, data.eventId), eq(question.resolutionClass, "answered")));
          await db.update(answer).set({ band: "unanswerable" }).where(and(eq(answer.id, data.answerId), isNull(answer.supersededAt)));
          return { changed: true, band };
        }),
      );
    }

    await step.run("analysis", async () => {
      await analysis.onEventAnswered(data);
      return { ok: true };
    });
  },
);
