// Documents: flows 3 and 3a (attach and index), 4 (replace, remove), 19 (owner corrects a document).
//
// Upload is the raw file body (not multipart), streamed straight into R2 (spec 05):
//   POST /v1/initiatives/:id/documents   headers: Content-Length, Content-Type,
//        x-ft-file-name (URI-encoded), x-ft-document-id, x-ft-version-id (client UUIDs, so a retry is idempotent)
//   PUT  /v1/documents/:id               same headers minus x-ft-document-id: a new version of the document
import { Hono, type Context } from "hono";
import type { AppEnv } from "../auth/actor";
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, isNull, ne, sql } from "drizzle-orm";
import * as z from "zod";
import { Id } from "@friction-telemetry/contracts";
import { openDb, openFreshDb, withDb, type Db } from "../db/client";
import { document, documentVersion, initiative } from "../db/schema";
import { documentStatuses } from "../documents/status";
import {
  DOCUMENT_TYPES,
  FAILURE_REASON,
  MAX_DOCUMENT_BYTES,
  extensionOf,
  isDocumentExtension,
  r2KeyOf,
  rejectTooLarge,
  rejectWrongType,
  titleOf,
} from "../documents/files";
import { inngest } from "../inngest/client";
import { documentRemoved, documentUploaded } from "../inngest/events";
import { canManage, initiativeWithRoles } from "../initiatives/membership";
import { actorOf, apiError, type Actor } from "../lib/actor";

type C = Context<AppEnv>;

/** Reads and validates the upload headers. Returns an error response or the parsed upload. */
function readUpload(c: C) {
  const rawName = c.req.header("x-ft-file-name");
  const length = Number(c.req.header("content-length"));
  const versionId = Id.safeParse(c.req.header("x-ft-version-id"));
  if (!rawName) return apiError(c, 400, "invalid_body", "x-ft-file-name is required");
  if (!versionId.success) return apiError(c, 400, "invalid_body", "x-ft-version-id must be a UUID");
  if (!Number.isFinite(length) || length <= 0) return apiError(c, 400, "invalid_body", "Content-Length is required");
  const fileName = decodeURIComponent(rawName);
  const ext = extensionOf(fileName);
  if (!isDocumentExtension(ext)) return apiError(c, 415, "unsupported_type", rejectWrongType(fileName));
  if (length > MAX_DOCUMENT_BYTES) return apiError(c, 413, "too_large", rejectTooLarge(fileName, length));
  if (!c.req.raw.body) return apiError(c, 400, "invalid_body", "The request has no file body");
  return { fileName, ext, length, versionId: versionId.data, mimeType: DOCUMENT_TYPES[ext] };
}

/** Streams the body to R2, records the version, and queues indexing. */
async function storeVersion(
  c: C,
  db: Db,
  actor: Actor,
  target: { initiativeId: string; documentId: string; isNewDocument: boolean },
  upload: Exclude<ReturnType<typeof readUpload>, Response>,
  kind: "first" | "replace",
) {
  const r2Key = r2KeyOf(actor.organizationId, target.documentId, upload.versionId, upload.ext);
  // A put either stores the whole object or nothing, so no row exists for an abandoned upload.
  await c.env.FILES.put(r2Key, c.req.raw.body!, { httpMetadata: { contentType: upload.mimeType } });
  await db.transaction(async (tx) => {
    if (target.isNewDocument) {
      await tx
        .insert(document)
        .values({
          id: target.documentId,
          organizationId: actor.organizationId,
          initiativeId: target.initiativeId,
          title: titleOf(upload.fileName),
        })
        .onConflictDoNothing();
    }
    await tx
      .insert(documentVersion)
      .values({
        id: upload.versionId,
        organizationId: actor.organizationId,
        documentId: target.documentId,
        r2Key,
        mimeType: upload.mimeType,
        byteSize: upload.length,
        fileName: upload.fileName,
        uploadedByUserId: actor.userId,
        status: "extracting",
      })
      .onConflictDoNothing();
  });
  await queueIndexing(db, actor, target.documentId, upload.versionId, kind);
  const [status] = await documentStatuses(db, actor.organizationId, { documentIds: [target.documentId] });
  return c.json(status!, 201);
}

/** Queues flow 3a. If Inngest refuses, the row says "Processing didn't start. Retry." instead of spinning forever. */
async function queueIndexing(db: Db, actor: Actor, documentId: string, versionId: string, kind: "first" | "replace" | "retry") {
  try {
    await inngest.send(
      documentUploaded.create({ organizationId: actor.organizationId, documentId, documentVersionId: versionId, kind }, { id: versionId }),
    );
  } catch (err) {
    console.error(JSON.stringify({ msg: "inngest_send_failed", event: "ft/document.uploaded", versionId, error: String(err) }));
    await db
      .update(documentVersion)
      .set({ status: "failed", failureCode: "not_started", failureReason: FAILURE_REASON.not_started, statusChangedAt: new Date() })
      .where(eq(documentVersion.id, versionId));
  }
}

/** The document, its initiative, and whether the caller may manage it. */
async function loadDocument(db: Db, actor: Actor, documentId: string) {
  const [doc] = await db
    .select()
    .from(document)
    .where(and(eq(document.id, documentId), eq(document.organizationId, actor.organizationId), isNull(document.removedAt)));
  if (!doc) return null;
  const access = await initiativeWithRoles(db, actor, doc.initiativeId);
  return access ? { doc, ...access } : null;
}

const pendingVersion = (db: Db, documentId: string) =>
  db
    .select()
    .from(documentVersion)
    .where(eq(documentVersion.documentId, documentId))
    .orderBy(desc(documentVersion.createdAt))
    .limit(1)
    .then((rows) => rows[0]);

const isProcessing = (status: string) => status === "extracting" || status === "indexing" || status === "uploading";

const documents = new Hono<AppEnv>()
  // Flow 3a: attach a document to an initiative.
  .post("/initiatives/:id/documents", async (c) => {
    const actor = actorOf(c);
    const upload = readUpload(c);
    if (upload instanceof Response) return upload;
    const documentId = Id.safeParse(c.req.header("x-ft-document-id"));
    if (!documentId.success) return apiError(c, 400, "invalid_body", "x-ft-document-id must be a UUID");
    return withDb(openDb(c.env), async (db) => {
      const access = await initiativeWithRoles(db, actor, c.req.param("id"));
      if (!access) return apiError(c, 404, "not_found", "No such initiative");
      if (!canManage(access.roles)) return apiError(c, 403, "not_leader", "You no longer have permission to edit initiatives.");
      if (access.initiative.status === "closed") return apiError(c, 409, "closed_initiative", "This initiative is closed.");
      return storeVersion(c, db, actor, { initiativeId: access.initiative.id, documentId: documentId.data, isNewDocument: true }, upload, "first");
    });
  })
  // Flows 4 and 19: replace a document with a new version. The version in use answers until the new one is ready.
  .put("/documents/:id", async (c) => {
    const actor = actorOf(c);
    const upload = readUpload(c);
    if (upload instanceof Response) return upload;
    return withDb(openDb(c.env), async (db) => {
      const found = await loadDocument(db, actor, c.req.param("id"));
      if (!found) return apiError(c, 404, "not_found", "No such document");
      if (!canManage(found.roles)) return apiError(c, 403, "not_leader", "You no longer have permission to edit initiatives.");
      const pending = await pendingVersion(db, found.doc.id);
      if (pending && pending.id !== upload.versionId && isProcessing(pending.status)) {
        return apiError(c, 409, "still_processing", "Still processing");
      }
      return storeVersion(c, db, actor, { initiativeId: found.doc.initiativeId, documentId: found.doc.id, isNewDocument: false }, upload, "replace");
    });
  })
  // Flow 3a: reprocess a failed version's file (no new upload).
  .post("/documents/:id/retry", async (c) => {
    const actor = actorOf(c);
    return withDb(openDb(c.env), async (db) => {
      const found = await loadDocument(db, actor, c.req.param("id"));
      if (!found) return apiError(c, 404, "not_found", "No such document");
      if (!canManage(found.roles)) return apiError(c, 403, "not_leader", "You no longer have permission to edit initiatives.");
      const last = await pendingVersion(db, found.doc.id);
      if (!last || last.status !== "failed") return apiError(c, 409, "not_failed", "Only a failed document can be retried.");
      // A new version over the same object: idempotency is per version, so re-sending the old one would be dropped.
      const versionId = crypto.randomUUID();
      await db.insert(documentVersion).values({
        id: versionId,
        organizationId: actor.organizationId,
        documentId: found.doc.id,
        r2Key: last.r2Key,
        mimeType: last.mimeType,
        byteSize: last.byteSize,
        fileName: last.fileName,
        uploadedByUserId: last.uploadedByUserId,
        status: "extracting",
      });
      await queueIndexing(db, actor, found.doc.id, versionId, "retry");
      const [status] = await documentStatuses(db, actor.organizationId, { documentIds: [found.doc.id] });
      return c.json(status!, 202);
    });
  })
  .patch(
    "/documents/:id",
    zValidator("json", z.object({ title: z.string().trim().min(1) }), (r, c) =>
      r.success ? undefined : apiError(c, 400, "invalid_body", z.prettifyError(r.error)),
    ),
    async (c) => {
      const actor = actorOf(c);
      return withDb(openDb(c.env), async (db) => {
        const found = await loadDocument(db, actor, c.req.param("id"));
        if (!found) return apiError(c, 404, "not_found", "No such document");
        if (!canManage(found.roles)) return apiError(c, 403, "not_leader", "You no longer have permission to edit initiatives.");
        await db.update(document).set({ title: c.req.valid("json").title }).where(eq(document.id, found.doc.id));
        const [status] = await documentStatuses(db, actor.organizationId, { documentIds: [found.doc.id] });
        return c.json(status!);
      });
    },
  )
  // Flow 4: remove. Its passages leave search in the same statement; answers keep their copied quotes.
  .delete("/documents/:id", async (c) => {
    const actor = actorOf(c);
    return withDb(openDb(c.env), async (db) => {
      const found = await loadDocument(db, actor, c.req.param("id"));
      if (!found) return apiError(c, 404, "not_found", "No such document");
      if (!canManage(found.roles)) return apiError(c, 403, "not_leader", "You no longer have permission to edit initiatives.");
      const refused = await db.transaction(async (tx) => {
        if (found.initiative.status === "live" && found.doc.activeVersionId) {
          const [others] = await tx
            .select({ n: sql<number>`count(*)::int` })
            .from(document)
            .innerJoin(initiative, eq(initiative.id, document.initiativeId))
            .where(
              and(
                eq(document.initiativeId, found.doc.initiativeId),
                ne(document.id, found.doc.id),
                isNull(document.removedAt),
                sql`${document.activeVersionId} is not null`,
              ),
            );
          if ((others?.n ?? 0) === 0) return true;
        }
        await tx.update(document).set({ removedAt: new Date() }).where(eq(document.id, found.doc.id));
        return false;
      });
      if (refused) {
        return apiError(
          c,
          409,
          "last_ready_document",
          "A live initiative needs one ready document. Upload a replacement first, or close the initiative.",
        );
      }
      await inngest
        .send(documentRemoved.create({ organizationId: actor.organizationId, documentId: found.doc.id }))
        .catch((err) => console.error(JSON.stringify({ msg: "inngest_send_failed", event: "ft/document.removed", error: String(err) })));
      return c.body(null, 204);
    });
  })
  // Flow 3a: polled every 2 s while processing. Reads bypass the Hyperdrive cache so state changes show at once.
  .get("/documents/:id/status", async (c) => {
    const actor = actorOf(c);
    return withDb(openFreshDb(c.env), async (db) => {
      const found = await loadDocument(db, actor, c.req.param("id"));
      if (!found) return apiError(c, 404, "not_found", "No such document");
      const [status] = await documentStatuses(db, actor.organizationId, { documentIds: [found.doc.id] });
      return c.json(status!);
    });
  });

export default documents;
