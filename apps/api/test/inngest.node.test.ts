import { InngestTestEngine } from "@inngest/test";
import type { Middleware } from "inngest";
import { describe, expect, it } from "vitest";
import { inngest } from "../src/inngest/client";
import { HonoBindingsMiddleware } from "../src/inngest/bindings";
import { systemPingFn } from "../src/inngest/functions/system-ping";

const pingEvent = { name: "ft/system.ping", data: { sentAt: "2026-09-24T00:00:00.000Z" } };

describe("system-ping", () => {
  it("given ft/system.ping, when run, then the echo step returns the time it ran", async () => {
    const before = Date.now();
    const t = new InngestTestEngine({ function: systemPingFn, events: [pingEvent], reqArgs: [{ env: {} }] });
    const { result, error } = await t.execute();
    const after = Date.now();

    expect(error).toBeUndefined();
    expect(Object.keys(result as object)).toStrictEqual(["receivedAt"]);
    const receivedAt = (result as { receivedAt: string }).receivedAt;
    expect(new Date(receivedAt).toISOString()).toBe(receivedAt);
    expect(Date.parse(receivedAt)).toBeGreaterThanOrEqual(before - 1000);
    expect(Date.parse(receivedAt)).toBeLessThanOrEqual(after + 1000);
  });
});

describe("HonoBindingsMiddleware", () => {
  // @inngest/test does not run wrapRequest (it lives in the serve handler), so the middleware's two hooks
  // are exercised directly, in the order the serve handler calls them.
  it("given a Hono context carrying env, when a request runs a function, then the function input carries that env", async () => {
    const env = { STUB_PACE: "7" } as unknown as Env;
    const mw = new HonoBindingsMiddleware({ client: inngest });
    const response = new Response("from next");

    const returned = await mw.wrapRequest({
      fn: null,
      next: async () => response,
      requestArgs: [{ env }],
      requestInfo: new Request("http://api.test/api/inngest"),
      runId: "run",
    } as unknown as Middleware.WrapRequestArgs);
    const input = mw.transformFunctionInput({ ctx: { runId: "run" }, fn: {}, steps: {} } as unknown as Middleware.TransformFunctionInputArgs);

    expect(returned).toBe(response);
    expect((input.ctx as { env: unknown }).env).toBe(env);
    expect((input.ctx as { runId: string }).runId).toBe("run");
  });
});
