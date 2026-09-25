import * as z from "zod";
import { DOCUMENT_VERSION_STATUS } from "../enums";
import { Id, Instant } from "../primitives";

export const Document = z.object({
  id: Id,
  initiativeId: Id,
  title: z.string().min(1),
  activeVersionId: Id.nullable(),
  suspect: z.boolean(),
  createdAt: Instant,
});
export type Document = z.infer<typeof Document>;

export const DocumentVersionStatus = z.enum(DOCUMENT_VERSION_STATUS);
export type DocumentVersionStatus = z.infer<typeof DocumentVersionStatus>;

export const DocumentVersion = z.object({
  id: Id,
  documentId: Id,
  r2Key: z.string().min(1),
  mimeType: z.string().min(1),
  byteSize: z.int().nonnegative(),
  status: DocumentVersionStatus,
  failureReason: z.string().nullable(),
  passageCount: z.int().nonnegative().nullable(),
  createdAt: Instant,
});
export type DocumentVersion = z.infer<typeof DocumentVersion>;

/** A retrievable span of a document version. The embedding is service-only and never on the wire. */
export const Passage = z.object({
  id: Id,
  documentVersionId: Id,
  initiativeId: Id,
  headingPath: z.string(),
  /** Page or slide number, when the format has one. */
  locator: z.int().positive().nullable(),
  text: z.string().min(1),
  position: z.int().nonnegative(),
});
export type Passage = z.infer<typeof Passage>;
