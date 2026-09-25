// Sentence splitting with Intl.Segmenter (available in workerd; test/sentences.test.ts runs inside it).
// Pieces keep their trailing whitespace, so joining them returns the input exactly.
const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });

export function splitSentences(text: string): string[] {
  return [...segmenter.segment(text)].map((s) => s.segment).filter((s) => s.length > 0);
}
