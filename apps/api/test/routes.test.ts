import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

// Every route in the 01-shell spec, with the flow its 501 body names. A missing route answers 404 and fails.
const NOT_IMPLEMENTED: Array<[method: string, path: string, flow: number]> = [
  ["POST", "/v1/events/6f1c2d3e-4b5a-4c6d-8e7f-9a0b1c2d3e4f/still-stuck", 9],
  ["GET", "/v1/me/record", 11],
  ["GET", "/v1/me/notices", 21],
  ["GET", "/v1/initiatives/6f1c2d3e-4b5a-4c6d-8e7f-9a0b1c2d3e4f/qa", 10],
  ["POST", "/v1/initiatives", 3],
  ["GET", "/v1/initiatives", 4],
  ["GET", "/v1/initiatives/6f1c2d3e-4b5a-4c6d-8e7f-9a0b1c2d3e4f", 4],
  ["PATCH", "/v1/initiatives/6f1c2d3e-4b5a-4c6d-8e7f-9a0b1c2d3e4f", 4],
  ["POST", "/v1/initiatives/6f1c2d3e-4b5a-4c6d-8e7f-9a0b1c2d3e4f/close", 5],
  ["POST", "/v1/initiatives/6f1c2d3e-4b5a-4c6d-8e7f-9a0b1c2d3e4f/publish", 3],
  ["POST", "/v1/initiatives/6f1c2d3e-4b5a-4c6d-8e7f-9a0b1c2d3e4f/documents", 3],
  ["PUT", "/v1/documents/6f1c2d3e-4b5a-4c6d-8e7f-9a0b1c2d3e4f", 4],
  ["DELETE", "/v1/documents/6f1c2d3e-4b5a-4c6d-8e7f-9a0b1c2d3e4f", 4],
  ["GET", "/v1/documents/6f1c2d3e-4b5a-4c6d-8e7f-9a0b1c2d3e4f/status", 3],
  ["GET", "/v1/initiatives/6f1c2d3e-4b5a-4c6d-8e7f-9a0b1c2d3e4f/insights", 14],
  ["POST", "/v1/insights/6f1c2d3e-4b5a-4c6d-8e7f-9a0b1c2d3e4f/owner", 17],
  ["POST", "/v1/insights/6f1c2d3e-4b5a-4c6d-8e7f-9a0b1c2d3e4f/fix", 20],
  ["GET", "/v1/initiatives/6f1c2d3e-4b5a-4c6d-8e7f-9a0b1c2d3e4f/health", 16],
  ["POST", "/v1/qa/6f1c2d3e-4b5a-4c6d-8e7f-9a0b1c2d3e4f/answer", 18],
  ["POST", "/v1/qa/6f1c2d3e-4b5a-4c6d-8e7f-9a0b1c2d3e4f/approve", 18],
  ["GET", "/api/auth/session", 1],
  ["POST", "/api/auth/sign-in/social", 1],
];

const call = (method: string, path: string) => exports.default.fetch(`http://api.test${path}`, { method });

describe("routes", () => {
  for (const [method, path, flow] of NOT_IMPLEMENTED) {
    it(`given ${method} ${path}, then 501 naming flow ${flow}`, async () => {
      const res = await call(method, path);
      expect(res.status).toBe(501);
      expect(await res.json()).toStrictEqual({ flow, status: "not_implemented" });
    });
  }

  it("given GET /v1/health, then 200 { ok: true, version } with the package version", async () => {
    const res = await call("GET", "/v1/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toStrictEqual({ ok: true, version: "0.1.0" });
  });

  it("given GET /api/inngest, then the Inngest serve handler answers with system-ping, transcribe-capture and its failure handler", async () => {
    const res = await call("GET", "/api/inngest");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ function_count: 3 });
  });

  it("given an unknown path, then 404 with a JSON error", async () => {
    const res = await call("GET", "/v1/nope");
    expect(res.status).toBe(404);
    expect(await res.json()).toStrictEqual({ error: "not_found", message: "No route for GET /v1/nope" });
  });
});
