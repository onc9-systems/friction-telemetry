import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as z from "zod";
import { FIXTURES, type FixtureName, ResolutionClass, SSE_PAYLOADS, type SSEEventName, parseSSEEvent } from "../src";

const dir = join(import.meta.dirname, "..", "fixtures");
const load = (name: string): unknown => JSON.parse(readFileSync(join(dir, name), "utf8"));

describe("fixtures", () => {
  it("given the fixtures folder, then every file is registered and every registered file exists", () => {
    const onDisk = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
    expect(onDisk).toStrictEqual(Object.keys(FIXTURES).sort());
  });

  for (const name of Object.keys(FIXTURES) as FixtureName[]) {
    it(`given ${name}, when parsed with its schema, then it is valid`, () => {
      const result = FIXTURES[name].safeParse(load(name));
      expect(result.success, result.success ? "" : z.prettifyError(result.error)).toBe(true);
    });
  }

  it("given a record item with a misspelled class, when parsed, then parsing fails naming the field", () => {
    const items = load("my-record.json") as Array<Record<string, unknown>>;
    const broken = [{ ...items[0], resolutionClass: "answerd" }];
    const result = FIXTURES["my-record.json"].safeParse(broken);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toStrictEqual([0, "resolutionClass"]);
  });

  it("given the enum members, then they are exactly the contract's three resolution classes", () => {
    expect(ResolutionClass.options).toStrictEqual(["answered", "unanswerable", "still_stuck"]);
  });
});

describe("answer stream scripts", () => {
  const scripts = ["stub-answered.json", "stub-provisional-routed.json"] as const;

  for (const name of scripts) {
    it(`given ${name}, then every step's payload parses as its event type`, () => {
      const steps = FIXTURES[name].parse(load(name));
      for (const step of steps) {
        expect(() => parseSSEEvent(step.event, JSON.stringify(step.data)), `${name} ${step.event}`).not.toThrow();
      }
    });

    it(`given ${name}, then events come in contract order`, () => {
      const steps = FIXTURES[name].parse(load(name));
      const order = steps.map((s) => s.event).filter((e, i, a) => e !== a[i - 1]);
      const expected: SSEEventName[] = name === "stub-answered.json"
        ? ["meta", "delta", "citation", "class", "count", "done"]
        : ["meta", "provisional", "delta", "class", "count", "done"];
      expect(order).toStrictEqual(expected);
    });
  }

  it("given an unknown event name, when parsed, then it throws", () => {
    expect(() => parseSSEEvent("answer", "{}")).toThrow(/Unknown answer stream event "answer"/);
  });

  it("given a citation with both a passage and a Q&A entry, when parsed, then it is rejected", () => {
    const both = { index: 1, quote: "q", documentTitle: "d", locator: null, passageId: "6f1c2d3e-4b5a-4c6d-8e7f-9a0b1c2d3e4f", qaEntryId: "6f1c2d3e-4b5a-4c6d-8e7f-9a0b1c2d3e4f" };
    expect(SSE_PAYLOADS.citation.safeParse(both).success).toBe(false);
  });
});
