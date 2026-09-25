// Test helper: parse an SSE body into frames of { event, data }.
export type Frame = { event: string; data: unknown };

export function parseFrames(body: string): Frame[] {
  return body
    .trim()
    .split("\n\n")
    .filter((block) => block.length > 0)
    .map((block) => {
      const fields: Record<string, string[]> = {};
      for (const line of block.split("\n")) {
        const colon = line.indexOf(":");
        const key = line.slice(0, colon);
        const value = line.slice(colon + 1).replace(/^ /, "");
        (fields[key] ??= []).push(value);
      }
      return { event: fields.event?.[0] ?? "message", data: JSON.parse((fields.data ?? []).join("\n")) };
    });
}

/** Event names with consecutive repeats collapsed, so `delta, delta, delta` reads as one `delta`. */
export const collapsedOrder = (frames: Frame[]) =>
  frames.map((f) => f.event).filter((e, i, all) => e !== all[i - 1]);
