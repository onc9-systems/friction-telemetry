// Flag capture intake (flow 6, the evidence half): the Mac registers a capture, uploads its video and audio
// to R2 in multipart parts, and completes each file. The intake dashboard reads what arrived.
import { Hono, type Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, inArray } from "drizzle-orm";
import * as z from "zod";
import {
  type ApiError,
  CapturePartKind,
  type CaptureUploadPlan,
  CompleteCapturePart,
  FlagCaptureManifest,
  Id,
  type UploadedPart,
} from "@friction-telemetry/contracts";
import { openDb, type Db } from "../db/client";
import { flagCapture, flagCapturePart } from "../db/schema";
import { PART_SIZE, partKey, toDetail, toSummary } from "../captures/summary";
import { inngest } from "../inngest/client";
import { captureAudioReceived } from "../inngest/events";
import type { AppEnv } from "../auth/actor";

type Ctx = Context<AppEnv>;

const invalid = (c: Context, message: string) => c.json({ error: "invalid_body", message } satisfies ApiError, 400);
const notFound = (c: Context, message: string) => c.json({ error: "not_found", message } satisfies ApiError, 404);

/** One database connection for the request, closed after the response. */
async function withDb<T>(c: Ctx, fn: (db: Db) => Promise<T>): Promise<T> {
  const db = await openDb(c.env);
  try {
    return await fn(db);
  } finally {
    c.executionCtx.waitUntil(db.$client.end());
  }
}

const FlagId = Id.transform((id) => id.toLowerCase());
const PartParams = z.object({ flagId: FlagId, kind: CapturePartKind });
const PartNumberParams = PartParams.extend({ partNumber: z.coerce.number().int().min(1).max(10_000) });
const paramError = (result: { success: true } | { success: false; error: z.core.$ZodError }, c: Context) =>
  result.success ? undefined : invalid(c, z.prettifyError(result.error));

async function loadPart(db: Db, organizationId: string, flagId: string, kind: CapturePartKind) {
  const [row] = await db
    .select()
    .from(flagCapturePart)
    .where(and(eq(flagCapturePart.flagId, flagId), eq(flagCapturePart.kind, kind), eq(flagCapturePart.organizationId, organizationId)));
  return row;
}

/** Queues transcription; a queue failure is recorded on the capture so the dashboard shows it. */
async function queueTranscription(db: Db, organizationId: string, flagId: string) {
  try {
    await inngest.send(captureAudioReceived.create({ organizationId, flagId }));
    await db.update(flagCapture).set({ transcriptStatus: "waiting", transcriptError: null }).where(eq(flagCapture.flagId, flagId));
  } catch (err) {
    const message = `Couldn't queue transcription: ${err instanceof Error ? err.message : String(err)}`;
    await db.update(flagCapture).set({ transcriptStatus: "failed", transcriptError: message }).where(eq(flagCapture.flagId, flagId));
  }
}

const captures = new Hono<AppEnv>()
  .post(
    "/captures",
    zValidator("json", FlagCaptureManifest, (result, c) => paramError(result, c)),
    async (c) => {
      // Postgres prints uuids in lowercase; the R2 key must use the same spelling or reads miss it.
      const body = c.req.valid("json");
      const manifest = { ...body, flagId: body.flagId.toLowerCase() };
      const kinds = manifest.parts.map((p) => p.kind);
      if (new Set(kinds).size !== kinds.length) return invalid(c, "Each part kind may appear once.");
      if (!kinds.includes("video") || !kinds.includes("audio")) return invalid(c, "A capture needs its video and audio parts.");
      const { organizationId, userId } = c.var.actor;

      const plan = await withDb(c, async (db) => {
        const existing = await db.select().from(flagCapturePart).where(eq(flagCapturePart.flagId, manifest.flagId));
        const missing = manifest.parts.filter((p) => !existing.some((e) => e.kind === p.kind));
        const created = await Promise.all(
          missing.map(async (p) => {
            const key = partKey(organizationId, manifest.flagId, p.kind);
            const upload = await c.env.FILES.createMultipartUpload(key, { httpMetadata: { contentType: p.contentType } });
            return { ...p, r2Key: key, uploadId: upload.uploadId };
          }),
        );
        await db.transaction(async (tx) => {
          await tx
            .insert(flagCapture)
            .values({
              flagId: manifest.flagId,
              organizationId,
              userId,
              clickedAt: new Date(manifest.clickedAt),
              sentAt: new Date(manifest.sentAt),
              screen: manifest.screen,
              windows: manifest.windows,
            })
            .onConflictDoNothing();
          if (created.length) {
            await tx.insert(flagCapturePart).values(
              created.map((p) => ({
                flagId: manifest.flagId,
                kind: p.kind,
                organizationId,
                r2Key: p.r2Key,
                contentType: p.contentType,
                byteSize: p.byteSize,
                startedAt: new Date(p.startedAt),
                endedAt: new Date(p.endedAt),
                uploadId: p.uploadId,
              })),
            );
          }
        });
        const parts = [...existing, ...created.map((p) => ({ kind: p.kind, uploadId: p.uploadId, status: "uploading" as const }))];
        return {
          flagId: manifest.flagId,
          partSize: PART_SIZE,
          parts: parts.map((p) => ({ kind: p.kind, uploadId: p.uploadId, received: p.status === "received" })),
        } satisfies CaptureUploadPlan;
      });
      return c.json(plan, 200);
    },
  )
  .put(
    "/captures/:flagId/parts/:kind/:partNumber",
    zValidator("param", PartNumberParams, (result, c) => paramError(result, c)),
    async (c) => {
      const { flagId, kind, partNumber } = c.req.valid("param");
      const length = Number(c.req.header("content-length") ?? "NaN");
      if (!c.req.raw.body || !Number.isFinite(length) || length < 1) return invalid(c, "A part needs a body with a Content-Length.");
      if (length > PART_SIZE) return invalid(c, `A part is at most ${PART_SIZE} bytes.`);
      const part = await withDb(c, (db) => loadPart(db, c.var.actor.organizationId, flagId, kind));
      if (!part) return notFound(c, `No ${kind} part registered for capture ${flagId}.`);
      const upload = c.env.FILES.resumeMultipartUpload(part.r2Key, part.uploadId);
      const uploaded = await upload.uploadPart(partNumber, c.req.raw.body);
      return c.json({ partNumber: uploaded.partNumber, etag: uploaded.etag } satisfies UploadedPart, 200);
    },
  )
  .post(
    "/captures/:flagId/parts/:kind/complete",
    zValidator("param", PartParams, (result, c) => paramError(result, c)),
    zValidator("json", CompleteCapturePart, (result, c) => paramError(result, c)),
    async (c) => {
      const { flagId, kind } = c.req.valid("param");
      const { parts } = c.req.valid("json");
      return withDb(c, async (db) => {
        const part = await loadPart(db, c.var.actor.organizationId, flagId, kind);
        if (!part) return notFound(c, `No ${kind} part registered for capture ${flagId}.`);
        if (part.status !== "received") {
          const upload = c.env.FILES.resumeMultipartUpload(part.r2Key, part.uploadId);
          const object = await upload.complete([...parts].sort((a, b) => a.partNumber - b.partNumber));
          if (object.size !== part.byteSize) {
            return c.json({ error: "size_mismatch", message: `Stored ${object.size} bytes, expected ${part.byteSize}.` } satisfies ApiError, 422);
          }
          await db
            .update(flagCapturePart)
            .set({ status: "received", receivedAt: new Date() })
            .where(and(eq(flagCapturePart.flagId, flagId), eq(flagCapturePart.kind, kind)));
          if (kind === "audio") await queueTranscription(db, c.var.actor.organizationId, flagId);
        }
        const [capture] = await db.select().from(flagCapture).where(eq(flagCapture.flagId, flagId));
        const all = await db.select().from(flagCapturePart).where(eq(flagCapturePart.flagId, flagId));
        return c.json(toSummary(capture!, all), 200);
      });
    },
  )
  .get(
    "/captures/:flagId/parts/:kind/content",
    zValidator("param", PartParams, (result, c) => paramError(result, c)),
    async (c) => {
      const { flagId, kind } = c.req.valid("param");
      const part = await withDb(c, (db) => loadPart(db, c.var.actor.organizationId, flagId, kind));
      if (part?.status !== "received") return notFound(c, `No received ${kind} for capture ${flagId}.`);
      // Players seek with Range requests; R2 reads the range straight from the request headers.
      const object = await c.env.FILES.get(part.r2Key, { range: c.req.raw.headers });
      if (!object) return notFound(c, `The ${kind} file for capture ${flagId} is missing from storage.`);
      const headers = new Headers({ "accept-ranges": "bytes", etag: object.httpEtag, "content-type": part.contentType });
      const range = object.range as { offset?: number; length?: number; suffix?: number } | undefined;
      if (!c.req.header("range") || !range) {
        headers.set("content-length", String(object.size));
        return new Response(object.body, { status: 200, headers });
      }
      const offset = range.suffix !== undefined ? object.size - range.suffix : (range.offset ?? 0);
      const length = range.suffix ?? range.length ?? object.size - offset;
      headers.set("content-range", `bytes ${offset}-${offset + length - 1}/${object.size}`);
      headers.set("content-length", String(length));
      return new Response(object.body, { status: 206, headers });
    },
  )
  .post(
    "/captures/:flagId/transcribe",
    zValidator("param", z.object({ flagId: FlagId }), (result, c) => paramError(result, c)),
    async (c) => {
      const { flagId } = c.req.valid("param");
      return withDb(c, async (db) => {
        const audio = await loadPart(db, c.var.actor.organizationId, flagId, "audio");
        if (audio?.status !== "received") return notFound(c, `Capture ${flagId} has no received audio.`);
        await queueTranscription(db, c.var.actor.organizationId, flagId);
        return c.body(null, 202);
      });
    },
  )
  .get("/captures", async (c) =>
    withDb(c, async (db) => {
      const rows = await db
        .select()
        .from(flagCapture)
        .where(eq(flagCapture.organizationId, c.var.actor.organizationId))
        .orderBy(desc(flagCapture.registeredAt))
        .limit(100);
      const parts = rows.length
        ? await db.select().from(flagCapturePart).where(inArray(flagCapturePart.flagId, rows.map((r) => r.flagId)))
        : [];
      return c.json(rows.map((r) => toSummary(r, parts.filter((p) => p.flagId === r.flagId))), 200);
    }),
  )
  .get(
    "/captures/:flagId",
    zValidator("param", z.object({ flagId: FlagId }), (result, c) => paramError(result, c)),
    async (c) => {
      const { flagId } = c.req.valid("param");
      return withDb(c, async (db) => {
        const [capture] = await db
          .select()
          .from(flagCapture)
          .where(and(eq(flagCapture.flagId, flagId), eq(flagCapture.organizationId, c.var.actor.organizationId)));
        if (!capture) return notFound(c, `No capture ${flagId}.`);
        const parts = await db.select().from(flagCapturePart).where(eq(flagCapturePart.flagId, flagId));
        return c.json(toDetail(capture, parts), 200);
      });
    },
  );

export default captures;
