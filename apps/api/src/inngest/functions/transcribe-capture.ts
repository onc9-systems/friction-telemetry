// Transcribes a capture's voice note with Deepgram and places every word on the capture's wall clock.
import { and, eq } from "drizzle-orm";
import { inngest } from "../client";
import { captureAudioReceived } from "../events";
import { openDb } from "../../db/client";
import { flagCapture, flagCapturePart } from "../../db/schema";
import { alignWords, readTranscript } from "../../captures/align";
import { transcribeAudio } from "../../captures/deepgram";

type WithEnv = { env: Env };

export const transcribeCaptureFn = inngest.createFunction(
  {
    id: "transcribe-capture",
    triggers: [captureAudioReceived],
    retries: 3,
    onFailure: async (ctx) => {
      const { env } = ctx as unknown as WithEnv;
      const flagId = (ctx.event.data.event.data as { flagId: string }).flagId;
      const db = await openDb(env);
      try {
        await db
          .update(flagCapture)
          .set({ transcriptStatus: "failed", transcriptError: ctx.error.message })
          .where(eq(flagCapture.flagId, flagId));
      } finally {
        await db.$client.end();
      }
    },
  },
  async (ctx) => {
    const { event, step } = ctx;
    const { env } = ctx as unknown as WithEnv;
    const { flagId, organizationId } = event.data;
    return step.run("transcribe", async () => {
      const db = await openDb(env);
      try {
        const [audio] = await db
          .select()
          .from(flagCapturePart)
          .where(and(eq(flagCapturePart.flagId, flagId), eq(flagCapturePart.kind, "audio"), eq(flagCapturePart.organizationId, organizationId)));
        if (audio?.status !== "received") throw new Error(`Capture ${flagId} has no received audio.`);
        await db.update(flagCapture).set({ transcriptStatus: "transcribing", transcriptError: null }).where(eq(flagCapture.flagId, flagId));
        const object = await env.FILES.get(audio.r2Key);
        if (!object) throw new Error(`Audio ${audio.r2Key} is missing from R2.`);
        const response = await transcribeAudio(env.DEEPGRAM_API_KEY, await object.arrayBuffer(), audio.contentType);
        const { transcript, words } = readTranscript(response);
        const aligned = alignWords(words, audio.startedAt);
        await db
          .update(flagCapture)
          .set({ transcriptStatus: "done", transcript, transcriptWords: aligned, transcriptError: null })
          .where(eq(flagCapture.flagId, flagId));
        return { words: aligned.length };
      } finally {
        await db.$client.end();
      }
    });
  },
);
