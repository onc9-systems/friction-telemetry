// Proves sync and execution in Inngest Cloud. Not a product flow.
import { inngest } from "../client";
import { systemPing } from "../events";

export const systemPingFn = inngest.createFunction(
  { id: "system-ping", triggers: [systemPing] },
  async ({ step }) => step.run("echo", () => ({ receivedAt: new Date().toISOString() })),
);
