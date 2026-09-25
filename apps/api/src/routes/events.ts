// Flags and questions: flows 6 (flag), 7 (question), 8 (answer pipeline), 9 (still stuck).
// In the shell, POST /v1/events validates the body and streams a scripted answer (src/sse/stub.ts).
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { streamSSE } from "hono/streaming";
import * as z from "zod";
import { EventBody, type ApiError } from "@friction-telemetry/contracts";
import { notImplemented } from "../lib/not-implemented";
import { buildStubScript, scriptNameFromHeader, stubPace } from "../sse/stub";

/**
 * A body that is neither a Flag nor a Question fails the union as a whole, which Zod reports only as
 * "Invalid input". Name what is wrong under each reading so the client can see the field.
 */
function describeEventBodyError(error: z.core.$ZodError): string {
  const [issue] = error.issues;
  if (error.issues.length !== 1 || issue?.code !== "invalid_union" || issue.errors.length !== 2) {
    return z.prettifyError(error);
  }
  const [asFlag = [], asQuestion = []] = issue.errors;
  return [
    `Not a Flag:\n${z.prettifyError(new z.ZodError(asFlag))}`,
    `Not a Question:\n${z.prettifyError(new z.ZodError(asQuestion))}`,
  ].join("\n");
}

const events = new Hono<{ Bindings: Env }>()
  .post(
    "/events",
    zValidator("json", EventBody, (result, c) => {
      if (!result.success) {
        return c.json({ error: "invalid_body", message: describeEventBodyError(result.error) } satisfies ApiError, 400);
      }
    }),
    (c) => {
      const body = c.req.valid("json");
      const steps = buildStubScript(scriptNameFromHeader(c.req.header("x-ft-stub-script")), body.id);
      const pace = stubPace(c.env.STUB_PACE);
      // No onError argument: Hono's would write its own plain-text `error` frame. Contract errors are ours.
      return streamSSE(c, async (stream) => {
        try {
          for (const step of steps) {
            if (stream.aborted) return;
            const delay = step.delayMs * pace;
            if (delay > 0) await stream.sleep(delay);
            await stream.writeSSE({ event: step.event, data: JSON.stringify(step.data) });
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          await stream.writeSSE({ event: "error", data: JSON.stringify({ code: "stub_failed", message }) });
        }
      });
    },
  )
  .post("/events/:id/still-stuck", notImplemented(9));

export default events;
