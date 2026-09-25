import * as z from "zod";
import { Id, Instant } from "./primitives";
import { ResolutionClass } from "./concepts/resolution-class";
import { RecordRef } from "./concepts/question";

// The answer stream (flows 6, 7, 8): Server-Sent Events from `POST /v1/events` and
// `POST /v1/events/:id/initiative`. On the wire each event is `event: <name>` plus `data: <JSON payload>`;
// the payload does not repeat the name.
// Order: meta, (provisional), delta+, citation*, class, (count), done. Or `choose_initiative` alone.
// `error` replaces the tail only when even persistence failed.

export const InitiativeOption = z.object({ initiativeId: Id, name: z.string().min(1) });
export type InitiativeOption = z.infer<typeof InitiativeOption>;

export const MetaPayload = z.object({
  eventId: Id,
  initiativeId: Id,
  initiativeName: z.string(),
  /** How sure the service is that the event belongs to this initiative, 0 to 1. */
  initiativeConfidence: z.number().min(0).max(1),
  /** Friction picked the initiative and is only fairly sure: the chip offers `alternatives`. */
  switchable: z.boolean(),
  /** The employee's other live initiatives, by full name, when `switchable`. Empty otherwise. */
  alternatives: z.array(InitiativeOption),
  /** Name of the initiative the previous answer was for, after a switch. */
  switchedFrom: z.string().nullable(),
  /** Set when the event is a follow-up in a thread. */
  inReplyTo: RecordRef.nullable(),
});
/** Friction could not tell which initiative the flag is about. The stream ends after this, with no `done`. */
export const ChooseInitiativePayload = z.object({ options: z.array(InitiativeOption) });
export const ProvisionalPayload = z.object({ message: z.string().min(1) });
export const DeltaPayload = z.object({ text: z.string() });
export const CitationSourceKind = z.enum(["document", "qa"]);
export const CitationPayload = z
  .object({
    /** 1-based number shown on the chip. */
    index: z.int().positive(),
    /** The exact cited sentences. */
    quote: z.string().min(1),
    documentTitle: z.string().min(1),
    locator: z.string().nullable(),
    /** Answer text length at the end of the sentence group this citation supports: where the chip goes. */
    charOffset: z.int().nonnegative(),
    sourceKind: CitationSourceKind,
    /** "4 Purchase orders > 4.2 Approvals". Null for Q&A. */
    headingPath: z.string().nullable(),
    /** The whole passage (or the owner's answer), for "Open at passage". */
    passageText: z.string().min(1),
    /** The cited document is marked for review. */
    suspect: z.boolean(),
    qaApprovedByUserId: z.string().nullable(),
    qaApprovedAt: Instant.nullable(),
  })
  .and(
    z.xor([
      z.object({ passageId: Id, qaEntryId: z.null() }),
      z.object({ passageId: z.null(), qaEntryId: Id }),
    ]),
  );
export type CitationPayload = z.infer<typeof CitationPayload>;
export const ClassPayload = z.object({
  resolutionClass: ResolutionClass,
  /** The event went to the initiative's owners (Unanswerable, Still stuck). */
  routed: z.boolean(),
});
export const CountPayload = z.object({ othersCount: z.int().nonnegative() });
export const DonePayload = z.object({ answerId: Id });
export const ErrorPayload = z.object({ code: z.string().min(1), message: z.string().min(1) });

export const SSE_PAYLOADS = {
  meta: MetaPayload,
  choose_initiative: ChooseInitiativePayload,
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
