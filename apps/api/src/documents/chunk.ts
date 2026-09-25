// Heading-aware chunking (flow 3a). Pure. Markdown in, passages out: each passage keeps the heading path it
// sits under, never crosses a heading, and splits only between sentences. No text is dropped: every
// non-empty line of the markdown lands in exactly one passage.
import { splitSentences } from "../answer/sentences";

export type Chunk = { headingPath: string; locator: number | null; text: string; position: number };

/** About 300 tokens: small enough to cite precisely, large enough to carry a rule and its exceptions. */
export const TARGET_CHARS = 1200;

const HEADING = /^(#{1,6})\s+(.*)$/;
const SLIDE = /^Slide (\d+):/;
const PAGE = /^(?:<!--\s*)?page\s+(\d+)(?:\s*-->)?$/i;

export function chunkMarkdown(markdown: string, targetChars = TARGET_CHARS): Chunk[] {
  const chunks: Chunk[] = [];
  const stack: string[] = [];
  let locator: number | null = null;
  let buffer: string[] = [];

  const flush = () => {
    const text = buffer.join("\n\n").trim();
    buffer = [];
    if (!text) return;
    const headingPath = stack.filter(Boolean).join(" > ");
    for (const piece of splitToSize(text, targetChars)) {
      chunks.push({ headingPath, locator, text: piece, position: chunks.length });
    }
  };

  for (const block of markdown.replaceAll("\r\n", "\n").split(/\n{2,}/)) {
    const lines = block.split("\n");
    for (const raw of lines) {
      const line = raw.trimEnd();
      const heading = line.match(HEADING);
      const page = line.trim().match(PAGE);
      if (page) {
        flush();
        locator = Number(page[1]);
        continue;
      }
      if (heading) {
        flush();
        const level = heading[1]!.length;
        const title = heading[2]!.trim();
        stack.length = level - 1;
        stack[level - 1] = title;
        const slide = title.match(SLIDE);
        if (slide) locator = Number(slide[1]);
        continue;
      }
      if (line.trim()) buffer.push(line);
    }
    if (buffer.join("\n\n").length >= targetChars) flush();
  }
  flush();
  return chunks;
}

/** Splits text at sentence boundaries into pieces of at most `max` characters (a longer sentence stays whole). */
export function splitToSize(text: string, max: number): string[] {
  if (text.length <= max) return [text];
  const pieces: string[] = [];
  let current = "";
  for (const sentence of splitSentences(text)) {
    if (current && current.length + sentence.length > max) {
      pieces.push(current.trim());
      current = "";
    }
    current += sentence;
  }
  if (current.trim()) pieces.push(current.trim());
  return pieces;
}
