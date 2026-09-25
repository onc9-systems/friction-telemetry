// The one writer of `qa_entry_event`: flows 10 and 18 (cited in 06 or 07, owner_answer in 08, cluster in 09).
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { qaEntryEvent, type QA_LINK_SOURCE } from "../db/schema";
import type { RECORD_KIND } from "@friction-telemetry/contracts";

export type QALink = {
  organizationId: string;
  qaEntryId: string;
  eventId: string;
  eventKind: (typeof RECORD_KIND)[number];
  userId: string;
  source: (typeof QA_LINK_SOURCE)[number];
  /** Required for `owner_answer`: the owner who attached the event. */
  attachedByUserId?: string;
};

/**
 * Records that a flag or question asked a Q&A entry. Idempotent: linking the same event to the same
 * entry twice keeps the first link.
 */
export async function linkEventToQA(
  tx: PgDatabase<PgQueryResultHKT, Record<string, unknown>>,
  link: QALink,
): Promise<void> {
  if (link.source === "owner_answer" && !link.attachedByUserId) {
    throw new Error("An owner_answer link needs attachedByUserId");
  }
  await tx
    .insert(qaEntryEvent)
    .values({
      organizationId: link.organizationId,
      qaEntryId: link.qaEntryId,
      eventId: link.eventId,
      eventKind: link.eventKind,
      userId: link.userId,
      source: link.source,
      attachedByUserId: link.attachedByUserId ?? null,
    })
    .onConflictDoNothing();
}
