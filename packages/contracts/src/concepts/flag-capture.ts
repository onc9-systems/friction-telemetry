import * as z from "zod";
import { CAPTURE_PART_KIND, CAPTURE_PART_STATUS, TRANSCRIPT_STATUS, WINDOW_EVENT_REASON } from "../enums";
import { Id, Instant } from "../primitives";

// What the Mac captured for one Flag: the screen recording from the rolling buffer, the voice note, and the
// window timeline. Every instant is wall-clock UTC derived from one host clock on the Mac, so the video, the
// words, and the windows line up on a single timeline.

export const CapturePartKind = z.enum(CAPTURE_PART_KIND);
export type CapturePartKind = z.infer<typeof CapturePartKind>;
export const CapturePartStatus = z.enum(CAPTURE_PART_STATUS);
export type CapturePartStatus = z.infer<typeof CapturePartStatus>;
export const TranscriptStatus = z.enum(TRANSCRIPT_STATUS);
export type TranscriptStatus = z.infer<typeof TranscriptStatus>;
export const WindowEventReason = z.enum(WINDOW_EVENT_REASON);
export type WindowEventReason = z.infer<typeof WindowEventReason>;

/** The frontmost window changed: another app came forward, or the front window's title changed. */
export const WindowEvent = z.object({
  at: Instant,
  reason: WindowEventReason,
  appName: z.string(),
  bundleId: z.string().nullable(),
  /** Null when the app exposes no title. */
  windowTitle: z.string().nullable(),
});
export type WindowEvent = z.infer<typeof WindowEvent>;

/** One binary file of a capture, with the span of time it covers. */
export const CapturePartSpec = z.object({
  kind: CapturePartKind,
  contentType: z.string().min(1),
  byteSize: z.int().positive(),
  startedAt: Instant,
  endedAt: Instant,
});
export type CapturePartSpec = z.infer<typeof CapturePartSpec>;

/** The screen stream settings the video was recorded with. */
export const ScreenSettings = z.object({
  width: z.int().positive(),
  height: z.int().positive(),
  framesPerSecond: z.number().positive(),
});
export type ScreenSettings = z.infer<typeof ScreenSettings>;

/** Body of `POST /v1/captures`: registers a capture before its files upload. Idempotent on `flagId`. */
export const FlagCaptureManifest = z.object({
  flagId: Id,
  /** When the employee clicked the hand. */
  clickedAt: Instant,
  /** When the employee clicked send. */
  sentAt: Instant,
  /** Video is absent when screen recording is not permitted; audio is always present. */
  parts: z.array(CapturePartSpec).min(1),
  screen: ScreenSettings.nullable(),
  /** Frontmost-window changes in the captured span, oldest first. The first may predate the video. */
  windows: z.array(WindowEvent),
});
export type FlagCaptureManifest = z.infer<typeof FlagCaptureManifest>;

/** Reply to `POST /v1/captures`: where each part stands and how to upload what is missing. */
export const CaptureUploadPlan = z.object({
  flagId: Id,
  /** Bytes per multipart part. Every part but the last is exactly this size. */
  partSize: z.int().positive(),
  parts: z.array(z.object({ kind: CapturePartKind, uploadId: z.string().min(1), received: z.boolean() })),
});
export type CaptureUploadPlan = z.infer<typeof CaptureUploadPlan>;

/** Reply to one part upload; the client sends every one back to complete the file. */
export const UploadedPart = z.object({ partNumber: z.int().positive(), etag: z.string().min(1) });
export type UploadedPart = z.infer<typeof UploadedPart>;

export const CompleteCapturePart = z.object({ parts: z.array(UploadedPart).min(1) });
export type CompleteCapturePart = z.infer<typeof CompleteCapturePart>;

/** A transcribed word, placed on the capture's wall-clock timeline. */
export const TranscriptWord = z.object({
  word: z.string(),
  startedAt: Instant,
  endedAt: Instant,
  confidence: z.number(),
});
export type TranscriptWord = z.infer<typeof TranscriptWord>;

export const CapturePartState = CapturePartSpec.extend({
  status: CapturePartStatus,
  receivedAt: Instant.nullable(),
});
export type CapturePartState = z.infer<typeof CapturePartState>;

/** One row of the intake dashboard: what the cloud holds for a capture. */
export const FlagCaptureSummary = z.object({
  flagId: Id,
  clickedAt: Instant,
  sentAt: Instant,
  registeredAt: Instant,
  parts: z.array(CapturePartState),
  windowCount: z.int().nonnegative(),
  transcriptStatus: TranscriptStatus,
  transcript: z.string().nullable(),
  transcriptError: z.string().nullable(),
});
export type FlagCaptureSummary = z.infer<typeof FlagCaptureSummary>;

/** `GET /v1/captures/:flagId`: the summary plus the synced timelines. */
export const FlagCaptureDetail = FlagCaptureSummary.extend({
  screen: ScreenSettings.nullable(),
  windows: z.array(WindowEvent),
  words: z.array(TranscriptWord),
});
export type FlagCaptureDetail = z.infer<typeof FlagCaptureDetail>;
