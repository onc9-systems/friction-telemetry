import * as z from "zod";
import { Id } from "./primitives";
import { ResolutionClass } from "./concepts/resolution-class";

// The answer stream (flows 6, 7, 8): Server-Sent Events from `POST /v1/events`.
// On the wire each event is `event: <name>` plus `data: <JSON payload>`; the payload does not repeat the name.
// Order: meta, (provisional), delta+, citation*, class, count, done. `error` can replace the tail.

export const MetaPayload = z.object({
  eventId: Id,
  initiativeId: Id,
  initiativeName: z.string(),
  /** How sure the service is that the event belongs to this initiative, 0 to 1. */
  initiativeConfidence: z.number().min(0).max(1),
});
export const ProvisionalPayload = z.object({ message: z.string().min(1) });
export const DeltaPayload = z.object({ text: z.string() });
export const CitationPayload = z
  .object({
    /** 1-based number shown on the chip. */
    index: z.int().positive(),
    quote: z.string().min(1),
    documentTitle: z.string().min(1),
    locator: z.string().nullable(),
  })
  .and(
    z.xor([
      z.object({ passageId: Id, qaEntryId: z.null() }),
      z.object({ passageId: z.null(), qaEntryId: Id }),
    ]),
  );
export const ClassPayload = z.object({ resolutionClass: ResolutionClass });
export const CountPayload = z.object({ othersCount: z.int().nonnegative() });
export const DonePayload = z.object({ answerId: Id });
export const ErrorPayload = z.object({ code: z.string().min(1), message: z.string().min(1) });

export const SSE_PAYLOADS = {
  meta: MetaPayload,
  provisional: ProvisionalPayload,
  delta: DeltaPayload,
  citation: CitationPayload,
  class: ClassPayload,
  count: CountPayload,
  done: DonePayload,
  error: ErrorPayload,
} as const;

export type SSEEventName = keyof typeof SSE_PAYLOADS;
export const SSE_EVENT_NAMES = Object.keys(SSE_PAYLOADS) as SSEEventName[];

export type SSEEvent = {
  [K in SSEEventName]: { event: K; data: z.infer<(typeof SSE_PAYLOADS)[K]> };
}[SSEEventName];

/** Parses one wire event (`event` name plus JSON `data` text) into a typed event. */
export function parseSSEEvent(event: string, data: string): SSEEvent {
  if (!(event in SSE_PAYLOADS)) throw new Error(`Unknown answer stream event "${event}"`);
  const name = event as SSEEventName;
  return { event: name, data: SSE_PAYLOADS[name].parse(JSON.parse(data)) } as SSEEvent;
}

/** A scripted stream step: the event plus how long to wait before sending it. Used by the shell's stub and fixtures. */
export const ScriptStep = z.object({
  delayMs: z.int().nonnegative(),
  event: z.enum(SSE_EVENT_NAMES as [SSEEventName, ...SSEEventName[]]),
  data: z.record(z.string(), z.unknown()),
});
export type ScriptStep = z.infer<typeof ScriptStep>;
