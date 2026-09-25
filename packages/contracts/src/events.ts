import * as z from "zod";
import { AuthId, Id, Instant } from "./primitives";
import { ResolutionClass } from "./concepts/resolution-class";

// Inngest event catalog. Names follow `ft/{noun}.{verb}`. Payloads are plain Zod (no transforms),
// so apps/api can wrap each one with Inngest's `eventType(name, { schema })`.
// Only `ft/system.ping` has a function in the shell; the rest are used from phase 05 on.

const OrgScoped = z.object({ organizationId: AuthId });

export const EVENT_CATALOG = {
  "ft/system.ping": z.object({ sentAt: Instant }),
  "ft/document.uploaded": OrgScoped.extend({ documentId: Id, documentVersionId: Id }),
  "ft/document.replaced": OrgScoped.extend({ documentId: Id, documentVersionId: Id, previousVersionId: Id }),
  "ft/document.removed": OrgScoped.extend({ documentId: Id }),
  "ft/document.ready": OrgScoped.extend({ documentId: Id, documentVersionId: Id, passageCount: z.int().nonnegative() }),
  "ft/event.answered": OrgScoped.extend({
    eventId: Id,
    kind: z.enum(["flag", "question"]),
    initiativeId: Id,
    answerId: Id,
    resolutionClass: ResolutionClass,
  }),
  "ft/event.still_stuck": OrgScoped.extend({ eventId: Id, kind: z.enum(["flag", "question"]), initiativeId: Id }),
  "ft/cluster.requested": OrgScoped.extend({ initiativeId: Id }),
  "ft/cluster.updated": OrgScoped.extend({ initiativeId: Id, clusterIds: z.array(Id) }),
  "ft/initiative.evidence_changed": OrgScoped.extend({ initiativeId: Id }),
  "ft/qa.published": OrgScoped.extend({ qaEntryId: Id, initiativeId: Id }),
  "ft/fix.recorded": OrgScoped.extend({ fixId: Id, insightId: Id }),
  "ft/capture.audio_received": OrgScoped.extend({ flagId: Id }),
} as const;

export type EventName = keyof typeof EVENT_CATALOG;
export const EVENT_NAMES = Object.keys(EVENT_CATALOG) as EventName[];
