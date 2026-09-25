import type { Context } from "hono";
import type { NotImplemented } from "@friction-telemetry/contracts";

/** Handler for a route whose flow is not built yet. The body names the flow from the Flow Catalogue. */
export const notImplemented = (flow: number) => (c: Context) =>
  c.json({ flow, status: "not_implemented" } satisfies NotImplemented, 501);
