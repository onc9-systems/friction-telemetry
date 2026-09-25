import { systemPingFn } from "./system-ping";
import { transcribeCaptureFn } from "./transcribe-capture";

/** Every function served at /api/inngest. Feature phases append here. */
export const functions = [systemPingFn, transcribeCaptureFn];
