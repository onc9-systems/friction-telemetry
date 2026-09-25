import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { FlagCaptureDetail, FlagCaptureSummary, type FlagCaptureManifest, CaptureUploadPlan } from "@friction-telemetry/contracts";
import manifestFixture from "@friction-telemetry/contracts/fixtures/flag-capture-manifest.json";
import { alignWords } from "../src/captures/align";
import { PART_SIZE } from "../src/captures/summary";

const call = (method: string, path: string, init: RequestInit = {}, user = "usr_romina") =>
  exports.default.fetch(`http://api.test${path}`, { method, ...init, headers: { "x-ft-user": user, ...(init.headers as Record<string, string>) } });
const postJson = (path: string, body: unknown) =>
  call("POST", path, { headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

describe("alignWords", () => {
  it("given words timed from the audio start, then each lands at audio start plus its offset, to the millisecond", () => {
    const words = alignWords(
      [
        { word: "it", punctuated_word: "It", start: 0.48, end: 0.64, confidence: 0.99 },
        { word: "bounced", start: 1.0005, end: 1.5, confidence: 0.9 },
      ],
      new Date("2026-09-25T10:42:30.214Z"),
    );
    expect(words).toStrictEqual([
      { word: "It", startedAt: "2026-09-25T10:42:30.694Z", endedAt: "2026-09-25T10:42:30.854Z", confidence: 0.99 },
      { word: "bounced", startedAt: "2026-09-25T10:42:31.215Z", endedAt: "2026-09-25T10:42:31.714Z", confidence: 0.9 },
    ]);
  });
});

describe("capture intake validation", () => {
  for (const missing of ["video", "audio"] as const) {
    it(`given a manifest without its ${missing} part, then 400: a flag always carries video and audio`, async () => {
      const kept = manifestFixture.parts.find((p) => p.kind !== missing)!;
      const res = await postJson("/v1/captures", { ...manifestFixture, parts: [kept] });
      expect(res.status).toBe(400);
      expect(((await res.json()) as { message: string }).message).toContain("parts");
    });
  }

  it("given a manifest with the same kind twice, then 400", async () => {
    const audio = manifestFixture.parts.find((p) => p.kind === "audio")!;
    const res = await postJson("/v1/captures", { ...manifestFixture, parts: [audio, audio] });
    expect(res.status).toBe(400);
    expect(await res.json()).toStrictEqual({ error: "invalid_body", message: "Each part kind may appear once." });
  });

  it("given a window event without an instant, then 400 naming the field", async () => {
    const body = { ...manifestFixture, windows: [{ ...manifestFixture.windows[0], at: "yesterday" }] };
    const res = await postJson("/v1/captures", body);
    expect(res.status).toBe(400);
    expect(((await res.json()) as { message: string }).message).toContain("windows[0].at");
  });

  it("given a part larger than the part size, then 400 before anything is stored", async () => {
    const res = await call("PUT", `/v1/captures/${manifestFixture.flagId}/parts/audio/1`, {
      headers: { "content-length": String(PART_SIZE + 1) },
      body: new Uint8Array(PART_SIZE + 1),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toStrictEqual({ error: "invalid_body", message: `A part is at most ${PART_SIZE} bytes.` });
  });

  it("given an unknown part kind, then 400", async () => {
    const res = await call("PUT", `/v1/captures/${manifestFixture.flagId}/parts/screenshot/1`, { body: "x" });
    expect(res.status).toBe(400);
  });
});

// Glue against the real Neon dev branch and the local R2 simulator. Runs when the shell provides a real
// Hyperdrive connection string (see vitest.config.ts); otherwise there is no database to talk to.
describe.skipIf(env.FT_DB_TESTS !== "1")("capture intake against the database", () => {
  it("given a registered capture, when its audio uploads in two parts and completes, then the cloud holds exactly those bytes and the windows", async () => {
    // The Mac's Foundation encodes UUIDs in uppercase; the stored key must still be the lowercase spelling.
    const flagId = crypto.randomUUID().toUpperCase();
    const audio = new Uint8Array(PART_SIZE + 17).map((_, i) => i % 251);
    const manifest: FlagCaptureManifest = {
      ...(manifestFixture as FlagCaptureManifest),
      flagId,
      parts: [
        { kind: "video", contentType: "video/mp4", byteSize: 4, startedAt: "2026-09-25T10:42:18.000Z", endedAt: "2026-09-25T10:42:49.000Z" },
        { kind: "audio", contentType: "audio/mp4", byteSize: audio.byteLength, startedAt: "2026-09-25T10:42:30.214Z", endedAt: "2026-09-25T10:42:48.850Z" },
      ],
    };
    const plan = CaptureUploadPlan.parse(await (await postJson("/v1/captures", manifest)).json());
    expect(plan.parts.map((p) => [p.kind, p.received])).toStrictEqual([["video", false], ["audio", false]]);

    const again = CaptureUploadPlan.parse(await (await postJson("/v1/captures", manifest)).json());
    expect(again.parts.map((p) => p.uploadId)).toStrictEqual(plan.parts.map((p) => p.uploadId));

    const chunks = [audio.slice(0, plan.partSize), audio.slice(plan.partSize)];
    const uploaded = [];
    for (const [i, chunk] of chunks.entries()) {
      const res = await call("PUT", `/v1/captures/${flagId}/parts/audio/${i + 1}`, {
        headers: { "content-length": String(chunk.byteLength) },
        body: chunk,
      });
      expect(res.status).toBe(200);
      uploaded.push(await res.json());
    }
    const done = await postJson(`/v1/captures/${flagId}/parts/audio/complete`, { parts: uploaded.reverse() });
    expect(done.status).toBe(200);
    const summary = FlagCaptureSummary.parse(await done.json());
    expect(summary.parts.map((p) => [p.kind, p.status, p.byteSize])).toStrictEqual([["video", "uploading", 4], ["audio", "received", audio.byteLength]]);

    const stored = await env.FILES.get(`captures/org_acme/${flagId.toLowerCase()}/audio.m4a`);
    // Compare digests: a failing toStrictEqual on 8 MB arrays makes Vitest build a diff that exhausts the heap.
    const digest = async (bytes: ArrayBuffer | Uint8Array) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].join(",");
    const storedBytes = await stored!.arrayBuffer();
    expect(storedBytes.byteLength).toBe(audio.byteLength);
    expect(await digest(storedBytes)).toBe(await digest(audio));

    const content = `/v1/captures/${flagId}/parts/audio/content`;
    const whole = await call("GET", content);
    expect([whole.status, whole.headers.get("content-length"), whole.headers.get("accept-ranges")]).toStrictEqual([200, String(audio.byteLength), "bytes"]);
    expect(await digest(await whole.arrayBuffer())).toBe(await digest(audio));
    const seek = await call("GET", content, { headers: { range: "bytes=100-199" } });
    expect([seek.status, seek.headers.get("content-range")]).toStrictEqual([206, `bytes 100-199/${audio.byteLength}`]);
    expect([...new Uint8Array(await seek.arrayBuffer())]).toStrictEqual([...audio.slice(100, 200)]);
    const notYet = await call("GET", `/v1/captures/${flagId}/parts/video/content`);
    expect(notYet.status).toBe(404);

    const detail = FlagCaptureDetail.parse(await (await call("GET", `/v1/captures/${flagId}`)).json());
    expect(detail.windows).toStrictEqual(manifest.windows);
    expect(detail.clickedAt).toBe(manifest.clickedAt);

    const list = FlagCaptureSummary.array().parse(await (await call("GET", "/v1/captures")).json());
    expect(list.map((s) => s.flagId)).toContain(flagId.toLowerCase());

    const anonymous = await exports.default.fetch(`http://api.test/v1/captures/${flagId}`);
    expect(anonymous.status).toBe(401);
  }, 60_000);
});
