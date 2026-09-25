// Workers AI embeddings, `@cf/qwen/qwen3-embedding-0.6b`, 1024 dimensions (brief). One model for passages,
// Q&A entries, and queries, so every vector is comparable. Input schema: `documents` or `queries`, at most
// 32 strings per call; queries take an `instruction` (schema-input.json, fetched 25 Sep 2026).
export const EMBEDDING_MODEL = "@cf/qwen/qwen3-embedding-0.6b";
export const EMBED_BATCH = 32;

/** Queries are employees describing a problem or asking about a change, not web searches (the model default). */
export const QUERY_INSTRUCTION =
  "Given an employee's question or problem report about a change at their organization, retrieve the policy or guide passages that answer it";

function vectors(out: { data?: number[][] }, expected: number): number[][] {
  const data = out.data ?? [];
  if (data.length !== expected) throw new Error(`Embedding returned ${data.length} vectors for ${expected} inputs`);
  return data;
}

export async function embedDocuments(ai: Ai, texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH) {
    const batch = texts.slice(i, i + EMBED_BATCH);
    out.push(...vectors(await ai.run(EMBEDDING_MODEL, { documents: batch }), batch.length));
  }
  return out;
}

/** Rejects after `timeoutMs`. A race rather than an AbortSignal, which cannot cross every binding proxy. */
export async function embedQuery(ai: Ai, text: string, timeoutMs: number): Promise<number[]> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`embedding timed out after ${timeoutMs} ms`)), timeoutMs);
  });
  try {
    const out = await Promise.race([ai.run(EMBEDDING_MODEL, { queries: [text], instruction: QUERY_INSTRUCTION }), expired]);
    return vectors(out, 1)[0]!;
  } finally {
    clearTimeout(timer);
  }
}

/** pgvector's text form: `[0.1,0.2,...]`. */
export const toPgVector = (v: number[]) => `[${v.join(",")}]`;
