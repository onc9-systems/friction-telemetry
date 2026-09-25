import { documentIndexFn } from "./document-index";
import { eventAnsweredFn } from "./event-answered";
import { eventStillStuckFn } from "./event-still-stuck";
import { systemPingFn } from "./system-ping";
import { transcribeCaptureFn } from "./transcribe-capture";

/** Every function served at /api/inngest. Feature phases append here. */
export const functions = [systemPingFn, transcribeCaptureFn, documentIndexFn, eventAnsweredFn, eventStillStuckFn];
