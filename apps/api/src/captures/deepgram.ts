import type { DeepgramResponse } from "./align";

const LISTEN_URL = "https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true";

/** Pre-recorded transcription: the audio bytes in the body, word timings in the reply (Context7 /websites/developers_deepgram). */
export async function transcribeAudio(apiKey: string, audio: ArrayBuffer, contentType: string): Promise<DeepgramResponse> {
  const res = await fetch(LISTEN_URL, {
    method: "POST",
    headers: { Authorization: `Token ${apiKey}`, "Content-Type": contentType },
    body: audio,
  });
  if (!res.ok) throw new Error(`Deepgram answered ${res.status}: ${await res.text()}`);
  return (await res.json()) as DeepgramResponse;
}
