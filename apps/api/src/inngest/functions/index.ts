import { systemPingFn } from "./system-ping";

/** Every function served at /api/inngest. Feature phases append here. */
export const functions = [systemPingFn];
