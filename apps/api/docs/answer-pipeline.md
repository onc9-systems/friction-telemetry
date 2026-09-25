# Answer pipeline and documents: client guide

This is the contract between the Mac app and the service for flows 3, 3a, 4, 5 (initiatives and documents) and 6, 7, 8, 9 (flags, questions, follow-ups, answers, still stuck). It describes the service as built on branch `iteration-1/06-answer-pipeline`. The Zod schemas in `packages/contracts` are the authority. Where this guide and a schema disagree, the schema wins, so report the gap.

UI copy and card states come from `osis/v1/core/iteration-1--foundation/06-answer-pipeline.impl.md` (UX section). This guide covers the wire.

## Status

| Part | State |
|---|---|
| Document upload, extraction, chunking, embedding, indexing | Live. Verified end to end with HTML and PPTX files. |
| Retrieval (vector plus full text) and Jev judgments | Live. |
| Streaming answers, classes, citations, "N others", replay | Live. |
| Follow-ups (threads) | Live. |
| Still stuck, suspect marks, owner's "Sent to owner" list | Live. |
| Written answers from Claude | Waiting on AI Gateway credits. Until then, a covered question gets the fallback card: "The {initiative} docs cover this. The passage is below." plus the passages as citations. The class is still correct. |
| Sign-in | Phase 02. Until then every request acts as the sample employee (see "Who is calling"). |

## Running it locally

1. Start the Worker from this checkout: `bun run dev` in `apps/api` (port 8787, strict).
2. Seed sample data once per database: `DATABASE_URL_UNPOOLED=<branch URL> bun run db:seed`.
3. Point the Mac at `http://localhost:8787`.

`bun run dev` reads the Neon dev branch URL from `~/.secrets/projects.env`. Indexing runs in Inngest, so a local run needs the Inngest dev server (`npx inngest-cli@latest dev -u http://localhost:8787/api/inngest --no-discovery`, UI on 8288). `bunx` skips the CLI's binary download, so use `npx`.

`apps/api/scripts/e2e.ts` runs every flow in this guide against real services with no server. It prints each stream frame with its arrival time, so it doubles as a worked example: `FT_E2E_DATABASE_URL=<branch URL> bunx tsx scripts/e2e.ts`.

### Who is calling

Until phase 02 lands, the service treats every request as the sample employee Sam Okafor (`usr_sam`, organization `org_acme`). In local development (`ENVIRONMENT=development` in `.dev.vars`), two headers act as anyone:

| Header | Meaning |
|---|---|
| `x-ft-user` | Required on every `/v1` route except health: a person from `packages/contracts/fixtures/fixed-directory.json` (`usr_andres`, `usr_romina`, `usr_amir`). |

Production ignores both. Phase 02 replaces them with the signed-in session and changes nothing else in this guide.

### The stub

The scripted stream from the shell still works. In development, send `x-ft-stub-script: answered` or `x-ft-stub-script: provisional_routed` with `POST /v1/events`. Setting `ANSWER_PIPELINE=stub` turns the stub on everywhere, which is the one-variable rollback for a demo.

## Flags and questions

### Send one: `POST /v1/events`

The body is a `Flag` or a `Question` (`packages/contracts/src/concepts/flag.ts`, `question.ts`), exactly as the Mac stores it. The client generates `id`. The same `id` is the idempotency key, so a retry never creates a second event.

```json
{
  "id": "2f1c9a0e-6a57-4f7b-9c1e-0d8a2b3c4d5e",
  "initiativeId": "f5fcec07-d93a-5867-b2e3-39644999b66c",
  "text": "Do I need finance to approve a 3,000 AED purchase order?",
  "resolutionClass": null,
  "createdAt": "2026-09-25T10:00:00.000Z",
  "inReplyTo": null
}
```

A flag sends `initiativeId: null` when the employee left the chip on "Friction picks". A flag with an initiative id is the employee's explicit pick. A question always names its initiative: Ask is explicitly scoped.

Refusals arrive as JSON (`{ "error": code, "message": text }`) before any stream starts. The table of codes is at the end.

### Read the answer: the stream

A successful send answers `200` with `content-type: text/event-stream`. Each event is `event: <name>` plus one `data:` line of JSON. The payload schemas are in `packages/contracts/src/sse.ts`.

Events arrive in this order:

```
meta, (provisional), delta+, citation*, class, (count), done
```

or `choose_initiative` alone. Parentheses mean the event may be absent.

| Event | When | Payload and what to do |
|---|---|---|
| `meta` | The initiative is decided. | `initiativeId`, `initiativeName`, `initiativeConfidence`. Header becomes "Checking the {initiativeName} docs". `switchable: true` means Friction picked the initiative and is only fairly sure: show the chip chevron with `alternatives`. `switchedFrom` is set after a switch: show "Switched from {switchedFrom}." `inReplyTo` is set on follow-ups. |
| `provisional` | Jev is very sure the docs do not cover it. Arrives before any `delta`. | `message`. Show it with the "Provisional" label. If the final class is `answered`, keep it greyed and add "Update: the docs do cover this." |
| `delta` | Answer text. | `text`. Append. Answered answers stream in several deltas. Middle-band answers, fixed copy and fallbacks arrive as one delta. |
| `citation` | After the last delta. | One per distinct passage, numbered by `index` in order of first citation. Place the chip at `charOffset`, an offset into the joined answer text counted in UTF-16 code units (JavaScript string length). In Swift, index `text.utf16`, not `text`, or an emoji or accented letter shifts every chip after it. `quote` is the exact cited text. `passageText` is the whole passage for "Open at passage". `sourceKind` is `document` or `qa`. A `qa` citation is an owner answer: show the "Owner answer" badge, and read `qaApprovedByUserId` and `qaApprovedAt`. `suspect: true` means "This passage is marked for review." |
| `class` | The answer is saved. | `resolutionClass` is `answered` or `unanswerable` (UI copy: "Sent to owner"). `routed: true` means the owners can now see it. |
| `count` | Distinct other employees with the same problem in the last 30 days. | `othersCount`. Absent when it could not be counted: hide the line, never show a placeholder. |
| `done` | Always last on success. | `answerId`. The card is final and identical when reopened. |
| `choose_initiative` | Friction could not tell which initiative a flag is about. The stream ends here with no `done`. | `options`: the employee's live initiatives, full names. Show "Which initiative is this about?" and call the switch route with the choice. An empty list means the employee is in no live initiative. |
| `error` | Only when even saving the answer failed. | `code`, `message`. Offer to send again with the same `id`. |

Every flag and question gets a `class`, even when retrieval or a model fails. The failure answer is `unanswerable` with the copy "Couldn't answer this right now. The owner sees it. You'll hear here if it gets fixed."

A worked stream for a covered question:

```
event: meta
data: {"eventId":"2f1c…","initiativeId":"f5fc…","initiativeName":"Procurement rollout","initiativeConfidence":1,"switchable":false,"alternatives":[],"switchedFrom":null,"inReplyTo":null}

event: delta
data: {"text":"You only need your line manager's approval."}

event: citation
data: {"index":1,"passageId":"366e…","qaEntryId":null,"quote":"Purchase orders up to 5,000 AED need only the requester's line manager to approve.","documentTitle":"Procurement Policy v4","locator":"2.2 Approval thresholds","charOffset":44,"sourceKind":"document","headingPath":"2 Raising a purchase order > 2.2 Approval thresholds","passageText":"Purchase orders up to 5,000 AED…","suspect":false,"qaApprovedByUserId":null,"qaApprovedAt":null}

event: class
data: {"resolutionClass":"answered","routed":false}

event: count
data: {"othersCount":23}

event: done
data: {"answerId":"9c0d…"}
```

### Retries, offline, and a closed app

The service finishes and saves the answer even if the connection drops mid-stream. To recover, send the same body again:

- **Already answered:** the service replays the saved card as a stream (`meta`, one `delta` with the whole text, `citation`s, `class`, `count`, `done`) without calling any model.
- **Still being answered (under 30 seconds):** `409 in_progress`. Retry after a short backoff.

This makes the flag outbox safe: a send that timed out on the Mac can be resent without creating a duplicate.

## Follow-ups

The employee can reply to any answer. A reply is a `Question` whose `inReplyTo` names the flag or question it answers:

```json
{
  "id": "7a3e…",
  "initiativeId": "f5fcec07-d93a-5867-b2e3-39644999b66c",
  "text": "And what about one for 20,000?",
  "resolutionClass": null,
  "createdAt": "2026-09-25T10:01:00.000Z",
  "inReplyTo": { "kind": "question", "id": "2f1c9a0e-6a57-4f7b-9c1e-0d8a2b3c4d5e" }
}
```

Replies follow four rules:

- The reply's `initiativeId` must equal the parent's. A follow-up never changes initiative.
- The parent must belong to the caller and must already have an answer.
- The service rewrites the reply into a question that stands on its own, using the earlier turns ("Do I need finance approval for a 20,000 AED purchase order?"). Retrieval, judgment and "N others" use that rewrite. The employee's own words are what the thread shows.
- Each reply gets its own answer, class and count, and counts as its own signal. "This didn't solve it" stays a separate action (below). The service never infers "still stuck" from a reply.

The stream is the same as for any question, with `meta.inReplyTo` set.

### Read a thread: `GET /v1/events/:id/thread`

Pass the id of any turn (the root flag or question, or any reply). The response is a `Thread` (`packages/contracts/src/concepts/thread.ts`): the root reference, the initiative, and every turn oldest first. Each turn carries the employee's text, `inReplyTo`, class, `routed`, the still-stuck reason, and its answer with citations in the same shape as the stream's `citation` events. Only the sender can read a thread. Anyone else gets `404`.

Use it to render Home details and to restore a conversation after relaunch.

## Choosing or switching a flag's initiative

`POST /v1/events/:id/initiative` with body `{ "initiativeId": "…" }`.

Call it after `choose_initiative`, or when the employee picks another initiative from the chip. The response is the same stream as `POST /v1/events`, with `meta.switchedFrom` set when an earlier answer existed. The earlier answer is kept as superseded and disappears from the thread. Questions cannot switch (`409 question_scope_fixed`). "None of these" needs no call: the flag is already saved with no initiative.

## Still stuck

`POST /v1/events/:id/still-stuck` with body `{ "reason": "What's still in the way" }`. `reason` is optional, at most 500 characters, and is sent exactly as typed.

Only an answered flag or question accepts it. The response is `200`:

```json
{ "resolutionClass": "still_stuck", "citedDocuments": [{ "documentId": "…", "title": "Procurement Policy v4" }] }
```

Flip the class pill only after this `200`. Use `citedDocuments.length` for the singular or plural copy ("The cited passage is marked for review." or "The cited passages are marked for review."). Repeating the call returns the same `200`. An unanswerable event returns `409 not_answered`, because it is already with the owner. Marking the cited documents for review happens in Inngest within seconds.

## Live initiatives for Ask and the capture chip

`GET /v1/me/initiatives` returns `[{ initiativeId, name }]`: the caller's live initiatives, by name. Use it for the Ask scope menu and the capture review chip. Closed and draft initiatives never appear.

## Initiative surface

Only leaders of an initiative can edit it. Other members get `403 not_leader` on writes, with the copy "You no longer have permission to edit initiatives."

| Route | Does |
|---|---|
| `POST /v1/initiatives` | Creates a draft. Body `CreateInitiativeBody`, with a client-generated `id` so a retry finds the same draft. The creator becomes a leader. Returns `InitiativeDetail`. |
| `GET /v1/initiatives` | The initiatives the caller belongs to, as `InitiativeListItem[]` with document counts. |
| `GET /v1/initiatives/:id` | `InitiativeDetail`: theses, members, documents, `canPublish`, `publishBlockedReason` ("Needs one ready document", "Needs a name"). |
| `PATCH /v1/initiatives/:id` | Autosave. Any subset of `PatchInitiativeBody`. `theses` and `members`, when present, replace the whole list. Returns `InitiativeDetail`. |
| `POST /v1/initiatives/:id/publish` | Draft to live. `409 cannot_publish` with the reason as its message. |
| `POST /v1/initiatives/:id/close` | Live to closed. Asking and flagging stop at once. |
| `GET /v1/initiatives/:id/routed` | "Sent to owner", for owners and leaders only (`404` for anyone else). `RoutedItem[]`, newest first: text in full, app names, the day only, class, still-stuck reason, and marked passages. No names, no screenshots. |

### Documents

Upload the raw file as the request body, not as multipart form data. The service streams it straight into storage.

```
POST /v1/initiatives/:id/documents
Content-Type: application/pdf
Content-Length: 1843221
x-ft-file-name: Procurement%20Policy%20v4.pdf
x-ft-document-id: <client UUID>
x-ft-version-id: <client UUID>
<file bytes>
```

The client generates both ids, so a retried upload overwrites the same object and creates no duplicate. Accepted types are PDF, DOCX, XLSX, XLS, PPTX, HTML and CSV, up to 25 MB. The service decides the type by file extension. A wrong type returns `415 unsupported_type`, and a file over 25 MB returns `413 too_large`, each with the exact rejection copy as its message. Show your own "Uploading 40%" progress from the upload task. The response (`201`) is a `DocumentStatus` whose `pendingVersion.status` is `extracting`.

| Route | Does |
|---|---|
| `PUT /v1/documents/:id` | Replace: same headers minus `x-ft-document-id`. The version in use keeps answering until the new one is ready. `409 still_processing` while another version is processing. |
| `GET /v1/documents/:id/status` | Poll every 2 seconds while any row on screen is processing. Reads skip the database cache, so changes show at once. |
| `POST /v1/documents/:id/retry` | Reprocesses a failed version's file. No new upload. |
| `PATCH /v1/documents/:id` | Rename: `{ "title": "…" }`. |
| `DELETE /v1/documents/:id` | Remove. Its passages leave search at once. `409 last_ready_document` for the last ready document of a live initiative. |

A `DocumentStatus` (`packages/contracts/src/concepts/views.ts`) maps onto the document row states of spec 05:

| Row state | How to read it |
|---|---|
| Extracting, Indexing | `pendingVersion.status` |
| Ready | `activeVersion` present and no `pendingVersion`. `activeVersion.passageCount` gives "Ready (212 passages)". |
| Ready with warnings | `activeVersion.warning` |
| Failed | `pendingVersion.status` is `failed`. Show `pendingVersion.failureReason` verbatim. `failureCode` is for logic. |
| Replacing | Both versions present, pending one processing. |
| Replacement failed | Both present, pending one failed. |
| Slow | `pendingVersion.slow` |
| Marked for review | `suspect`, with `suspectReports` for "2 reports". |

## Error codes

Every refusal is JSON with this shape: `{ "error": code, "message": text }`. Messages that read as UI copy can be shown as they are.

| Status | `error` | Where |
|---|---|---|
| 400 | `invalid_body` | Any route: the message names the field. |
| 400 | `question_too_long` | Over 4,000 characters. |
| 403 | `not_member` | Asking or flagging against an initiative the caller is not in. |
| 403 | `not_leader` | Initiative and document writes. |
| 404 | `not_found`, `parent_not_found` | Unknown or someone else's id. |
| 409 | `closed_initiative` | The initiative closed. Message: "{name} is closed, so it no longer takes questions." |
| 409 | `in_progress` | The same event id is still being answered. |
| 409 | `id_conflict` | An id already used by a different event. |
| 409 | `initiative_mismatch`, `parent_unanswered` | Follow-up rules. |
| 409 | `not_answered` | Still stuck on an event that is not Answered. |
| 409 | `question_scope_fixed` | Switching a question's initiative. |
| 409 | `cannot_publish`, `still_processing`, `not_failed`, `last_ready_document` | Initiative surface. |
| 413, 415 | `too_large`, `unsupported_type` | Upload. |
| 503 | `unavailable` | The database is unreachable before the stream starts. Keep the flag in the outbox. |

## Contract index

| Type | File in `packages/contracts/src` |
|---|---|
| `Flag`, `Question`, `RecordRef` | `concepts/flag.ts`, `concepts/question.ts` |
| `EventBody` | `api.ts` |
| Stream payloads, `InitiativeOption`, `parseSSEEvent` | `sse.ts` |
| `Thread`, `ThreadTurn`, `ThreadAnswer` | `concepts/thread.ts` |
| `DocumentStatus`, `InitiativeDetail`, `InitiativeListItem`, `RoutedItem`, request bodies | `concepts/views.ts` |

Fixtures that both TypeScript and Swift tests decode are in `packages/contracts/fixtures/`. `stub-answered.json` and `stub-provisional-routed.json` are complete streams in the current shape.
