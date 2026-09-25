# Initiatives and Documents

**Iteration:** iteration-1--foundation
**Depends on:** 01-shell, 02-auth-workspace
**Status:** not started

## UX

A leader declares a change and gives Friction the documents that explain it. This spec makes the Initiatives screens from the shell real: the list, the "New initiative" modal, the detail, theses, affected people and owners, document upload with visible processing, publish, edit, and close (flows 3, 3a, 4, 5). Screens keep the shell's layout (Linear initiatives and projects: dense rows, property chips, detail pane). Nothing here is visible to people without the leader permission from 02, except that a published initiative starts appearing in their Ask scope menu and capture initiative chip, which phase 06 consumes.

### Initiatives list (flows 3, 4, 5)

- Sidebar **Initiatives** opens the list. Sections in this order: **Live**, **Draft**, **Closed** (Closed collapsed by default, header shows its count: "Closed (4)"). Within a section, most recently updated first.
- Each row: name (wraps, never truncated), status chip (Draft, Live, Closed), owners by name separated by commas (all of them, wrapping), affected people ("214 people" or "Everyone"), documents ready count ("3 of 3 ready", or "1 of 3 ready, 2 processing"), target date ("30 Oct" or nothing), health word (from seeded rows until phase 09; drafts show nothing).
- Top right: **New initiative** (Cmd-N while the list is focused).
- Loading: three placeholder rows at row height, no spinner text. Error: a line in place of the rows, "Couldn't load initiatives. Check your connection and try again." with a **Try again** button.
- Empty: "No initiatives yet. Create one to tell Friction what is changing, who it affects, and why." with a **New initiative** button.

### New initiative modal (flows 3, 3a)

A sheet over the main window, about 760 by 820 pt, scrolling as it grows. Top to bottom:

1. Name field, placeholder "Initiative name". Large type.
2. "What is changing" multi-line field, placeholder "The new way of working, in a sentence or two."
3. Property chips row: **Owner** (people picker, several allowed), **Affected people** (people picker, see below), **Target date** (date popover, clearable).
4. **Why** section: multi-line field, placeholder "Why the organization is making this change."
5. **Theses** list block. Each thesis is one editable line with a drag handle on the left and a remove X on the right. "+ Thesis" adds a line with the placeholder "Buyers can raise a PO without calling finance." Helper text under the block: "A thesis is a statement about this change that could turn out to be wrong. Friction scores what people hit against each one." Return in a thesis line creates the next line; Backspace in an empty line removes it.
6. **Documents** drop zone. Copy: "Drop the documents that explain this change, or choose files. PDF, Word (.docx), Excel (.xlsx, .xls), PowerPoint (.pptx), HTML, or CSV, up to 25 MB each. Scanned PDFs without selectable text can't be read." **Choose files** opens a standard open panel filtered to those types. Several files may be dropped at once; each becomes a row. The block header shows the summary: "2 of 3 ready".
7. **Try a question** (collapsed disclosure). Stubbed in this spec: the field is present and disabled, with the line "Answer preview is not available yet. It will show the answer an employee would get from these documents, with its citations." Phase 06 makes it real.
8. Footer: **Cancel** (Esc), **Save draft**, and primary **Publish**. Publish is disabled with the reason written beside it, never only on hover: "Needs one ready document" (no ready document) or "Needs a name" (empty name). When there is a ready document but other documents are still processing, beside the enabled button: "2 documents are still processing. They join search when ready."

Behavior:

- The draft is created on the server the first time it is needed: the first document dropped, the first **Save draft**, or **Publish**. If the name is still empty at that moment, the draft is saved as "Untitled initiative" and the name field keeps focus. After the draft exists, every field autosaves 600 ms after the last keystroke, with a quiet "Saved" at the top right of the sheet that fades after 2 seconds; a failed autosave shows "Not saved. Retrying." and retries every 5 seconds until it succeeds.
- **Cancel** with nothing saved closes the sheet and creates nothing. **Cancel** after a draft exists closes the sheet and the list shows the draft; a line at the bottom of the list reads "Your draft is saved in Initiatives." for 4 seconds.
- Processing continues after the sheet closes; a line under the drop zone says so while anything is processing: "Processing continues if you close this window." Quitting Friction while a file is still **uploading** cancels that upload and the document does not appear; anything past uploading continues on the server.
- **Publish** opens a confirmation: title "Publish Procurement rollout?", body "214 people can ask about it and flag against it from now on. They see it the next time they open Ask or flag. Nobody is notified." (or "Everyone in Acme Logistics can..." when Everyone is selected). Buttons **Publish** and **Cancel**. When there are no theses, the body adds "There are no theses yet. What people hit will not be scored until you add one." When there are no affected people, it adds "Nobody is affected yet, so nobody can ask about it until you add people." Neither blocks publishing.
- On publish the sheet closes, the list shows the initiative under Live, and its detail opens.

### Document rows (flow 3a, used in the modal and the detail)

Each row: file-type glyph, title (the file name without extension; click to rename inline), then the state line, then actions. All text wraps; failure reasons are shown in full, inline, in the row, never on hover.

| State | State line | Actions |
|---|---|---|
| Uploading | "Uploading 40%" with a thin progress bar | Cancel |
| Extracting | "Extracting text" with an indeterminate bar | none |
| Indexing | "Indexing" with an indeterminate bar | none |
| Ready | "Ready (212 passages)", then "PDF · 2.4 MB · Uploaded 24 September by Priya Raman" | Replace, Remove |
| Ready with warnings | as Ready, plus "12 of 40 pages had no readable text and are not searchable." | Replace, Remove |
| Failed | "Failed: " then the reason (table below), in the error color | Retry, Replace, Remove |
| Replacing | the Ready line of the version in use, then "Replacing with Procurement Policy v4.pdf: Indexing" | none until it finishes |
| Replacement failed | the Ready line of the version in use, then "Replacement failed: " reason, then "The previous version is still in use." | Retry, Replace |
| Slow | the current state line, then "Taking longer than usual." | Retry |
| Suspect (set by phase 06, flow 9) | Ready line, then a chip **Marked for review** and "Someone said a cited passage did not solve their problem. Upload a corrected version to clear the mark." | Replace, Remove |

Failure reasons, exact copy:

- Rejected before upload, wrong type: "Procurement deck.key can't be used. Friction reads PDF, Word (.docx), Excel (.xlsx, .xls), PowerPoint (.pptx), HTML, and CSV files."
- Rejected before upload, too large: "Policy scans.pdf is 31.4 MB. Files can be up to 25 MB. Split it, or export a smaller PDF."
- No text: "No readable text found. If this is a scanned PDF, export it with selectable text and upload it again."
- Password: "This file is password protected. Remove the password and upload it again."
- Slides without text: "No text found on the slides. Friction reads slide text only, not images or speaker notes."
- Unreadable: "Friction couldn't read this file. Try saving it as a PDF and uploading that."
- Processing never started: "Processing didn't start. Retry."
- Transient errors exhausted: "Indexing stopped after several tries. Retry in a few minutes."
- Upload interrupted (client only): "Upload didn't finish. Retry."

**Replace** opens the open panel for one file; the new file becomes a new version of the same document. The version in use stays searchable until the new one is ready, then swaps in at once. **Replace** is unavailable (button disabled, reason beside it: "Still processing") while a version of that document is processing.

**Remove** asks: "Remove Procurement Policy v3? Its passages leave search right away. Answers already given keep their quotes." Buttons **Remove** and **Cancel**. Removing the last ready document of a live initiative is refused with: "A live initiative needs one ready document. Upload a replacement first, or close the initiative."

**Retry** reprocesses the same file (no new upload) and the row goes back to Extracting.

Status updates arrive by polling every 2 seconds while any row the leader is looking at is processing; the state line changes in place with no animation beyond the bar.

### Initiative detail (flows 4, 5)

- Header: name (click to edit), status chip, and on the right **Publish** (drafts only, same rule and confirmation as the modal) and a "More" menu with **Close initiative**.
- Property chips: Owners, Affected people ("214 people" or "Everyone"), Target date, "Created by Priya Raman on 12 September".
- "What is changing" and "Why": click to edit, autosave as in the modal.
- **Theses**: same block as the modal, each line followed by its verdict chip (Holding, Breaking, No evidence yet; seeded until phase 09). Reorder by drag handle, or with the line's context menu **Move up** / **Move down**. Removing a thesis asks: "Remove this thesis? Insights already scored against it keep the link." 
- **Documents**: header "Documents · 3 of 3 ready", a drop zone row at the end ("Add documents"), then rows as above.
- **Affected people** and **Owners**: each a list of every person by name and email, in a scrolling region that grows with the window; nothing is cut. A search field filters the list locally. **Add people** opens the picker.
- Edits made by another leader appear the next time the detail is opened or refreshed (Cmd-R). No live collaboration.

### People picker (flows 3, 4)

- A popover with a search field over the organization's people directory (from 02): each result shows name, email, and title when the directory has one. Click to add; added people show a check.
- **Paste a list**: a text area that accepts emails separated by commas, spaces, or new lines; afterwards it reports "212 added. 2 not found in the directory: a.lee@acme.com, j.ortiz@acme.com" with every unmatched address listed.
- For Affected people only: a toggle **Everyone in Acme Logistics**. When on, individual selection is hidden and new people added to the directory later are included automatically.
- Owners must come from the directory. A person can be both affected and an owner.
- Empty directory (02 not set up): "No people in the directory yet. An admin imports them in Settings."

### Close (flow 5)

- **Close initiative** asks: "Close Procurement rollout? Chat and flagging for this initiative will stop. Its evidence and insights stay readable." Buttons **Close initiative** (destructive style) and **Cancel**.
- After closing, the detail shows a banner "Closed on 24 September 2026. Chat and flagging for this initiative stopped. Its evidence and insights stay readable." Every edit control is hidden; documents show state only. The initiative moves to the Closed section.
- Employees stop seeing it in their Ask scope menu and capture chip the next time their app refreshes its initiative list. Nobody is notified.

### Permissions

Only people with the leader permission (02) see the Initiatives section and can create, edit, publish, or close. A leader who loses the permission mid-session gets "You no longer have permission to edit initiatives." on their next save and the section disappears on the next refresh.

### Out of scope

The real "Try a question" preview (06), answers and retrieval (06), suspect marking (06, flow 9), document correction by owners through the owner loop and Q&A reapproval (08, flow 19; this spec provides the replace mechanics it uses), verdicts and health (09), reopening a closed initiative, deleting a draft, unpublishing, directory groups as an affected-people selector, duplicate-file detection, image files and speaker notes, OCR, live multi-leader editing, and any notice to employees.

## Technology

### Decisions

| Decision | Rationale | Rejected |
|---|---|---|
| Upload the raw file body through the Worker straight into R2 (`env.FILES.put(key, request.body)`) with a required Content-Length | One hop, no R2 S3 credentials; R2 streams a request body whose length is known (Cloudflare R2 "Upload via Workers API") | Presigned PUT via aws4fetch: needs R2 S3 keys, only worth it above the Worker body limit; multipart form upload: forces buffering to parse |
| Max file size 25 MB | The extract step holds the original, a Blob copy, and the markdown in one isolate with 128 MB memory (Workers limits page); PPTX unzip adds decompressed XML. The request body limit (100 MB on Free and Pro, 200 MB Business, Cloudflare Workers limits page, verified 24 Sep 2026) is not the binding constraint | 100 MB: fits the request limit, risks memory exhaustion in extract |
| Client-generated `documentId` and `versionId` (UUID) on upload | Retried uploads overwrite the same R2 key and upsert the same rows; matches the shell's idempotent flag ids | Server ids: a retried upload after a lost response creates a duplicate document |
| The server persists a version only after the R2 put succeeds; `uploading` is shown from client-side progress only | No orphan rows for abandoned uploads; R2 put is atomic, a failed put writes nothing | Row first with status uploading: needs a stale-upload sweeper |
| Inngest function `document-index` on `ft/document.uploaded` for first uploads, replacements, and retries (`kind` in the payload) | One pipeline; replace differs only in the finalize transaction | Separate functions per kind: duplicated steps |
| `idempotency: "event.data.versionId"` plus producer event `id: versionId` | One run per version; producer ids dedupe for 24 hours (Inngest "Handling idempotency", Context7 `/websites/inngest`) | Idempotency on documentId: blocks replace |
| Retry creates a new version row pointing at the same R2 object | Idempotency on versionId would silently drop a re-sent event for the same version | Re-sending the same versionId |
| Concurrency `[{ key: "event.data.organizationId", limit: 3 }, { scope: "account", key: "\"workers-ai\"", limit: 10 }]` | Per-organization fairness plus one account-wide virtual queue any Workers AI function can join (Inngest concurrency guide, Context7) | Throttle: limits starts, not in-flight steps |
| Extraction: Workers AI `toMarkdown` for pdf, docx, xlsx, xls, html, csv with `conversionOptions: { pdf: { metadata: false } }`; custom PPTX extractor with fflate | toMarkdown supported formats page lists no PPTX (verified 24 Sep 2026); PDF metadata would pollute passages | A third-party parsing API: another vendor and key |
| Chunk step inserts passages with `embedding` null; embed steps fill it; finalize flips the active version | Step outputs stay tiny (ids, counts); no document text in step state; passages of an unflipped version are invisible by the search visibility invariant | Chunks carried between steps as step output; chunks staged as JSON in R2 |
| Embeddings `@cf/qwen/qwen3-embedding-0.6b` with `documents: string[]`, at most 32 per call, 4 calls per step (128 passages per step) | Input schema `maxItems: 32`, context 8,192 tokens, output `{ shape, data }` (schema-input.json and schema-output.json, fetched 24 Sep 2026). `documents` for passages; phase 06 uses `queries` with `instruction` | 100 per call from memory: rejected by the schema |
| Replace and remove are one Postgres transaction each | The single-store bet (brief): atomic swap, no window where an answer sees two versions or none | Two-phase flip across steps |
| Status by polling `GET /v1/documents/:id/status` every 2 s while processing | Brief and research: simpler than Inngest Realtime, whose Workers support is unverified | Inngest Realtime; SSE per document |
| Thesis, member, retry, rename, and passage-inspection routes added inside the existing `routes/initiatives.ts` and `routes/documents.ts` | The shell's rule: handlers inside existing route files, router untouched | New route files mounted in the router |

### Architecture

Files this spec adds or fills, inside the shell's layout:

```
packages/contracts/src/concepts/
  initiative.ts, thesis.ts, document.ts   additive fields (below)
  document-outline.ts                     DocumentOutlineEntry
  views.ts                                InitiativeListItem, InitiativeDetail, DocumentStatus
packages/contracts/src/events.ts          payloads for ft/document.uploaded, .ready, .replaced, .removed
packages/contracts/fixtures/              initiative-detail.json, document-status-*.json, outline.json

apps/api/src/routes/initiatives.ts        flows 3, 4, 5: list, create, get, patch, publish, close, theses, members
apps/api/src/routes/documents.ts          flows 3a, 4, 19: upload, replace, remove, status, retry, rename, passages (debug)
apps/api/src/initiatives/membership.ts    initiativesForUser(userId): the one definition of "belongs to", exported for 06 and 07
apps/api/src/initiatives/publish.ts       canPublish(tx, initiativeId) and publish
apps/api/src/documents/upload.ts          validateUpload (type by extension and magic bytes, size), r2Key
apps/api/src/documents/extract.ts         toMarkdown call, failure classification
apps/api/src/documents/pptx.ts            PPTX to markdown with slide numbers
apps/api/src/documents/chunk.ts           heading-aware chunker, sentence blocks, outline (pure)
apps/api/src/documents/embed.ts           batched embedding
apps/api/src/documents/finalize.ts        ready transaction (first upload, replacement)
apps/api/src/documents/remove.ts          removal transaction
apps/api/src/documents/failure.ts         DocumentFailure codes and human-readable reasons
apps/api/src/documents/visibility.ts      searchablePassages(): the search visibility invariant as a query builder, exported for 06
apps/api/src/inngest/functions/document-index.ts
apps/api/drizzle/00NN_initiatives_documents.sql

apps/mac/Friction/Main/Initiatives/
  InitiativesListView.swift, InitiativeDetailView.swift, NewInitiativeSheet.swift,
  ThesesBlock.swift, DocumentsBlock.swift, DocumentRow.swift, DocumentRowState.swift (pure mapping),
  PeoplePicker.swift, PublishConfirmation.swift, InitiativesModel.swift (@Observable),
  DocumentUploader.swift (URLSession upload with progress), DocumentStatusPoller.swift
apps/mac/Friction/Client/                 LiveClient gains the methods below; FrictionClient protocol extended additively
```

Dependency added to `apps/api`: `fflate` (0.8.x). Consumed from 02, by these names or 02's equivalents (adopt 02's names if they differ and record it in Engineering Notes): `requireActor` (sets `userId`, `organizationId`), `requireRole("leader")` (403 otherwise), and a people directory read that returns `{ userId, name, email, title }` with a text search and a lookup by email.

### Key flows

**1. Create and publish (flow 3).** The Mac generates the initiative id and calls `POST /v1/initiatives` (upsert, `on conflict do nothing`); the creator is inserted as `initiative_member` role `leader`. Fields autosave through `PATCH`. `POST /v1/initiatives/:id/publish` runs in one transaction: lock the initiative row (`select ... for update`), require status `draft`, non-empty name, and at least one document where `removed_at is null` and the active version has status `ready`; set status `live`, `published_at`. Failure: 409 `{ code: "needs_ready_document" | "needs_name" | "not_draft", message }` with the UI copy as message. Publishing creates nothing else: passages already exist and Q&A starts empty; phase 06 retrieval includes the initiative because its status is now `live`.

**2. Upload (flow 3a).** `POST /v1/initiatives/:id/documents?documentId=&versionId=` with headers `Content-Type`, `Content-Length`, `x-ft-filename` (percent-encoded). Steps: `requireRole("leader")`; initiative not closed (409); `Content-Length` present (411) and at most 26,214,400 bytes (413 with the too-large copy); extension in the allowed list (415); stream `request.body` to R2 at `org/{orgId}/initiatives/{initiativeId}/documents/{documentId}/{versionId}/original.{ext}`; then read the first 8 bytes back with a ranged get and check magic bytes: `%PDF-` for pdf, `PK\x03\x04` for docx, xlsx, pptx, `D0 CF 11 E0` for xls, valid UTF-8 for html and csv. A docx, xlsx, or pptx starting with `D0 CF 11 E0` is an encrypted Office file: reject with the password copy. Mismatch: delete the object, 415. Then one transaction inserts `document` (if new; title from the file name) and `document_version` (status `extracting`, `kind: "initial"`), and the route awaits `inngest.setEnvVars(c.env).send({ id: versionId, name: "ft/document.uploaded", data })`. If the send throws, the version is marked `failed` with code `enqueue_failed` and the route still returns 201 with that status. Response: `DocumentStatus`.

The Mac uploads with `URLSession.upload(for:fromFile:)` and a task delegate reporting `didSendBodyData` for the percentage, two uploads at a time. It validates type and size before uploading using the same list and limit (both sides; the server is the authority).

**3. Index (`document-index`).** Config: `id: "document-index"`, `triggers: { event: "ft/document.uploaded" }`, `idempotency: "event.data.versionId"`, the concurrency array above, `retries: 4` (the documented default, set explicitly), `onFailure`. Bindings reach the function through the shell's Hono bindings middleware (`ctx.env`); one Drizzle client per step over `HYPERDRIVE`.

- `extract`: load the R2 object. PPTX goes to `pptx.ts`; everything else to `env.AI.toMarkdown({ name, blob }, { conversionOptions: { pdf: { metadata: false } } })`. A result with `format: "error"` throws `DocumentFailure("unreadable")` (a `NonRetriableError`) unless its `error` text mentions a password or encryption (`password_protected`). A PDF whose raw bytes contain `/Encrypt` and yields no text is `password_protected`. Writes markdown to R2 at `.../{versionId}/extracted.md`, records `char_count`. Returns `{ chars }`.
- `chunk`: read the markdown; run `chunk.ts`; if the body text (excluding page and slide markers and headings) has fewer than 200 non-whitespace characters, throw `no_text` (or `pptx_no_text` for PPTX). Otherwise, in one transaction, delete any passages of this version (retry safety), insert all passages with `embedding` null, store `outline` and `warnings` on the version, set status `indexing`. Returns `{ passageCount }`.
- `embed-{n}` for n in 0 to ceil(passageCount / 128) - 1: select this version's passages at positions `[128n, 128n+128)`, build inputs `"{document title}\n{heading path joined by ' > '}\n\n{text}"`, call `env.AI.run("@cf/qwen/qwen3-embedding-0.6b", { documents })` in slices of 32, assert `shape[1] === 1024` (else throw, retried), update embeddings. Returns `{ embedded }`.
- `finalize`: the ready transaction (below). Then `step.sendEvent("ready", { name: "ft/document.ready", data })`, and for replacements also `ft/document.replaced`.
- `onFailure`: read `event.data.event.data` (the original event, per Inngest's failure payload), map the error to a code (`DocumentFailure.code`, else `indexing_error`), and set the version `failed`, `failure_code`, `failure_reason` (human copy from `failure.ts`), `finished_at`. It never touches `document.active_version_id`, so a failed replacement leaves the version in use untouched.

**4. The ready transaction (flows 3a, 4, 19).** Lock the `document` row. If `removed_at` is set, delete this version's passages and mark it failed with reason "Removed before indexing finished." and stop. Otherwise, verify every passage of this version has an embedding (else throw, retried), then: set the version `ready`, `passage_count`, `finished_at`; set `document.active_version_id` to this version; delete every passage of every other version of this document; set `document.suspect = false`. Commit. Flow 19 depends on the suspect clear and the old-passage delete happening in this one transaction.

**5. Replace (flow 4).** `PUT /v1/documents/:id?versionId=` with the same headers and validation as upload. 409 "Still processing" when any version of the document is `extracting` or `indexing`. Inserts a version with `kind: "replacement"` and sends `ft/document.uploaded`. The active version stays searchable until step 4 commits.

**6. Remove (flow 4).** `DELETE /v1/documents/:id`, one transaction: lock the initiative and document; if the initiative is `live` and this is its only non-removed document with a ready active version, 409 `last_ready_document`; else delete all passages of all its versions, set `removed_at`, `removed_by_user_id`, `active_version_id = null`. Then send `ft/document.removed`. A version still processing is handled by step 4's removed check. R2 objects are kept.

**7. Retry.** `POST /v1/documents/:id/retry` when the latest version is `failed` or slow (processing and `updated_at` older than 30 minutes): insert a new version with the same `r2_key`, `kind: "retry"`, `retry_of_version_id`, send the event. 409 otherwise.

**8. Close (flow 5).** `POST /v1/initiatives/:id/close`: status `closed`, `closed_at`. Passages stay (evidence stays readable); phase 06 excludes closed initiatives by status. Closed initiatives reject every mutation with 409 `closed`.

**Chunker (`chunk.ts`, pure).**

- Parse markdown into blocks: headings, paragraphs, list items, tables, and locator markers. Locator markers are toMarkdown's `### Page N` lines under `## Contents` for PDFs (seen in Cloudflare's toMarkdown example output; confirm against the fixture) and `## Slide N: Title` lines from the PPTX extractor. Markers set the current locator and never enter the heading path (a slide title does enter it).
- Heading path is the stack of enclosing headings. Spreadsheets have a null locator and the sheet name in the heading path.
- Pack blocks into passages targeting 400 estimated tokens (estimate: characters divided by 4), minimum 300 unless the section ends, maximum 500. Never pack across an H1 or H2 boundary. A block over 500 splits at sentence boundaries, then at word boundaries. A table over 500 splits between rows and repeats the header row in each part.
- Overlap: each passage after the first in a section starts with the trailing whole sentences of the previous passage, about 15% of its tokens (at least one sentence).
- Each passage stores `sentences`: sentence blocks from `Intl.Segmenter` (sentence granularity) such that `sentences.join("") === text`. Phase 06 sends them as `search_result` content blocks for citations.
- Each passage stores `char_start`, `char_end` in the extracted markdown, `token_estimate`, `section_id`.
- Outline: one entry per heading `{ id: "S001", level, title, headingPath, locator, firstPosition, lastPosition }`, ids sequential per version. With fewer than 3 headings, one entry per page or slide instead, titled "Page 4: " or "Slide 4: " plus the first line of text on it. Phase 06 composes the initiative outline from the active versions' outlines (prefixing each id with the document's position).
- Warnings: pages or slides with no text are listed by number in `warnings` ("12 of 40 pages had no readable text and are not searchable."). No text the file contained is dropped silently.

**PPTX extractor (`pptx.ts`).** `unzipSync(bytes, { filter })` (fflate, Context7 `/101arrowz/fflate`) keeping `ppt/presentation.xml`, `ppt/_rels/presentation.xml.rels`, and `ppt/slides/slideN.xml` with `originalSize` at most 20 MB each (zip bomb guard; larger fails `unreadable`). Slide order comes from `p:sldIdLst` in `presentation.xml` resolved through the rels file, falling back to N; the locator is the order a person sees in PowerPoint. Per slide, paragraphs are `<a:p>` elements and their text is the joined `<a:t>` runs, entity-decoded; the title is the text of the shape whose placeholder type is `title` or `ctrTitle`. Output per slide: `## Slide 3: Approvals` then paragraphs separated by blank lines. Regex over the XML: Workers has no DOMParser.

### Interfaces

Routes (all `requireActor`; mutations `requireRole("leader")`; every query scoped by `organization_id`):

- `GET /v1/initiatives`: leaders get every initiative in the organization as `InitiativeListItem[]`; everyone else gets only `live` initiatives from `initiativesForUser` with `{ id, name, whatIsChanging }`.
- `POST /v1/initiatives` `{ id, name?, whatIsChanging?, why?, targetDate? }` → `InitiativeDetail`.
- `GET /v1/initiatives/:id` → `InitiativeDetail` (initiative, theses ordered by position, members, documents with `DocumentStatus`).
- `PATCH /v1/initiatives/:id` `{ name?, whatIsChanging?, why?, targetDate?, affectsEveryone? }`.
- `POST /v1/initiatives/:id/publish`, `POST /v1/initiatives/:id/close`.
- `POST /v1/initiatives/:id/theses` `{ id, statement, position? }`; `PATCH /v1/theses/:id` `{ statement }`; `DELETE /v1/theses/:id` (soft delete); `PUT /v1/initiatives/:id/theses/order` `{ thesisIds: string[] }` (rewrites positions 0 to n-1 in one transaction; 400 unless the ids are exactly the initiative's current theses).
- `POST /v1/initiatives/:id/members` `{ role: "affected" | "owner", userIds?: string[], emails?: string[] }` → `{ added: number, notFound: string[] }`; `DELETE /v1/initiatives/:id/members/:userId?role=`.
- `POST /v1/initiatives/:id/documents`, `PUT /v1/documents/:id`, `DELETE /v1/documents/:id`, `POST /v1/documents/:id/retry`, `PATCH /v1/documents/:id` `{ title }`.
- `GET /v1/documents/:id/status` → `DocumentStatus { documentId, title, suspect, activeVersion: DocumentVersion | null, latestVersion: DocumentVersion, slow: boolean }`.
- `GET /v1/documents/:id/passages` (Debug builds' inspector, leader only): passages of the active version with heading path, locator, text, sentences.

Error body everywhere: `{ code, message }`, where `message` is the exact UI copy above.

Events (`packages/contracts/src/events.ts`, payload schemas filled in):

- `ft/document.uploaded` `{ organizationId, initiativeId, documentId, versionId, kind: "initial" | "replacement" | "retry" }`
- `ft/document.ready` `{ organizationId, initiativeId, documentId, versionId, passageCount }`
- `ft/document.replaced` `{ organizationId, initiativeId, documentId, previousVersionId, versionId }` (for 08 and 09; no consumer in this spec)
- `ft/document.removed` `{ organizationId, initiativeId, documentId }` (no consumer in this spec)

Contracts (additive, optional or defaulted fields only): `Initiative` gains `affectsEveryone`, `publishedAt`, `createdByUserId`, `updatedAt`. `Document` gains `removedAt`. `DocumentVersion` gains `originalFilename`, `kind`, `failureCode`, `warnings: string[]`, `finishedAt`. New `DocumentOutlineEntry`, `InitiativeListItem`, `InitiativeDetail`, `DocumentStatus`. Swift mirrors and fixtures updated in the same commit; the shell's drift test covers them.

Migration `00NN_initiatives_documents.sql` (additive only):

- `initiative`: `affects_everyone boolean not null default false`, `published_at timestamptz`, `created_by_user_id text`, `updated_at timestamptz not null default now()`.
- `thesis`: `removed_at timestamptz`, `created_at`, `updated_at`.
- `initiative_member`: unique `(initiative_id, user_id, role)`, `added_by_user_id text`, `created_at`.
- `document`: `removed_at timestamptz`, `removed_by_user_id text`, `created_by_user_id text`.
- `document_version`: `original_filename text not null`, `kind text not null default 'initial'`, `retry_of_version_id uuid`, `markdown_r2_key text`, `char_count integer`, `outline jsonb not null default '[]'`, `warnings jsonb not null default '[]'`, `failure_code text`, `updated_at`, `finished_at`.
- `passage`: `sentences jsonb not null default '[]'`, `char_start integer`, `char_end integer`, `token_estimate integer`, `section_id text`; btree on `(document_version_id, position)`. `embedding` must be nullable; if the shell declared it `not null`, dropping that constraint is the one non-additive change, recorded in Engineering Notes.
- `citation.passage_id`, if the shell declared a foreign key, becomes `on delete set null` so removing or replacing a document never deletes answers; citations already carry their quote, document title, and locator.

Search visibility invariant (`visibility.ts`, used by 06): a passage is searchable only when `passage.document_version_id = document.active_version_id`, `document.removed_at is null`, and `initiative.status = 'live'`. Passages of a version still indexing exist in the table and must never be returned.

`initiativesForUser(userId)`: live initiatives where the person has an `initiative_member` row with role `affected` or `owner`, or `affects_everyone` is true for their organization.

Mac client additions to `FrictionClient`: `initiatives()`, `initiative(id)`, `createInitiative`, `updateInitiative`, `publish`, `close`, thesis add, edit, remove, reorder, member add and remove, `uploadDocument(fileURL, initiativeId, progress)`, `replaceDocument`, `removeDocument`, `retryDocument`, `renameDocument`, `documentStatus(id)`, `searchPeople(query)`. `FixtureClient` keeps working for the Debug "Empty data" and offline previews.

### Tests (each seen failing for the named mutation before it is trusted)

- **Chunker coverage, property (fast-check over generated markdown).** Every non-whitespace character of the body appears in at least one passage, and for every passage `sentences.join("") === text`. Mutation: skip flushing the buffered block at a section boundary; the property fails and shrinks to a two-section document.
- **Chunker sizes.** No passage exceeds 500 estimated tokens unless it is a single word run; consecutive passages in one section share a leading overlap of 10 to 20%. Mutation: set overlap to 0; the overlap assertion fails.
- **Heading path and locator.** A fixture with `## Contents`, `### Page 3`, `# Approvals`, `## Thresholds` yields exactly (`toStrictEqual`) the expected passages with `headingPath: ["Approvals", "Thresholds"]`, `locator: 3`. Mutation: treat page markers as headings; fails.
- **Outline.** The fixture yields the exact outline entries; a document with two headings falls back to page entries. Mutation: change the fallback threshold to 0; fails.
- **PPTX.** A committed three-slide `.pptx` whose `slide3.xml` is second in `p:sldIdLst` produces the exact markdown, including a decoded `&amp;`. Mutation: order slides by file name; fails.
- **Upload validation (route test in workerd).** Content-Length 26,214,401 returns 413 with the exact too-large message; a `.pdf` whose bytes start with `PK` returns 415; an encrypted `.docx` returns the password message. Mutations: `>` changed to `>=` at the boundary (test at exactly 26,214,400 returns 201), magic check removed; each fails.
- **Publish rule (integration, Neon branch).** A draft whose only document is indexing, failed, or ready but removed gets 409 `needs_ready_document`; with one ready document it becomes `live`. Mutation: count documents without the status filter; fails.
- **Ready transaction (integration).** After finalizing v2 over a ready, suspect v1: `active_version_id = v2`, zero passages with v1's id, `suspect = false`, and `searchablePassages` returns exactly v2's passage ids. A fault injected after the flip and before commit leaves v1 active with all its passages. Mutations: omit the suspect clear; move the passage delete to its own transaction; each fails.
- **Visibility during indexing (integration).** With v1 ready and v2's passages inserted but not finalized, `searchablePassages` returns exactly v1's ids. Mutation: drop the active-version join; fails.
- **Remove (integration).** Removing the only ready document of a live initiative returns 409 and leaves its passages; removing one of two leaves zero passages for it and keeps answers' citation rows. Mutation: skip the live check; fails.
- **Failure mapping.** `onFailure` given a `no_text` error on a replacement sets the new version's reason to the exact no-text copy and leaves `active_version_id` unchanged. Mutation: have `onFailure` clear the active version; fails.
- **Permissions.** A non-leader gets 403 on every mutation route (table-driven), and `GET /v1/initiatives` returns no drafts to a non-leader and only initiatives they belong to. Mutation: remove `requireRole("leader")` from one route; its row fails.
- **Function config.** `document-index` has `idempotency === "event.data.versionId"` and both concurrency entries exactly. Mutation: key idempotency on documentId; fails. (This one guards configuration that no behavioral test can reach.)
- **Swift: `DocumentRowState`** maps each `DocumentStatus` fixture to the exact state line and actions in the UX table, including Replacing and Replacement failed. Mutation: derive the row from `latestVersion` only; the Replacing case fails.
- **Swift: publish gating.** The sheet's model enables Publish iff a document is ready and the name is non-empty, and shows the exact reason otherwise. Mutation: treat `indexing` as ready; fails.
- **Swift: poller.** Stops when every visible document is terminal and restarts on upload. Mutation: never stop; fails on the request count.
- **Real Workers AI, run once (records unverified facts).** An image-only PDF fixture ends `failed` with `no_text`; a 25 MB PDF completes within the default step limits; record the extract duration and the observed `### Page N` format in Engineering Notes.

### Rollout

1. Worktree on branch `iteration-1/05-initiatives-documents`; Neon branch of the same name (`neon checkout`), migrations against its direct URL, `neon diff` before commit.
2. Local: `wrangler dev --port 8787` (the one API dev server, restarted from this worktree) with `INNGEST_DEV=1`, then `bunx inngest-cli@latest dev -u http://localhost:8787/api/inngest` (UI on 8288). R2 is simulated locally; Workers AI runs remotely even in local dev and counts against the account's limits (Workers AI limits page), which requires the Cloudflare account access listed in the brief.
3. `wrangler.jsonc`: add `limits.cpu_ms: 120000` (additive; Workers Paid; default is 30 s, maximum 300 s per the Workers limits page) as headroom for PPTX unzip and chunking of large files.
4. Merge to `main`; push deploys the Worker; resync the app in Inngest Cloud so `document-index` appears; upload one real PDF, DOCX, XLSX, and PPTX in production and watch each reach Ready.
5. Rollback: revert the commits. The migration is additive, so the old code runs against the new schema. Documents already uploaded stay in R2.

Unverified, to settle during build and record in Engineering Notes: whether `toMarkdown` performs OCR on scanned PDFs (Cloudflare's docs describe text extraction only; the design treats no text as a failure either way), any `toMarkdown` size or page limit (none documented), `Intl.Segmenter` availability in workerd (the chunker tests run in workerd and prove it), Inngest's maximum steps per run (a 25 MB spreadsheet could exceed 128,000 passages only in extreme cases; if the limit bites, raise the passages per step), and the exact `### Page N` marker format.

### Open decisions

Recommended defaults, built on in this spec, for Andrés to confirm:

1. **Max file size 25 MB**, set by Worker memory rather than the request body limit.
2. **Publish blocks only on a ready document and a name.** Missing theses and missing affected people are stated in the confirmation, not enforced.
3. **Any leader in the organization can edit any initiative**, not only its creator or its `leader` members.
4. **Removing a thesis is a soft delete** that keeps insight links, so evidence scored against it is not lost.
5. **Removed and replaced document files stay in R2.** Only their passages leave search.
6. **Affected people are chosen as individuals, pasted emails, or Everyone.** Directory groups wait until 02 imports groups.
7. **Accepted types are PDF, DOCX, XLSX, XLS, HTML, CSV, PPTX.** Images, ODT, ODS, Numbers, and legacy DOC and PPT are refused; PPTX speaker notes are not indexed.
8. **No notice to affected employees on publish** (product.md open question; the default follows the never-initiate rule).
9. **Removing the last ready document of a live initiative is refused** rather than allowed with the initiative left unanswerable.

---

## Sessions

- 2026-09-24: Initial spec · `claude -r cf097e99-94f3-4cce-9596-642e0c0c18b8`
