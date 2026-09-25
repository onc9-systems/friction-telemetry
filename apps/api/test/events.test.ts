import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { FIXTURES, parseSSEEvent } from "@friction-telemetry/contracts";
import flagsJson from "@friction-telemetry/contracts/fixtures/flags.json";
import questionsJson from "@friction-telemetry/contracts/fixtures/questions.json";
import { collapsedOrder, parseFrames } from "./sse";

const flag = FIXTURES["flags.json"].parse(flagsJson)[0]!;
const question = FIXTURES["questions.json"].parse(questionsJson)[0]!;

const post = (body: string, headers: Record<string, string> = {}) =>
  exports.default.fetch("http://api.test/v1/events", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body,
  });

describe("POST /v1/events: invalid bodies", () => {
  it("given a flag missing its transcript, when posted, then 400 with an invalid_body error naming the field", async () => {
    const { transcript: _omit, ...rest } = flag;
    const res = await post(JSON.stringify(rest));
    expect(res.status).toBe(400);
    expect(res.headers.get("content-type")).toMatch(/^application\/json/);
    const body = (await res.json()) as { error: string; message: string };
    expect(body.error).toBe("invalid_body");
    expect(body.message).toContain("transcript");
  });

  it("given a flag with a misspelled resolution class, when posted, then 400", async () => {
    const res = await post(JSON.stringify({ ...flag, resolutionClass: "answerd" }));
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe("invalid_body");
  });

  it("given malformed JSON, when posted, then 400 with the same JSON error shape", async () => {
    const res = await post("{ not json");
    expect(res.status).toBe(400);
    expect(res.headers.get("content-type")).toMatch(/^application\/json/);
    const body = (await res.json()) as { error: string; message: string };
    expect(body.error).toBe("invalid_body");
    expect(body.message.length).toBeGreaterThan(0);
  });
});

describe("POST /v1/events: the answer stream stub", () => {
  const cases = [
    {
      name: "a flag with the default script",
      body: flag,
      headers: {},
      order: ["meta", "delta", "citation", "class", "count", "done"],
      resolutionClass: "answered",
      routed: false,
    },
    {
      name: "a flag with x-ft-stub-script: answered",
      body: flag,
      headers: { "x-ft-stub-script": "answered" },
      order: ["meta", "delta", "citation", "class", "count", "done"],
      resolutionClass: "answered",
      routed: false,
    },
    {
      name: "a question with x-ft-stub-script: provisional_routed",
      body: question,
      headers: { "x-ft-stub-script": "provisional_routed" },
      order: ["meta", "provisional", "delta", "class", "count", "done"],
      resolutionClass: "unanswerable",
      routed: true,
    },
  ] as const;

  for (const c of cases) {
    it(`given ${c.name}, when posted, then events stream in contract order and every payload is valid`, async () => {
      const res = await post(JSON.stringify(c.body), c.headers);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toMatch(/^text\/event-stream/);
      const frames = parseFrames(await res.text());

      expect(collapsedOrder(frames)).toStrictEqual(c.order);
      for (const f of frames) expect(() => parseSSEEvent(f.event, JSON.stringify(f.data))).not.toThrow();

      // meta carries the posted event's id, not the fixture placeholder.
      expect(frames[0]).toMatchObject({ event: "meta", data: { eventId: c.body.id } });
      expect(frames.find((f) => f.event === "class")?.data).toStrictEqual({ resolutionClass: c.resolutionClass, routed: c.routed });
      expect(frames.filter((f) => f.event === "done")).toHaveLength(1);
    });
  }

  it("given the answered script, then the deltas join into the full answer text", async () => {
    const frames = parseFrames(await (await post(JSON.stringify(flag))).text());
    const text = frames
      .filter((f) => f.event === "delta")
      .map((f) => (f.data as { text: string }).text)
      .join("");
    expect(text).toBe(
      "Approved POs release to the supplier automatically, so you don't need to call finance. If a PO shows Pending release for more than a day, open it and choose Request release.",
    );
  });
});
