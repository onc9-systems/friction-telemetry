// Seeds the HubSpot demo through the service's own routes, so the documents are indexed by the real pipeline
// (extraction, passages, embeddings) and answer exactly as they will in the demo. Andrés leads and owns the
// initiative, Romina is affected. Content lives in scripts/demo/hubspot.ts.
//
//   bun scripts/seed-hubspot-demo.ts                     production (the Release build's API)
//   FT_API_BASE=http://localhost:8787 bun scripts/seed-hubspot-demo.ts
//   bun scripts/seed-hubspot-demo.ts --ask "question"    also ask one question as Andrés and print the stream
//
// Idempotent: every id is fixed, so a rerun changes nothing. Indexing runs in Inngest (Cloud in production,
// the dev server locally); the script waits for every document to be ready, then publishes.
import { zipSync, strToU8 } from "fflate";
import { DOCUMENTS, INITIATIVE, THESES, type DemoDocument } from "./demo/hubspot";

const BASE = (process.env.FT_API_BASE ?? "https://friction-telemetry-api.andres-6fe.workers.dev").replace(/\/$/, "");
const LEADER = "usr_andres";
const EMPLOYEE = "usr_romina";

async function call(method: string, path: string, user: string, body?: object | Uint8Array, headers: Record<string, string> = {}) {
  const raw = body instanceof Uint8Array;
  return fetch(`${BASE}${path}`, {
    method,
    headers: { "x-ft-user": user, ...(body && !raw ? { "content-type": "application/json" } : {}), ...headers },
    body: raw ? body : body ? JSON.stringify(body) : undefined,
  });
}

async function json<T>(res: Response, what: string): Promise<T> {
  if (!res.ok) throw new Error(`${what}: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

type DocStatus = {
  documentId: string;
  title: string;
  activeVersion: { passageCount: number } | null;
  pendingVersion: { status: string; failureReason: string | null } | null;
};
type Detail = { status: string; documents: DocStatus[]; canPublish: boolean; publishBlockedReason: string | null };

const getDetail = async () => json<Detail>(await call("GET", `/v1/initiatives/${INITIATIVE.id}`, LEADER), "get initiative");

function slide(title: string, lines: string[]) {
  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const p = (t: string) => `<a:p><a:r><a:t>${esc(t)}</a:t></a:r></a:p>`;
  return strToU8(`<?xml version="1.0"?><p:sld xmlns:a="a" xmlns:p="p"><p:cSld><p:spTree>${p(title)}${lines.map(p).join("")}</p:spTree></p:cSld></p:sld>`);
}

function fileOf(doc: DemoDocument): { bytes: Uint8Array; type: string } {
  if (doc.kind === "html") return { bytes: strToU8(doc.html), type: "text/html" };
  const slides = Object.fromEntries(doc.slides.map((s, i) => [`ppt/slides/slide${i + 1}.xml`, slide(s.title, s.lines)]));
  return {
    bytes: zipSync({ "[Content_Types].xml": strToU8("<Types/>"), ...slides }),
    type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  };
}

async function ask(text: string) {
  const t0 = Date.now();
  const res = await call("POST", "/v1/events", LEADER, {
    id: crypto.randomUUID(),
    initiativeId: INITIATIVE.id,
    text,
    resolutionClass: null,
    createdAt: new Date().toISOString(),
    inReplyTo: null,
  });
  console.log(`\nask as ${LEADER}: ${text} (${res.status})`);
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
      console.log(`${String(Date.now() - t0).padStart(6)} ms  ${event.padEnd(17)} ${block.match(/^data: (.*)$/m)?.[1] ?? ""}`);
    }
  }
}

console.log(`Seeding the HubSpot demo on ${BASE}`);

let res = await call("GET", `/v1/initiatives/${INITIATIVE.id}`, LEADER);
if (res.status === 404) {
  const { id, name, whatIsChanging, why, targetDate } = INITIATIVE;
  await json(await call("POST", "/v1/initiatives", LEADER, { id, name, whatIsChanging, why, targetDate }), "create initiative");
  console.log("created initiative");
} else if (!res.ok) {
  throw new Error(`get initiative: ${res.status} ${await res.text()}`);
}

let detail = await getDetail();
if (detail.status !== "closed") {
  const { name, whatIsChanging, why, targetDate } = INITIATIVE;
  await json(
    await call("PATCH", `/v1/initiatives/${INITIATIVE.id}`, LEADER, {
      name,
      whatIsChanging,
      why,
      targetDate,
      theses: THESES,
      members: [
        { userId: LEADER, role: "owner" },
        { userId: EMPLOYEE, role: "affected" },
      ],
    }),
    "patch initiative",
  );
  console.log(`theses: ${THESES.length}, members: Andrés (leader, owner), Romina (affected)`);
}

for (const doc of DOCUMENTS) {
  if (detail.documents.some((d) => d.documentId === doc.documentId)) continue;
  const { bytes, type } = fileOf(doc);
  const up = await call("POST", `/v1/initiatives/${INITIATIVE.id}/documents`, LEADER, bytes, {
    "content-type": type,
    "content-length": String(bytes.byteLength),
    "x-ft-file-name": encodeURIComponent(doc.fileName),
    "x-ft-document-id": doc.documentId,
    "x-ft-version-id": doc.versionId,
  });
  await json(up, `upload ${doc.fileName}`);
  console.log(`uploaded ${doc.fileName} (${bytes.byteLength} bytes)`);
}

const deadline = Date.now() + 5 * 60_000;
for (;;) {
  detail = await getDetail();
  const ours = detail.documents.filter((d) => DOCUMENTS.some((x) => x.documentId === d.documentId));
  const failed = ours.find((d) => !d.activeVersion && d.pendingVersion?.status === "failed");
  if (failed) throw new Error(`${failed.title} failed to index: ${failed.pendingVersion!.failureReason}`);
  if (ours.length === DOCUMENTS.length && ours.every((d) => d.activeVersion)) {
    console.log(ours.map((d) => `ready: ${d.title}, ${d.activeVersion!.passageCount} passages`).join("\n"));
    break;
  }
  if (Date.now() > deadline) throw new Error(`indexing did not finish in 5 minutes: ${JSON.stringify(ours.map((d) => [d.title, d.pendingVersion?.status]))}`);
  await new Promise((r) => setTimeout(r, 3000));
}

if (detail.status === "draft") {
  await json(await call("POST", `/v1/initiatives/${INITIATIVE.id}/publish`, LEADER), "publish");
  console.log("published");
}
const mine = await json<Array<{ initiativeId: string; name: string }>>(await call("GET", "/v1/me/initiatives", EMPLOYEE), "me/initiatives");
console.log(`Romina sees: ${mine.map((i) => i.name).join(", ") || "nothing"}`);

const askAt = process.argv.indexOf("--ask");
if (askAt !== -1 && process.argv[askAt + 1]) await ask(process.argv[askAt + 1]!);
