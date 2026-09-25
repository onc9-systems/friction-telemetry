import type { TranscriptWord } from "@friction-telemetry/contracts";

/** The fields of a Deepgram pre-recorded word this service reads. `start`/`end` are seconds from audio start. */
export interface DeepgramWord {
  word: string;
  punctuated_word?: string;
  start: number;
  end: number;
  confidence: number;
}

export interface DeepgramResponse {
  results?: { channels?: Array<{ alternatives?: Array<{ transcript?: string; words?: DeepgramWord[] }> }> };
}

/**
 * Places Deepgram's words on the capture's wall clock: each word's offset from the start of the audio file,
 * added to the instant the Mac recorded the audio's first sample. That shared clock is what lines speech up
 * with the video frames and the window timeline.
 */
export function alignWords(words: DeepgramWord[], audioStartedAt: Date): TranscriptWord[] {
  const origin = audioStartedAt.getTime();
  const at = (seconds: number) => new Date(origin + Math.round(seconds * 1000)).toISOString();
  return words.map((w) => ({
    word: w.punctuated_word ?? w.word,
    startedAt: at(w.start),
    endedAt: at(w.end),
    confidence: w.confidence,
  }));
}

/** The first channel's best alternative; an empty transcript when Deepgram heard nothing. */
export function readTranscript(response: DeepgramResponse): { transcript: string; words: DeepgramWord[] } {
  const best = response.results?.channels?.[0]?.alternatives?.[0];
  return { transcript: best?.transcript ?? "", words: best?.words ?? [] };
}
