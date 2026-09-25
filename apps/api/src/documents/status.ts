// Document rows as the initiative surface shows them (flow 3a). One query per set of documents.
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { DocumentFailureCode, DocumentStatus, DocumentVersionView } from "@friction-telemetry/contracts";
import type { Db, Tx } from "../db/client";
import { document, documentVersion, suspectMark } from "../db/schema";
import { SLOW_AFTER_MS } from "./files";

type VersionRow = typeof documentVersion.$inferSelect;

export function versionView(v: VersionRow, now = Date.now()): DocumentVersionView {
  const processing = v.status === "extracting" || v.status === "indexing" || v.status === "uploading";
  return {
    id: v.id,
    status: v.status,
    fileName: v.fileName,
    mimeType: v.mimeType,
    byteSize: v.byteSize,
    passageCount: v.passageCount,
    failureCode: (v.failureCode as DocumentFailureCode | null) ?? null,
    failureReason: v.failureReason,
    warning: v.warning,
    slow: processing && now - v.statusChangedAt.getTime() > SLOW_AFTER_MS,
    uploadedByUserId: v.uploadedByUserId,
    createdAt: v.createdAt.toISOString(),
  };
}

/** Status of every live (not removed) document in `documentIds`, or of every document of `initiativeId`. */
export async function documentStatuses(
  db: Db | Tx,
  organizationId: string,
  scope: { documentIds: string[] } | { initiativeId: string },
): Promise<DocumentStatus[]> {
  const docs = await db
    .select()
    .from(document)
    .where(
      and(
        eq(document.organizationId, organizationId),
        isNull(document.removedAt),
        "documentIds" in scope ? inArray(document.id, scope.documentIds) : eq(document.initiativeId, scope.initiativeId),
      ),
    )
    .orderBy(document.createdAt);
  if (docs.length === 0) return [];
  const ids = docs.map((d) => d.id);
  const versions = await db
    .select()
    .from(documentVersion)
    .where(inArray(documentVersion.documentId, ids))
    .orderBy(desc(documentVersion.createdAt));
  const reports = await db
    .select({ documentId: suspectMark.documentId, n: sql<number>`count(*)::int` })
    .from(suspectMark)
    .where(and(inArray(suspectMark.documentId, ids), isNull(suspectMark.clearedAt)))
    .groupBy(suspectMark.documentId);

  return docs.map((d) => {
    const mine = versions.filter((v) => v.documentId === d.id);
    const active = mine.find((v) => v.id === d.activeVersionId) ?? null;
    const newest = mine[0] ?? null;
    const pending = newest && newest.id !== d.activeVersionId ? newest : null;
    return {
      documentId: d.id,
      initiativeId: d.initiativeId,
      title: d.title,
      activeVersion: active ? versionView(active) : null,
      pendingVersion: pending ? versionView(pending) : null,
      suspect: d.suspect,
      suspectReports: reports.find((r) => r.documentId === d.id)?.n ?? 0,
    };
  });
}
