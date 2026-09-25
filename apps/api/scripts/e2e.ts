// End-to-end run of flows 3, 3a, 6, 7, 8, 9 and follow-ups against real services, with no dev server:
// the Worker's Hono app runs in-process through wrangler's getPlatformProxy (real Workers AI and AI Gateway,
// real Neon through the local Hyperdrive string, R2 simulated locally), Jev over the network, and the
// Inngest functions executed in-process by @inngest/test.
//
//   FT_E2E_DATABASE_URL=<a Neon branch direct URL, never main> bun scripts/e2e.ts
//
// It creates a fresh initiative with two documents (HTML and PPTX), then asks, follows up, flags, and says
// "still stuck", printing every SSE frame with its arrival time.
import { zipSync, strToU8 } from "fflate";
import { InngestTestEngine } from "@inngest/test";

const url = process.env.FT_E2E_DATABASE_URL;
if (!url) throw new Error("Set FT_E2E_DATABASE_URL to a Neon branch direct URL (never main).");
process.env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE = url;
process.env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE_NOCACHE = url;

const { getPlatformProxy } = await import("wrangler");
const { default: app } = await import("../src/index");
const { inngest } = await import("../src/inngest/client");
const { documentIndexFn } = await import("../src/inngest/functions/document-index");
const { eventStillStuckFn } = await import("../src/inngest/functions/event-still-stuck");

const proxy = await getPlatformProxy<Env>({ configPath: "./wrangler.jsonc" });
// In workerd an incoming request body with Content-Length is a known-length stream R2 accepts as is. A Request
// built in Node is not, so the harness buffers it. Production code streams.
const files = proxy.env.FILES;
const FILES = new Proxy(files, {
  get(target, prop) {
    if (prop !== "put") return Reflect.get(target, prop);
    return async (key: string, value: unknown, options?: R2PutOptions) =>
      target.put(key, value instanceof ReadableStream ? await new Response(value).arrayBuffer() : (value as ArrayBuffer), options);
  },
});
const env = { ...proxy.env, FILES, ENVIRONMENT: "development", ANSWER_PIPELINE: "live" } as Env;

// Capture what the routes queue instead of sending it to an Inngest server; the functions run below.
const queued: Array<{ name: string; data: Record<string, unknown> }> = [];
(inngest as unknown as { send: (p: unknown) => Promise<unknown> }).send = async (payload) => {
  queued.push(...([payload].flat() as typeof queued));
  return { ids: [] };
};

const call = (method: string, path: string, user: string, body?: BodyInit | object, headers: Record<string, string> = {}) =>
  app.fetch(
    new Request(`http://api.local${path}`, {
      method,
      headers: {
        "x-ft-dev-user": user,
        ...(body && !(body instanceof Uint8Array) && typeof body === "object" ? { "content-type": "application/json" } : {}),
        ...headers,
      },
      body: body instanceof Uint8Array || typeof body === "string" ? body : body ? JSON.stringify(body) : undefined,
    }),
    env,
    proxy.ctx,
  );

async function stream(label: string, path: string, user: string, body: object) {
  const t0 = Date.now();
  const res = await call("POST", path, user, body);
  console.log(`\n=== ${label} (${res.status})`);
  if (!res.headers.get("content-type")?.startsWith("text/event-stream")) {
    console.log(await res.text());
    return [];
  }
  const frames: Array<{ event: string; data: Record<string, unknown>; ms: number }> = [];
  const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    let i: number;
    while ((i = buf.indexOf("\n\n")) !== -1) {
      const block = buf.slice(0, i);
      buf = buf.slice(i + 2);
      const event = block.match(/^event: (.*)$/m)?.[1] ?? "message";
      const data = JSON.parse(block.match(/^data: (.*)$/m)?.[1] ?? "{}");
      frames.push({ event, data, ms: Date.now() - t0 });
      const show = event === "citation" ? { index: data.index, documentTitle: data.documentTitle, locator: data.locator, quote: data.quote } : data;
      console.log(`${String(Date.now() - t0).padStart(5)} ms  ${event.padEnd(17)} ${JSON.stringify(show)}`);
    }
  }
  return frames;
}

// @inngest/test does not run the serve handler's wrapRequest, where HonoBindingsMiddleware captures env,
// so the harness hands its env to the middleware directly.
const { HonoBindingsMiddleware } = await import("../src/inngest/bindings");
HonoBindingsMiddleware.prototype.transformFunctionInput = function (args) {
  return { ...args, ctx: { ...args.ctx, env } } as typeof args;
};

async function runFunction(fn: unknown, event: { name: string; data: Record<string, unknown> }) {
  const t = new InngestTestEngine({
    function: fn as never,
    events: [event as never],
    // Events a function sends onward are not delivered in the harness.
    steps: [{ id: "document-ready", handler: () => ({ ids: [] }) }],
  });
  const { result, error } = await t.execute();
  if (error) throw error;
  return result;
}

const POLICY_HTML = `<html><body>
<h1>Procurement Policy v4</h1>
<h2>1 Scope</h2><p>This policy applies to every purchase made on behalf of Acme Logistics from 1 October 2026, when purchasing moves from email approvals to SAP Ariba.</p>
<h2>2 Raising a purchase order</h2>
<h3>2.1 Who can raise a PO</h3><p>Any employee with the Buyer role in Ariba can raise a purchase order. Other employees submit a purchase request, which a buyer converts into a PO.</p>
<h3>2.2 Approval thresholds</h3><p>Purchase orders up to 5,000 AED need only the requester's line manager to approve. Orders above 5,000 AED and up to 50,000 AED also need the Finance Controller. Orders above 50,000 AED also need the Head of Operations.</p>
<h3>2.3 Existing suppliers</h3><p>Suppliers already in the Ariba supplier list need no extra approval. A new supplier must be onboarded by the Procurement team before a PO can be raised to them, which takes up to five working days.</p>
<h2>3 After approval</h2><p>Once every approver has signed off in Ariba, the purchase order is released to the supplier automatically. Buyers do not need to contact Finance to release an approved PO. If an approved PO shows Pending release for more than one working day, open it and choose Request release; the request goes to the Procurement team.</p>
<h2>4 Urgent purchases</h2><p>For purchases needed within 24 hours, choose the Urgent flag when raising the PO. Urgent POs go to the approvers immediately with a four hour reminder. Urgent does not skip any approval step.</p>
</body></html>`;

function slide(title: string, lines: string[]) {
  const p = (t: string) => `<a:p><a:r><a:t>${t}</a:t></a:r></a:p>`;
  return strToU8(`<?xml version="1.0"?><p:sld xmlns:a="a" xmlns:p="p"><p:cSld><p:spTree>${p(title)}${lines.map(p).join("")}</p:spTree></p:cSld></p:sld>`);
}
const FAQ_PPTX = zipSync({
  "[Content_Types].xml": strToU8("<Types/>"),
  "ppt/slides/slide1.xml": slide("Ariba rollout FAQ", ["Answers to the questions buyers asked most in the pilot."]),
  "ppt/slides/slide2.xml": slide("Where do I find my approved POs?", ["Open Ariba, choose Manage, then Purchase Orders. Filter by Status: Released."]),
  "ppt/slides/slide3.xml": slide("Can I still email Finance for approval?", ["No. From 1 October email approvals are not accepted. Every approval happens in Ariba."]),
});

async function upload(user: string, initiativeId: string, fileName: string, body: Uint8Array, type: string) {
  const documentId = crypto.randomUUID();
  const res = await call("POST", `/v1/initiatives/${initiativeId}/documents`, user, body, {
    "content-type": type,
    "content-length": String(body.byteLength),
    "x-ft-file-name": encodeURIComponent(fileName),
    "x-ft-document-id": documentId,
    "x-ft-version-id": crypto.randomUUID(),
  });
  console.log(`upload ${fileName}: ${res.status}`, JSON.stringify(await res.json()));
  return documentId;
}

try {
  const LEADER = "usr_priya", EMPLOYEE = "usr_sam", OTHER = "usr_ben", OWNER = "usr_daniel";
  const initiativeId = crypto.randomUUID();
  let res = await call("POST", "/v1/initiatives", LEADER, {
    id: initiativeId,
    name: `Ariba purchasing ${new Date().toISOString().slice(11, 19)}`,
    whatIsChanging: "Purchase orders move from email approvals to SAP Ariba.",
    why: "Approvals were slow and untraceable over email.",
  });
  console.log("create initiative:", res.status);
  res = await call("PATCH", `/v1/initiatives/${initiativeId}`, LEADER, {
    theses: [{ statement: "Buyers can raise a PO without calling finance." }],
    members: [
      { userId: EMPLOYEE, role: "affected" },
      { userId: OTHER, role: "affected" },
      { userId: OWNER, role: "owner" },
    ],
  });
  console.log("patch initiative:", res.status);

  queued.length = 0;
  await upload(LEADER, initiativeId, "Procurement Policy v4.html", strToU8(POLICY_HTML), "text/html");
  await upload(LEADER, initiativeId, "Ariba rollout FAQ.pptx", FAQ_PPTX, "application/vnd.openxmlformats-officedocument.presentationml.presentation");
  for (const e of queued.splice(0)) {
    const t = Date.now();
    console.log(`document-index ${String(e.data.documentVersionId).slice(0, 8)}:`, JSON.stringify(await runFunction(documentIndexFn, e)), `${Date.now() - t} ms`);
  }
  res = await call("GET", `/v1/initiatives/${initiativeId}`, LEADER);
  const detail = (await res.json()) as { documents: Array<{ title: string; activeVersion: { passageCount: number } | null }>; canPublish: boolean };
  console.log("documents:", detail.documents.map((d) => `${d.title}: ${d.activeVersion?.passageCount ?? "not ready"} passages`), "canPublish:", detail.canPublish);
  res = await call("POST", `/v1/initiatives/${initiativeId}/publish`, LEADER);
  console.log("publish:", res.status);
  console.log("me/initiatives:", await (await call("GET", "/v1/me/initiatives", EMPLOYEE)).text());

  const now = () => new Date().toISOString();
  const q1 = crypto.randomUUID();
  await stream("Question (covered)", "/v1/events", EMPLOYEE, {
    id: q1, initiativeId, text: "Do I need finance to approve a 3,000 AED purchase order?", resolutionClass: null, createdAt: now(),
  });
  const q2 = crypto.randomUUID();
  await stream("Follow-up to it", "/v1/events", EMPLOYEE, {
    id: q2, initiativeId, text: "And what about one for 20,000?", resolutionClass: null, createdAt: now(), inReplyTo: { kind: "question", id: q1 },
  });
  await stream("Another employee, same problem (N others)", "/v1/events", OTHER, {
    id: crypto.randomUUID(), initiativeId, text: "Does a 3000 AED PO need finance sign-off?", resolutionClass: null, createdAt: now(),
  });
  await stream("Question (not covered)", "/v1/events", EMPLOYEE, {
    id: crypto.randomUUID(), initiativeId, text: "Can I use my corporate card for software subscriptions?", resolutionClass: null, createdAt: now(),
  });
  await stream("Re-POST of the first question (replay)", "/v1/events", EMPLOYEE, {
    id: q1, initiativeId, text: "Do I need finance to approve a 3,000 AED purchase order?", resolutionClass: null, createdAt: now(),
  });
  const f1 = crypto.randomUUID();
  await stream("Flag, Friction picks the initiative", "/v1/events", EMPLOYEE, {
    id: f1, initiativeId: null, transcript: "I approved this PO in Ariba yesterday and it still says pending release, do I have to email finance?",
    screenshotKey: null, clipKey: null, appNames: ["SAP Ariba"], resolutionClass: null, createdAt: now(),
  });

  queued.length = 0;
  res = await call("POST", `/v1/events/${q1}/still-stuck`, EMPLOYEE, { reason: "My manager approved but it is stuck at Finance anyway." });
  console.log("\nstill stuck:", res.status, await res.text());
  for (const e of queued.splice(0)) console.log("event-still-stuck:", JSON.stringify(await runFunction(eventStillStuckFn, e)));

  res = await call("GET", `/v1/events/${q2}/thread`, EMPLOYEE);
  const thread = (await res.json()) as { turns: Array<{ text: string; resolutionClass: string; answer: { text: string; citations: unknown[] } | null }> };
  console.log("\nthread:", res.status);
  for (const t of thread.turns) console.log(`  - ${t.text}\n    [${t.resolutionClass}] ${t.answer?.text} (${t.answer?.citations.length ?? 0} citations)`);
  res = await call("GET", `/v1/initiatives/${initiativeId}/routed`, OWNER);
  console.log("\nrouted (owner view):", res.status, await res.text());
  res = await call("GET", `/v1/initiatives/${initiativeId}/routed`, OTHER);
  console.log("routed (affected employee, refused):", res.status);
  res = await call("GET", `/v1/initiatives/${initiativeId}`, LEADER);
  const after = (await res.json()) as { documents: Array<{ title: string; suspect: boolean; suspectReports: number }> };
  console.log("documents after still stuck:", JSON.stringify(after.documents.map((d) => ({ title: d.title, suspect: d.suspect, reports: d.suspectReports }))));
} finally {
  await proxy.dispose();
}
