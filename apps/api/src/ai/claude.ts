// Claude through Cloudflare AI Gateway (Andrés, 25 Sep 2026: no Anthropic key; the gateway pays through
// Unified Billing and logs every call). The binding's `gateway(id).run()` forwards a provider-native request
// and returns the provider's own Response, so the Anthropic Messages API (search_result blocks, citations,
// streaming) passes through unchanged. No provider key on the request: AI Gateway falls through to BYOK,
// then Unified Billing (developers.cloudflare.com/ai-gateway/features/unified-billing, credential precedence).
export const CLAUDE_MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_VERSION = "2023-06-01";

export type TextBlock = { type: "text"; text: string };
export type SearchResultBlock = {
  type: "search_result";
  source: string;
  title: string;
  content: TextBlock[];
  citations: { enabled: boolean };
};
export type ImageBlock = { type: "image"; source: { type: "base64"; media_type: string; data: string } };
export type ContentBlock = TextBlock | SearchResultBlock | ImageBlock;
export type Message = { role: "user" | "assistant"; content: string | ContentBlock[] };

export type MessagesRequest = {
  system: string;
  messages: Message[];
  max_tokens: number;
  temperature?: number;
};

/** `search_result_location` citation (platform.claude.com search-results). */
export type SearchResultCitation = {
  type: "search_result_location";
  source: string;
  title: string | null;
  cited_text: string;
  search_result_index: number;
  start_block_index: number;
  end_block_index: number;
};

/** The subset of Anthropic stream events the pipeline reads. */
export type StreamEvent =
  | { type: "content_block_start"; index: number; content_block: { type: string; text?: string } }
  | {
      type: "content_block_delta";
      index: number;
      delta: { type: "text_delta"; text: string } | { type: "citations_delta"; citation: SearchResultCitation };
    }
  | { type: "content_block_stop"; index: number }
  | { type: "message_delta"; usage?: { output_tokens: number } }
  | { type: "message_start"; message: { usage?: { input_tokens: number } } }
  | { type: "message_stop" }
  | { type: "error"; error: { type: string; message: string } };

export class ClaudeError extends Error {}

/**
 * The request, rejected as soon as `signal` aborts. The signal is not handed to the binding (it cannot cross
 * every binding proxy); an abort after the response starts cancels its body instead (see `sseData`).
 */
async function gatewayRequest(env: Pick<Env, "AI" | "AI_GATEWAY_ID">, body: unknown, signal?: AbortSignal): Promise<Response> {
  signal?.throwIfAborted();
  const request = env.AI.gateway(env.AI_GATEWAY_ID).run({
    provider: "anthropic",
    endpoint: "v1/messages",
    headers: { "content-type": "application/json", "anthropic-version": ANTHROPIC_VERSION },
    query: body,
  });
  if (!signal) return request;
  let onAbort: () => void = () => {};
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(signal.reason ?? new Error("aborted"));
    signal.addEventListener("abort", onAbort, { once: true });
  });
  try {
    const res = await Promise.race([request, aborted]);
    return res;
  } finally {
    signal.removeEventListener("abort", onAbort);
    // A response that arrives after the abort is discarded without reading it.
    void request.then((r) => (signal.aborted ? r.body?.cancel() : undefined)).catch(() => undefined);
  }
}

async function ensureOk(res: Response): Promise<Response> {
  if (res.ok) return res;
  throw new ClaudeError(`AI Gateway ${res.status}: ${await res.text()}`);
}

/** One message, not streamed. Returns the concatenated text. */
export async function complete(
  env: Pick<Env, "AI" | "AI_GATEWAY_ID">,
  req: MessagesRequest,
  signal?: AbortSignal,
): Promise<string> {
  const res = await ensureOk(await gatewayRequest(env, { model: CLAUDE_MODEL, ...req }, signal));
  const json = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  return (json.content ?? []).map((b) => (b.type === "text" ? (b.text ?? "") : "")).join("");
}

/** Streams a message as Anthropic stream events. */
export async function* stream(
  env: Pick<Env, "AI" | "AI_GATEWAY_ID">,
  req: MessagesRequest,
  signal?: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const res = await ensureOk(await gatewayRequest(env, { model: CLAUDE_MODEL, stream: true, ...req }, signal));
  if (!res.body) throw new ClaudeError("AI Gateway returned no body");
  for await (const data of sseData(res.body, signal)) {
    const event = JSON.parse(data) as StreamEvent;
    if (event.type === "error") throw new ClaudeError(`${event.error.type}: ${event.error.message}`);
    yield event;
  }
}

/** The `data:` payload of each Server-Sent Event in a byte stream. */
export async function* sseData(body: ReadableStream<Uint8Array>, signal?: AbortSignal): AsyncGenerator<string> {
  const reader = body.pipeThrough(new TextDecoderStream()).getReader();
  const cancel = () => void reader.cancel(signal?.reason).catch(() => undefined);
  signal?.addEventListener("abort", cancel, { once: true });
  let buffer = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      signal?.throwIfAborted();
      if (done) break;
      buffer += value.replaceAll("\r\n", "\n");
      let end: number;
      while ((end = buffer.indexOf("\n\n")) !== -1) {
        const block = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        const data = block
          .split("\n")
          .filter((l) => l.startsWith("data:"))
          .map((l) => l.slice(5).replace(/^ /, ""))
          .join("\n");
        if (data && data !== "[DONE]") yield data;
      }
    }
  } finally {
    signal?.removeEventListener("abort", cancel);
    reader.releaseLock();
  }
}
