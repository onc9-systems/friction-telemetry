// Text extraction (flow 3a): Workers AI toMarkdown for every accepted type except PPTX, which has its own
// extractor. PDF metadata is off so passages hold only the document's own words (spec 05).
import { DocumentFailure, type DocumentExtension } from "./files";
import { pptxToMarkdown } from "./pptx";

/** Less than this much text after extraction means there was nothing readable (scanned PDF, image-only file). */
const MIN_TEXT_CHARS = 20;

export async function extractMarkdown(
  ai: Ai,
  file: { name: string; ext: DocumentExtension; mimeType: string; bytes: Uint8Array },
): Promise<string> {
  if (file.ext === "pptx") return pptxToMarkdown(file.bytes);
  const result = await ai.toMarkdown(
    { name: file.name, blob: new Blob([file.bytes], { type: file.mimeType }) },
    { conversionOptions: { pdf: { metadata: false } } },
  );
  if (result.format === "error") throw classify(result.error);
  if (result.data.replace(/\s+/g, "").length < MIN_TEXT_CHARS) throw new DocumentFailure("no_text");
  return result.data;
}

/** Maps a conversion error to a failure the leader can act on. */
export function classify(error: string): DocumentFailure {
  return new DocumentFailure(/password|encrypt/i.test(error) ? "password" : "unreadable");
}
