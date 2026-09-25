// Document files: accepted types, size limit, R2 keys, and the failure copy (flow 3a, spec 05).
import type { DocumentFailureCode } from "@friction-telemetry/contracts";

/** The extract step holds the original, a Blob copy and the markdown in one 128 MB isolate (spec 05). */
export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

export const DOCUMENT_TYPES = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  html: "text/html",
  htm: "text/html",
  csv: "text/csv",
} as const;
export type DocumentExtension = keyof typeof DOCUMENT_TYPES;

export const extensionOf = (fileName: string): string => fileName.split(".").pop()?.toLowerCase() ?? "";
export const isDocumentExtension = (ext: string): ext is DocumentExtension => ext in DOCUMENT_TYPES;
export const titleOf = (fileName: string) => fileName.replace(/\.[^.]+$/, "") || fileName;
export const r2KeyOf = (organizationId: string, documentId: string, versionId: string, ext: string) =>
  `docs/${organizationId}/${documentId}/${versionId}.${ext}`;

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export const rejectWrongType = (fileName: string) =>
  `${fileName} can't be used. Friction reads PDF, Word (.docx), Excel (.xlsx, .xls), PowerPoint (.pptx), HTML, and CSV files.`;
export const rejectTooLarge = (fileName: string, bytes: number) =>
  `${fileName} is ${mb(bytes)}. Files can be up to 25 MB. Split it, or export a smaller PDF.`;

export const FAILURE_REASON: Record<DocumentFailureCode, string> = {
  no_text: "No readable text found. If this is a scanned PDF, export it with selectable text and upload it again.",
  password: "This file is password protected. Remove the password and upload it again.",
  slides_no_text: "No text found on the slides. Friction reads slide text only, not images or speaker notes.",
  unreadable: "Friction couldn't read this file. Try saving it as a PDF and uploading that.",
  not_started: "Processing didn't start. Retry.",
  transient_exhausted: "Indexing stopped after several tries. Retry in a few minutes.",
};

/** A version that has not changed state in this long shows "Taking longer than usual." */
export const SLOW_AFTER_MS = 3 * 60 * 1000;

/** A classified extraction failure: retrying the same file cannot help. */
export class DocumentFailure extends Error {
  constructor(readonly code: DocumentFailureCode) {
    super(FAILURE_REASON[code]);
  }
}
