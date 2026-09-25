import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { serve } from "inngest/hono";
import type { ApiError } from "@friction-telemetry/contracts";
import { inngest } from "./inngest/client";
import { functions } from "./inngest/functions";
import auth from "./routes/auth";
import documents from "./routes/documents";
import events from "./routes/events";
import health from "./routes/health";
import initiatives from "./routes/initiatives";
import insights from "./routes/insights";
import me from "./routes/me";
import qa from "./routes/qa";
import system from "./routes/system";

const app = new Hono<{ Bindings: Env }>();

// Every surface file owns full paths under /v1, so feature phases add handlers inside their file, never here.
app.route("/v1", system);
app.route("/v1", events);
app.route("/v1", me);
app.route("/v1", initiatives);
app.route("/v1", documents);
app.route("/v1", insights);
app.route("/v1", health);
app.route("/v1", qa);
app.route("/api/auth", auth);

app.on(["GET", "PUT", "POST"], "/api/inngest", serve({ client: inngest, functions }));

app.notFound((c) => c.json({ error: "not_found", message: `No route for ${c.req.method} ${c.req.path}` } satisfies ApiError, 404));

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    // Malformed JSON reaches here as a 400 before the validator hook runs; give it the same body shape.
    const error = err.status === 400 ? "invalid_body" : "http_error";
    return c.json({ error, message: err.message } satisfies ApiError, err.status);
  }
  console.error(err);
  return c.json({ error: "internal", message: "Internal error" } satisfies ApiError, 500);
});

export default app;
