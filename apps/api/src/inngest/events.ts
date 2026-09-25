// Typed Inngest events built from the contracts' catalog. The contracts stay free of the inngest dependency;
// the payload schemas live there, the eventType wrappers live here.
import { eventType } from "inngest";
import { EVENT_CATALOG } from "@friction-telemetry/contracts";

export const systemPing = eventType("ft/system.ping", { schema: EVENT_CATALOG["ft/system.ping"] });
export const documentUploaded = eventType("ft/document.uploaded", { schema: EVENT_CATALOG["ft/document.uploaded"] });
export const documentReplaced = eventType("ft/document.replaced", { schema: EVENT_CATALOG["ft/document.replaced"] });
export const documentRemoved = eventType("ft/document.removed", { schema: EVENT_CATALOG["ft/document.removed"] });
export const documentReady = eventType("ft/document.ready", { schema: EVENT_CATALOG["ft/document.ready"] });
export const eventAnswered = eventType("ft/event.answered", { schema: EVENT_CATALOG["ft/event.answered"] });
export const eventStillStuck = eventType("ft/event.still_stuck", { schema: EVENT_CATALOG["ft/event.still_stuck"] });
export const clusterRequested = eventType("ft/cluster.requested", { schema: EVENT_CATALOG["ft/cluster.requested"] });
export const clusterUpdated = eventType("ft/cluster.updated", { schema: EVENT_CATALOG["ft/cluster.updated"] });
export const initiativeEvidenceChanged = eventType("ft/initiative.evidence_changed", {
  schema: EVENT_CATALOG["ft/initiative.evidence_changed"],
});
export const qaPublished = eventType("ft/qa.published", { schema: EVENT_CATALOG["ft/qa.published"] });
export const fixRecorded = eventType("ft/fix.recorded", { schema: EVENT_CATALOG["ft/fix.recorded"] });
export const captureAudioReceived = eventType("ft/capture.audio_received", { schema: EVENT_CATALOG["ft/capture.audio_received"] });
