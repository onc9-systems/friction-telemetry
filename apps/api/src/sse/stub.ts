// Scripted answer streams for the shell (flows 6, 7, 8). Phase 06 replaces them with the real pipeline.
// The scripts are the contracts' fixtures, so the Mac, the Swift tests, and this stub share one source.
import * as z from "zod";
import { ScriptStep, parseSSEEvent, type SSEEvent } from "@friction-telemetry/contracts";
import answered from "@friction-telemetry/contracts/fixtures/stub-answered.json";
import provisionalRouted from "@friction-telemetry/contracts/fixtures/stub-provisional-routed.json";

export const STUB_SCRIPT_NAMES = ["answered", "provisional_routed"] as const;
export type StubScriptName = (typeof STUB_SCRIPT_NAMES)[number];

const SCRIPTS: Record<StubScriptName, ScriptStep[]> = {
  answered: z.array(ScriptStep).parse(answered),
  provisional_routed: z.array(ScriptStep).parse(provisionalRouted),
};

/** A step ready to write: the typed event and the delay before it, in milliseconds at pace 1. */
export type StubStep = SSEEvent & { delayMs: number };

/** `x-ft-stub-script` header to script. Anything other than `provisional_routed` gets the default, `answered`. */
export function scriptNameFromHeader(header: string | undefined): StubScriptName {
  return header === "provisional_routed" ? "provisional_routed" : "answered";
}

/** `STUB_PACE` var to a delay multiplier. Missing or invalid means realistic pacing (1). */
export function stubPace(raw: string | undefined): number {
  const pace = Number(raw);
  return raw === undefined || raw === "" || !Number.isFinite(pace) || pace < 0 ? 1 : pace;
}

/**
 * The chosen script for one posted flag or question. `meta.eventId` becomes the posted body's id,
 * and every payload is parsed against its contract type before it is written.
 */
export function buildStubScript(name: StubScriptName, eventId: string): StubStep[] {
  return SCRIPTS[name].map((step) => {
    const data = step.event === "meta" ? { ...step.data, eventId } : step.data;
    return { ...parseSSEEvent(step.event, JSON.stringify(data)), delayMs: step.delayMs };
  });
}
