import * as z from "zod";
import { RECORD_KIND } from "../enums";
import { CalendarDate, Id, Instant } from "../primitives";
import { DocumentVersionStatus } from "./document";
import { Initiative, InitiativeMember } from "./initiative";
import { ResolutionClass } from "./resolution-class";
import { Thesis } from "./thesis";

// View models for the initiative surface (flows 3, 3a, 4, 5, 8, 9). Service-computed, read-only.

/** Why a document version failed. The Mac shows `failureReason` verbatim; the code is for logic. */
export const DOCUMENT_FAILURE_CODE = [
  "no_text",
  "password",
  "slides_no_text",
  "unreadable",
  "not_started",
  "transient_exhausted",
] as const;
export const DocumentFailureCode = z.enum(DOCUMENT_FAILURE_CODE);
export type DocumentFailureCode = z.infer<typeof DocumentFailureCode>;

export const DocumentVersionView = z.object({
  id: Id,
  status: DocumentVersionStatus,
  /** The uploaded file's name, with its extension. */
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  byteSize: z.int().nonnegative(),
  passageCount: z.int().nonnegative().nullable(),
  failureCode: DocumentFailureCode.nullable(),
  failureReason: z.string().nullable(),
  /** Ready with warnings: "12 of 40 pages had no readable text and are not searchable." */
  warning: z.string().nullable(),
  /** Processing has run longer than usual; offer Retry. */
  slow: z.boolean(),
  uploadedByUserId: z.string(),
  createdAt: Instant,
});
export type DocumentVersionView = z.infer<typeof DocumentVersionView>;

/** One document row, `GET /v1/documents/:id/status` and inside initiative detail. */
export const DocumentStatus = z.object({
  documentId: Id,
  initiativeId: Id,
  title: z.string().min(1),
  /** The version search uses. Null until the first version is ready. */
  activeVersion: DocumentVersionView.nullable(),
  /** The newest version when it is not the active one (processing, replacing, or failed). */
  pendingVersion: DocumentVersionView.nullable(),
  /** Marked for review after a Still stuck (flow 9). */
  suspect: z.boolean(),
  /** Still stuck reports that marked it. */
  suspectReports: z.int().nonnegative(),
});
export type DocumentStatus = z.infer<typeof DocumentStatus>;

export const InitiativeListItem = Initiative.extend({
  ownerUserIds: z.array(z.string()),
  affectedCount: z.int().nonnegative(),
  documentsTotal: z.int().nonnegative(),
  documentsReady: z.int().nonnegative(),
  documentsProcessing: z.int().nonnegative(),
});
export type InitiativeListItem = z.infer<typeof InitiativeListItem>;

export const InitiativeDetail = Initiative.extend({
  theses: z.array(Thesis),
  members: z.array(InitiativeMember),
  documents: z.array(DocumentStatus),
  /** Publish is allowed. When false, `publishBlockedReason` says why, in UI copy. */
  canPublish: z.boolean(),
  publishBlockedReason: z.string().nullable(),
});
export type InitiativeDetail = z.infer<typeof InitiativeDetail>;

export const CreateInitiativeBody = z.object({
  /** Client-generated, so a retried create finds the same draft. */
  id: Id,
  name: z.string().trim().min(1).default("Untitled initiative"),
  whatIsChanging: z.string().default(""),
  why: z.string().default(""),
  targetDate: CalendarDate.nullable().default(null),
});
export type CreateInitiativeBody = z.infer<typeof CreateInitiativeBody>;

export const PatchInitiativeBody = z
  .object({
    name: z.string().trim().min(1),
    whatIsChanging: z.string(),
    why: z.string(),
    targetDate: CalendarDate.nullable(),
    /** Replaces the whole ordered list. */
    theses: z.array(z.object({ id: Id.optional(), statement: z.string().trim().min(1) })),
    /** Replaces the whole member list. */
    members: z.array(z.object({ userId: z.string().min(1), role: InitiativeMember.shape.role })),
  })
  .partial();
export type PatchInitiativeBody = z.infer<typeof PatchInitiativeBody>;

/** `POST /v1/events/:id/still-stuck` body (flow 9). */
export const StillStuckBody = z.object({ reason: z.string().max(500).nullable().default(null) });
export type StillStuckBody = z.infer<typeof StillStuckBody>;

export const StillStuckResult = z.object({
  resolutionClass: z.literal("still_stuck"),
  citedDocuments: z.array(z.object({ documentId: Id, title: z.string() })),
});
export type StillStuckResult = z.infer<typeof StillStuckResult>;

/** `POST /v1/events/:id/initiative` body: the employee chose or switched the initiative (flow 8). */
export const SwitchInitiativeBody = z.object({ initiativeId: Id });
export type SwitchInitiativeBody = z.infer<typeof SwitchInitiativeBody>;

/** One row of "Sent to owner" (flows 8, 9): what the owner reads. No names, no screenshots. */
export const RoutedItem = z.object({
  kind: z.enum(RECORD_KIND),
  id: Id,
  /** Question text or flag transcript, in full. */
  text: z.string(),
  appNames: z.array(z.string()),
  /** The day only, never the time. */
  day: CalendarDate,
  resolutionClass: ResolutionClass,
  stillStuckReason: z.string().nullable(),
  markedPassages: z.array(z.object({ documentTitle: z.string(), headingPath: z.string().nullable() })),
});
export type RoutedItem = z.infer<typeof RoutedItem>;
