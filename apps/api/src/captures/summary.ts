import { CAPTURE_PART_KIND, type FlagCaptureDetail, type FlagCaptureSummary } from "@friction-telemetry/contracts";
import type { flagCapture, flagCapturePart } from "../db/schema";

type CaptureRow = typeof flagCapture.$inferSelect;
type PartRow = typeof flagCapturePart.$inferSelect;

/** Bytes per multipart part. R2 needs at least 5 MiB for every part but the last; Workers take 100 MB per request. */
export const PART_SIZE = 8 * 1024 * 1024;

export const partKey = (organizationId: string, flagId: string, kind: string) =>
  `captures/${organizationId}/${flagId}/${kind}.${kind === "video" ? "mp4" : "m4a"}`;

const order = (a: PartRow, b: PartRow) => CAPTURE_PART_KIND.indexOf(a.kind) - CAPTURE_PART_KIND.indexOf(b.kind);

export function toSummary(capture: CaptureRow, parts: PartRow[]): FlagCaptureSummary {
  return {
    flagId: capture.flagId,
    clickedAt: capture.clickedAt.toISOString(),
    sentAt: capture.sentAt.toISOString(),
    registeredAt: capture.registeredAt.toISOString(),
    parts: [...parts].sort(order).map((p) => ({
      kind: p.kind,
      contentType: p.contentType,
      byteSize: p.byteSize,
      startedAt: p.startedAt.toISOString(),
      endedAt: p.endedAt.toISOString(),
      status: p.status,
      receivedAt: p.receivedAt?.toISOString() ?? null,
    })),
    windowCount: capture.windows.length,
    transcriptStatus: capture.transcriptStatus,
    transcript: capture.transcript,
    transcriptError: capture.transcriptError,
  };
}

export function toDetail(capture: CaptureRow, parts: PartRow[]): FlagCaptureDetail {
  return { ...toSummary(capture, parts), screen: capture.screen, windows: capture.windows, words: capture.transcriptWords ?? [] };
}
