// PPTX to markdown, slide text only (Workers AI toMarkdown does not list PPTX; spec 05). Each slide becomes
// a `# Slide N: <first line>` section so passages carry the slide as heading and locator.
import { strFromU8, unzipSync } from "fflate";
import { DocumentFailure } from "./files";

const decode = (s: string) =>
  s
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&");

/** The paragraphs of one slide's XML: runs (`<a:t>`) joined within each `<a:p>`. */
export function slideParagraphs(xml: string): string[] {
  const paragraphs: string[] = [];
  for (const p of xml.match(/<a:p>[\s\S]*?<\/a:p>|<a:p [\s\S]*?<\/a:p>/g) ?? []) {
    const text = [...p.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map((m) => decode(m[1] ?? "")).join("");
    if (text.trim()) paragraphs.push(text.trim());
  }
  return paragraphs;
}

export function pptxToMarkdown(bytes: Uint8Array): string {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes, { filter: (f) => /^ppt\/slides\/slide\d+\.xml$/.test(f.name) });
  } catch {
    throw new DocumentFailure("unreadable");
  }
  const slides = Object.keys(files)
    .map((name) => ({ name, n: Number(name.match(/slide(\d+)\.xml$/)![1]) }))
    .sort((a, b) => a.n - b.n);
  if (slides.length === 0) throw new DocumentFailure("unreadable");
  const sections = slides
    .map(({ name, n }) => {
      const [title, ...rest] = slideParagraphs(strFromU8(files[name]!));
      return title ? `# Slide ${n}: ${title}\n\n${rest.join("\n\n")}` : "";
    })
    .filter(Boolean);
  if (sections.length === 0) throw new DocumentFailure("slides_no_text");
  return sections.join("\n\n");
}
