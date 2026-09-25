// The answer pipeline's decisions (spec 06, "Tests"), the chunker and PPTX extractor (spec 05), and the mapping
// of Claude's streamed citations to passages. Expectations come from the specs, not from the implementation.
import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { decideAfterCheck, decideBand, decideInitiative, fuseRrf, routePassage, shouldShowProvisional, slugify } from "../src/answer/classify";
import { buildRequest, writeAnswer } from "../src/answer/compose";
import type { Retrieved } from "../src/answer/retrieve";
import { splitSentences } from "../src/answer/sentences";
import { chunkMarkdown } from "../src/documents/chunk";
import { pptxToMarkdown } from "../src/documents/pptx";

const live = [
  { initiativeId: "i-proc", name: "Procurement rollout", slug: "procurement_rollout" },
  { initiativeId: "i-time", name: "New timesheets", slug: "new_timesheets" },
];

describe("decideInitiative (flow 8, states 2 to 4)", () => {
  const pick = (confidence: number, about = 0.9) =>
    decideInitiative({ live, explicitId: null, choice: { slug: "procurement_rollout", confidence }, about: { procurement_rollout: about, new_timesheets: 0.1 } });

  it("given Choice confidence 0.85, then it routes without a switch", () => {
    expect(pick(0.85)).toStrictEqual({ kind: "route", initiativeId: "i-proc", confidence: 0.85, switchable: false, alternatives: [] });
  });
  it("given 0.60, then it routes switchable, offering the other initiatives", () => {
    expect(pick(0.6)).toStrictEqual({ kind: "route", initiativeId: "i-proc", confidence: 0.6, switchable: true, alternatives: [live[1]] });
  });
  it("given 0.40, then it asks the employee", () => {
    expect(pick(0.4)).toStrictEqual({ kind: "choose", options: live });
  });
  it("given 0.90 but the chosen initiative's own Noul at 0.20, then it asks (a Choice always picks someone)", () => {
    expect(pick(0.9, 0.2)).toStrictEqual({ kind: "choose", options: live });
  });
  it("given an explicit pick, then it routes there at confidence 1 whatever Jev said", () => {
    expect(decideInitiative({ live, explicitId: "i-time", choice: { slug: "procurement_rollout", confidence: 0.99 }, about: null })).toMatchObject({
      initiativeId: "i-time",
      confidence: 1,
      switchable: false,
    });
  });
  it("given no early judgment and several initiatives, then it asks", () => {
    expect(decideInitiative({ live, explicitId: null, choice: null, about: null }).kind).toBe("choose");
  });
});

describe("routePassage and decideBand (flow 8)", () => {
  it("given injection 0.71 with evidence 0.99, then the passage is excluded as an injection", () => {
    expect(routePassage({ relevant: 0.99, evidence: 0.99, contradicts: 0, injection: 0.71 })).toBe("injection");
  });
  it("given contradicts 0.8, then it is a conflict passage even with strong evidence", () => {
    expect(routePassage({ relevant: 0.9, evidence: 0.9, contradicts: 0.8, injection: 0 })).toBe("conflict");
  });
  it("given relevance 0.40, then it is excluded before evidence is read", () => {
    expect(routePassage({ relevant: 0.4, evidence: 0.99, contradicts: 0, injection: 0 })).toBe("exclude");
  });
  it("given max include evidence 0.72, then the answered band", () => {
    expect(decideBand([{ route: "include", evidence: 0.72 }, { route: "exclude", evidence: 0.1 }])).toBe("answered");
  });
  it("given max evidence 0.60, then the middle band", () => {
    expect(decideBand([{ route: "include", evidence: 0.6 }])).toBe("middle");
  });
  it("given every passage under 0.30 and no conflict, then unanswerable", () => {
    expect(decideBand([{ route: "exclude", evidence: 0.29 }, { route: "exclude", evidence: 0.05 }])).toBe("unanswerable");
  });
  it("given low evidence but a conflict passage, then the middle band, so the conflict can be explained", () => {
    expect(decideBand([{ route: "conflict", evidence: 0.2 }])).toBe("middle");
  });
});

describe("provisional line", () => {
  it("given coverage 0.05, then it shows; exactly 0.10 does not; no judgment does not", () => {
    expect([shouldShowProvisional(0.05), shouldShowProvisional(0.1), shouldShowProvisional(null)]).toStrictEqual([true, false, false]);
  });
});

describe("decideAfterCheck (middle band)", () => {
  const supported = { choice: "supports", confidence: 0.85 };
  it("given every cited claim supported at 0.85, then the answer is shown", () => {
    expect(decideAfterCheck([{ text: "You need finance above 5,000 AED.", cited: true, check: supported }])).toBe(true);
  });
  it("given one cited claim contradicted, then it is not", () => {
    expect(
      decideAfterCheck([
        { text: "A", cited: true, check: supported },
        { text: "B", cited: true, check: { choice: "contradicts", confidence: 0.9 } },
      ]),
    ).toBe(false);
  });
  it("given supports at only 0.79, then it is not", () => {
    expect(decideAfterCheck([{ text: "A", cited: true, check: { choice: "supports", confidence: 0.79 } }])).toBe(false);
  });
  it("given no citations at all, then it is not", () => {
    expect(decideAfterCheck([{ text: "The documents don't answer this.", cited: false, check: null }])).toBe(false);
  });
  it("given an uncited sentence of 61 characters beside a supported claim, then it is not", () => {
    expect(decideAfterCheck([{ text: "A", cited: true, check: supported }, { text: "x".repeat(61), cited: false, check: null }])).toBe(false);
  });
});

describe("fuseRrf", () => {
  it("given two ranked lists, then scores are the sums of 1/(60 + rank) with 1-based ranks, highest first", () => {
    expect(fuseRrf([["a", "b"], ["b", "c"]])).toStrictEqual([
      { key: "b", score: 1 / 62 + 1 / 61 },
      { key: "a", score: 1 / 61 },
      { key: "c", score: 1 / 62 },
    ]);
  });
});

describe("slugify", () => {
  it("given two initiatives with the same name, then their Jev slugs still differ", () => {
    expect(slugify(["Procurement rollout", "Procurement rollout", "New: timesheets!"])).toStrictEqual([
      "procurement_rollout",
      "procurement_rollout_2",
      "new_timesheets",
    ]);
  });
});

describe("sentences (Intl.Segmenter in workerd)", () => {
  it("given two sentences, then two pieces that join back to the input exactly", () => {
    const text = "Orders above 5,000 AED need Finance. Orders under it do not.";
    expect(splitSentences(text)).toStrictEqual(["Orders above 5,000 AED need Finance. ", "Orders under it do not."]);
  });
});

describe("chunkMarkdown (flow 3a)", () => {
  it("given headings, then each passage carries its full heading path and none crosses a heading", () => {
    const md = "# Policy\n\n## 2 Raising a PO\n\n### 2.2 Thresholds\n\nUp to 5,000 AED: line manager.\n\n## 3 After approval\n\nReleased automatically.";
    expect(chunkMarkdown(md)).toStrictEqual([
      { headingPath: "Policy > 2 Raising a PO > 2.2 Thresholds", locator: null, text: "Up to 5,000 AED: line manager.", position: 0 },
      { headingPath: "Policy > 3 After approval", locator: null, text: "Released automatically.", position: 1 },
    ]);
  });
  it("given a section longer than the target, then it splits between sentences and loses no text", () => {
    const sentence = "Every purchase over the limit needs a second approver in Ariba. ";
    const body = sentence.repeat(10).trim();
    const chunks = chunkMarkdown(`# A\n\n${body}`, 200);
    expect(chunks.every((c) => c.text.length <= 200)).toBe(true);
    expect(chunks.map((c) => c.text).join(" ")).toBe(body);
  });
  it("given slide headings, then the slide number becomes the locator", () => {
    expect(chunkMarkdown("# Slide 3: Email approvals\n\nNot accepted from 1 October.")[0]).toMatchObject({ locator: 3 });
  });
});

describe("pptxToMarkdown (flow 3a)", () => {
  const slide = (...paras: string[]) =>
    strToU8(`<p:sld><p:cSld><p:spTree>${paras.map((t) => `<a:p><a:r><a:t>${t}</a:t></a:r></a:p>`).join("")}</p:spTree></p:cSld></p:sld>`);
  it("given slides out of file order, then sections in slide order with decoded entities", () => {
    const pptx = zipSync({ "ppt/slides/slide10.xml": slide("Ten", "Last"), "ppt/slides/slide2.xml": slide("Two", "R&amp;D &lt;team&gt;") });
    expect(pptxToMarkdown(pptx)).toBe("# Slide 2: Two\n\nR&D <team>\n\n# Slide 10: Ten\n\nLast");
  });
  it("given slides with no text, then it fails as slides_no_text", () => {
    expect(() => pptxToMarkdown(zipSync({ "ppt/slides/slide1.xml": strToU8("<p:sld></p:sld>") }))).toThrow(
      "No text found on the slides. Friction reads slide text only, not images or speaker notes.",
    );
  });
});

describe("writeAnswer: Claude's streamed citations mapped to passages", () => {
  const source = (id: string, text: string): Retrieved => ({
    key: `document:${id}`, kind: "document", id, initiativeId: "i", text, title: "Policy", headingPath: "2.2 Thresholds", locator: null,
    documentId: "d", suspect: false, qaQuestion: null, qaApprovedByUserId: null, qaApprovedAt: null, fusedRank: 1, score: 1, cosine: 1, vectorRank: 1, textRank: 1,
  });
  const p1 = source("11111111-1111-4111-8111-111111111111", "Up to 5,000 AED needs the line manager.");
  const p2 = source("22222222-2222-4222-8222-222222222222", "Above 5,000 AED also needs Finance.");
  const cite = (s: Retrieved, index: number, cited: string) => ({
    type: "content_block_delta", index: 0,
    delta: { type: "citations_delta", citation: { type: "search_result_location", source: `ft://passage/${s.id}`, title: "Policy", cited_text: cited, search_result_index: index, start_block_index: 0, end_block_index: 1 } },
  });
  const recorded = [
    { type: "message_start", message: { usage: { input_tokens: 900 } } },
    { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
    { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "You only need your line manager." } },
    cite(p1, 0, "Up to 5,000 AED needs the line manager."),
    { type: "content_block_stop", index: 0 },
    { type: "content_block_start", index: 1, content_block: { type: "text", text: "" } },
    { type: "content_block_delta", index: 1, delta: { type: "text_delta", text: " Finance joins above 5,000 AED." } },
    { ...cite(p2, 1, "Above 5,000 AED also needs Finance."), index: 1 },
    { ...cite(p1, 0, "Up to 5,000 AED needs the line manager."), index: 1 },
    { type: "content_block_stop", index: 1 },
    { type: "message_delta", usage: { output_tokens: 20 } },
    { type: "message_stop" },
  ];
  const fakeEnv = (events: unknown[]) =>
    ({
      AI_GATEWAY_ID: "default",
      AI: { gateway: () => ({ run: async () => new Response(events.map((e) => `event: x\ndata: ${JSON.stringify(e)}\n\n`).join("")) }) },
    }) as unknown as Env;

  it("given two cited sentence groups, then one chip per distinct passage, numbered by first citation, placed after its group", async () => {
    const deltas: string[] = [];
    const w = await writeAnswer(fakeEnv(recorded), { system: "", messages: [], max_tokens: 10 }, [p1, p2], {
      onDelta: (t) => deltas.push(t),
      signal: new AbortController().signal,
      firstTokenMs: 1000,
    });
    expect(w.text).toBe("You only need your line manager. Finance joins above 5,000 AED.");
    expect(deltas).toStrictEqual(["You only need your line manager.", " Finance joins above 5,000 AED."]);
    expect(w.citations.map((c) => ({ index: c.index, id: c.source.id, quote: c.quote, charOffset: c.charOffset }))).toStrictEqual([
      { index: 1, id: p1.id, quote: "Up to 5,000 AED needs the line manager.", charOffset: 32 },
      { index: 2, id: p2.id, quote: "Above 5,000 AED also needs Finance.", charOffset: 63 },
    ]);
    expect(w.claims.map((c) => c.sourceKeys)).toStrictEqual([[p1.key], [p2.key, p1.key]]);
    expect(w.usage).toStrictEqual({ input: 900, output: 20 });
  });

  it("given a citation whose source is not recognised, then it maps by its search_result_index", async () => {
    const unknownSource = recorded.map((e) =>
      "delta" in e && (e.delta as { citation?: { search_result_index: number } }).citation?.search_result_index === 1
        ? { ...e, delta: { ...(e.delta as object), citation: { ...(e.delta as { citation: object }).citation, source: "ft://moved" } } }
        : e,
    );
    const w = await writeAnswer(fakeEnv(unknownSource), { system: "", messages: [], max_tokens: 10 }, [p1, p2], {
      signal: new AbortController().signal,
      firstTokenMs: 1000,
    });
    expect(w.citations.map((c) => c.source.id)).toStrictEqual([p1.id, p2.id]);
  });

  it("given an error event mid-stream, then writeAnswer rejects with the provider's message", async () => {
    const broken = [...recorded.slice(0, 3), { type: "error", error: { type: "overloaded_error", message: "Overloaded" } }];
    await expect(
      writeAnswer(fakeEnv(broken), { system: "", messages: [], max_tokens: 10 }, [p1], { signal: new AbortController().signal, firstTokenMs: 1000 }),
    ).rejects.toThrow("overloaded_error: Overloaded");
  });

  it("given a follow-up, then earlier turns precede the search results as alternating user and assistant messages", () => {
    const req = buildRequest({
      sources: [p1],
      conflictKeys: new Set(),
      event: { kind: "question", text: "And for 20,000?", appNames: [] },
      screenshot: null,
      priorTurns: [{ text: "Do I need finance for 3,000?", answer: "No, only your line manager." }],
    });
    expect(req.messages.map((m) => m.role)).toStrictEqual(["user", "assistant", "user"]);
    expect(req.messages[1]!.content).toBe("No, only your line manager.");
    const last = req.messages[2]!.content as Array<{ type: string; source?: string; text?: string }>;
    expect(last.map((b) => b.type)).toStrictEqual(["search_result", "text"]);
    expect(last[0]!.source).toBe(`ft://passage/${p1.id}`);
    expect(last[1]!.text).toBe("Question:\nAnd for 20,000?");
  });
});
