// The written answer: search_result blocks with sentence-level content and citations on all (platform.claude.com
// search-results), streamed; each citation maps back to its passage or Q&A entry by `source`.
import * as claude from "../ai/claude";
import type { ContentBlock, Message, MessagesRequest, SearchResultCitation } from "../ai/claude";
import { COPY, SYSTEM_PROMPT } from "./copy";
import type { Retrieved } from "./retrieve";
import { sourceTitle } from "./retrieve";
import { splitSentences } from "./sentences";

export type Turn = { text: string; answer: string | null };

export const sourceUri = (r: Pick<Retrieved, "kind" | "id">) => (r.kind === "qa" ? `ft://qa/${r.id}` : `ft://passage/${r.id}`);

/** A Q&A entry is cited as the owner's answer to its canonical question. */
const sourceText = (r: Retrieved) => (r.kind === "qa" ? `Q: ${r.qaQuestion}\nA: ${r.text}` : r.text);

export function buildRequest(input: {
  sources: Retrieved[];
  conflictKeys: Set<string>;
  event: { kind: "flag" | "question"; text: string; appNames: string[] };
  screenshot: { mediaType: string; base64: string } | null;
  priorTurns: Turn[];
}): MessagesRequest {
  const block = (r: Retrieved): ContentBlock => ({
    type: "search_result",
    source: sourceUri(r),
    title: r.kind === "qa" ? `Owner answer: ${r.qaQuestion}` : sourceTitle(r),
    content: splitSentences(sourceText(r)).map((text) => ({ type: "text", text })),
    citations: { enabled: true },
  });
  const plain = input.sources.filter((s) => !input.conflictKeys.has(s.key));
  const conflicts = input.sources.filter((s) => input.conflictKeys.has(s.key));
  const content: ContentBlock[] = [...plain.map(block)];
  if (conflicts.length) {
    content.push({ type: "text", text: "Passages below conflict with something the employee assumes:" });
    content.push(...conflicts.map(block));
  }
  if (input.screenshot) {
    content.push({ type: "image", source: { type: "base64", media_type: input.screenshot.mediaType, data: input.screenshot.base64 } });
  }
  const apps = input.event.appNames.length ? ` (apps on screen: ${input.event.appNames.join(", ")})` : "";
  const label = input.event.kind === "flag" ? "Friction report" : "Question";
  content.push({ type: "text", text: `${label}${apps}:\n${input.event.text}` });

  const history: Message[] = input.priorTurns.flatMap((t) => [
    { role: "user" as const, content: t.text },
    { role: "assistant" as const, content: t.answer ?? "(no answer)" },
  ]);
  return { system: SYSTEM_PROMPT, messages: [...history, { role: "user", content }], max_tokens: 300 };
}

export type MappedCitation = { index: number; source: Retrieved; quote: string; charOffset: number };
export type Claim = { text: string; sourceKeys: string[] };
export type Written = { text: string; citations: MappedCitation[]; claims: Claim[]; usage: { input: number; output: number } };

/**
 * Streams Claude's answer. `onDelta` receives text as it arrives (the answered band shows it live; the
 * middle band passes nothing and buffers). Aborts if the first word takes longer than `firstTokenMs`.
 */
export async function writeAnswer(
  env: Pick<Env, "AI" | "AI_GATEWAY_ID">,
  req: MessagesRequest,
  sources: Retrieved[],
  opts: { onDelta?: (text: string) => void; signal: AbortSignal; firstTokenMs: number },
): Promise<Written> {
  const bySource = new Map(sources.map((s) => [sourceUri(s), s]));
  const controller = new AbortController();
  const signal = AbortSignal.any([opts.signal, controller.signal]);
  const firstToken = setTimeout(() => controller.abort(new Error("first token too slow")), opts.firstTokenMs);

  let text = "";
  const blocks = new Map<number, { text: string; cites: SearchResultCitation[] }>();
  const claims: Claim[] = [];
  const found = new Map<string, MappedCitation>();
  const usage = { input: 0, output: 0 };

  try {
    for await (const ev of claude.stream(env, req, signal)) {
      if (ev.type === "message_start") usage.input = ev.message.usage?.input_tokens ?? 0;
      else if (ev.type === "message_delta") usage.output = ev.usage?.output_tokens ?? usage.output;
      else if (ev.type === "content_block_start") blocks.set(ev.index, { text: "", cites: [] });
      else if (ev.type === "content_block_delta") {
        const b = blocks.get(ev.index) ?? { text: "", cites: [] };
        blocks.set(ev.index, b);
        if (ev.delta.type === "text_delta") {
          clearTimeout(firstToken);
          b.text += ev.delta.text;
          text += ev.delta.text;
          opts.onDelta?.(ev.delta.text);
        } else {
          b.cites.push(ev.delta.citation);
        }
      } else if (ev.type === "content_block_stop") {
        const b = blocks.get(ev.index);
        if (!b) continue;
        const keys: string[] = [];
        for (const c of b.cites) {
          const s = bySource.get(c.source) ?? sources[c.search_result_index];
          if (!s) continue;
          keys.push(s.key);
          const existing = found.get(s.key);
          if (existing) {
            if (!existing.quote.includes(c.cited_text)) existing.quote = `${existing.quote} ${c.cited_text}`.trim();
          } else {
            // One chip per distinct passage, numbered in order of first citation, placed after its sentence group.
            found.set(s.key, { index: found.size + 1, source: s, quote: c.cited_text.trim(), charOffset: text.length });
          }
        }
        claims.push({ text: b.text, sourceKeys: [...new Set(keys)] });
      }
    }
  } finally {
    clearTimeout(firstToken);
  }
  return { text, citations: [...found.values()], claims, usage };
}

/** Claude unavailable, docs clearly cover it: the top include passages stand in for the answer. */
export function passagesAsAnswer(initiativeName: string, top: Retrieved[]): { text: string; citations: MappedCitation[] } {
  const text = COPY.coveredFallback(initiativeName);
  return {
    text,
    citations: top.map((s, i) => ({ index: i + 1, source: s, quote: s.text, charOffset: text.length })),
  };
}

/** Rewrites a follow-up to stand alone, for retrieval and judgment. Throws on failure; the caller falls back. */
export async function rewriteStandalone(
  env: Pick<Env, "AI" | "AI_GATEWAY_ID">,
  turns: Turn[],
  reply: string,
  signal: AbortSignal,
  prompt: string,
): Promise<string> {
  const convo = turns.map((t) => `Employee: ${t.text}\nFriction: ${t.answer ?? "(no answer)"}`).join("\n\n");
  const out = await claude.complete(
    env,
    {
      system: prompt,
      messages: [{ role: "user", content: `Conversation so far:\n${convo}\n\nFollow-up message:\n${reply}` }],
      max_tokens: 200,
      temperature: 0,
    },
    signal,
  );
  const rewritten = out.trim();
  if (!rewritten) throw new Error("empty rewrite");
  return rewritten;
}
