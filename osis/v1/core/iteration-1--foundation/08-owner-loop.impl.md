# Owner Loop

**Iteration:** iteration-1--foundation
**Depends on:** 06-answer-pipeline
**Status:** not started

## UX

This spec closes the loop the employee opened. An event the documents could not answer, or an answer that left someone stuck, reaches the people accountable for the initiative. They write one canonical answer in their own words, approve it, and the next person who asks gets it instantly. When a document was wrong, they upload a corrected version. When the problem behind an insight is fixed, they record it in one line, and every employee who flagged or asked about it hears so in their home window. Flows 18, 19, 20, 21.

Reference models: the owner side of Q&A follows Slite's knowledge-management quick filters (tiles for the three lists) and Notion's Verified popover ("Approved by X, date"); the initiative surface keeps Linear's dense lists, property chips, and right-hand detail pane (research Part 1, sections 5, 7, 10). Fix notice tone follows Canny and Linear Asks: say what changed, never a content-free thanks.

This is not a helpdesk. There are no ticket ids, no priorities, no SLAs, no assignees inside the lists, no "resolved" status on an employee's event. The lists below are a curation surface for the initiative's Q&A, nothing more. (product.md Boundaries: "It does not manage tickets, queues, or service levels.")

### Who sees what

- **Leaders** (the org-level leader permission granted in flow 1) see everything below for every initiative in the organization.
- **Owners** (an `InitiativeMember` with role `owner`) who are not leaders see the initiative section of the sidebar with two items only: **Owner Q&A**, scoped to initiatives they own, and **Insights**, filtered to insights assigned to them, under the header "Assigned to you". They do not see Initiatives or Health.
- **Everyone else** sees no initiative section, exactly as in the shell. A direct API call returns 403.
- Nobody on this surface ever sees who sent an event: no name, no initials, no avatar, no email, no user id, no time of day. Dates show by day only ("22 September").

### Sidebar

The initiative section (shell) gains one item, **Owner Q&A**, between Initiatives and Insights. The section now shows when the person is a leader or owns at least one initiative. The item carries no badge and no count; nothing on this surface asks for attention.

### Owner Q&A page (flow 18, 19)

Layout, top to bottom, in the content area:

1. Title "Owner Q&A" and, to its right, an initiative chip: "All your initiatives" by default, with a menu listing every initiative in scope (live first, then draft; closed initiatives are listed under a "Closed" divider and are read-only).
2. Three tiles in one row, Slite style, each a rounded rectangle with a label and a count: **To answer 7**, **Needs re-approval 2**, **Published 14**. The selected tile is the list below it. Default selection: To answer.
3. A list on the left (about 55% width) and a detail pane on the right.

Counts refresh when the page opens, when the app comes to the foreground, and after every action on the page. No polling while the page is idle.

#### To answer

- Phase 06 already added a read-only "Sent to owner" section to initiative detail. This phase keeps it and adds one line under its heading for owners and leaders: "Answer these in Owner Q&A" linking to this queue, filtered to the initiative. No second list of routed events is built there.

Two kinds of rows, in one list.

**Routed events** (unanswerable and still-stuck flags and questions routed to this initiative's owners by phase 06):
- A flag or question glyph, the text in full (the flag's transcript or the question), wrapped, never truncated.
- A class pill: **Sent to owner** (unanswerable) or **Still stuck**.
- The initiative chip (hidden when a single initiative is selected), the day it was sent ("22 September"), and "23 others hit this" when phase 06 recorded a count above zero.
- When several routed events have exactly the same text after normalization (lowercase, punctuation stripped, whitespace collapsed), they collapse into one row with "Sent 3 times". Nothing smarter groups them in this phase; similarity grouping is clustering (flow 13, phase 09).
- Still-stuck events that came from "Still happening?" (flow 21, below) carry the line "Still happening after the fix: POs no longer need a finance call".

**Drafted Q&A entries** (produced by flow 15 in phase 09; in this phase only seeded rows exist):
- A **Draft** chip, the canonical question in full, "From 12 reports".

Order: rows with more reports first (a group's count, a draft's report count), then oldest first. This ranks problems, never people.

Selection:
- Click selects one row. Cmd-click and Shift-click select several routed-event rows; the list toolbar then shows **Answer 3 together** and **Set aside**. Drafts cannot be multi-selected with other rows.

Detail pane for routed events:
- Section "What people sent (not published)": each selected event's text in a quote block, with its class pill and day. No screenshot, no clip, no app names in this pane (see anonymity below).
- Section "What they were told": the answer each event received, rendered with the same answer card component as the home window, read-only, citations included, so the owner sees which passage misled someone.
- The composer:
  - **Question, as it appears in Q&A**: an empty text field (never prefilled with what someone sent), placeholder "Write the question in your own words, for everyone". Helper text under it: "Q&A shows your wording only, never what someone sent."
  - **Answer**: multi-line, grows with content, placeholder "Answer it the way you'd want the next person to read it."
  - **Based on**: document chips, prefilled with the documents cited in the selected events' answers, removable; "+ Document" lists the initiative's ready documents. Optional. Helper: "If one of these documents changes, this entry comes back to you for re-approval."
  - Buttons: primary **Approve and publish** (Cmd-Return), secondary **Save draft**, a menu button **Attach to a published entry** (lists the initiative's published entries by canonical question), and **Set aside**.
- Footer line under the buttons: "Everyone who sent these is told in their home window. They see your answer, not each other."

Detail pane for a draft: same composer, prefilled with the draft's canonical question and answer (a draft's question was written by phase 09 or an owner, never an employee), "From 12 reports" and no event texts. The quote section is replaced by "Drafted from 12 reports".

States:
- **Publishing**: the primary button shows a spinner and "Publishing"; fields are disabled. Typically under a second.
- **Published**: the rows leave the list; a banner at the top of the list reads "Published to Procurement rollout Q&A. 3 people who asked are told in their home window." (the number is distinct people, never events). The entry is searchable in the answer pipeline the moment this banner appears.
- **Validation** (inline under the field, field outlined red):
  - Empty question: "Write the question."
  - Empty answer: "Write the answer."
  - Verbatim: "This matches what someone sent. Rewrite it in your own words." (the service rejects a question equal to any attached event's text after normalization, or containing a run of 8 or more consecutive words from one).
- **Conflict**: another owner answered or set aside some of the selected events first: "Another owner just handled some of these. The list is refreshed." The list refreshes; the composer keeps its text.
- **Failure**: "Couldn't publish. Nothing changed. Try again." Nothing was published and nobody was told (the publish is one transaction).
- **Closed initiative**: rows show read-only, the composer is replaced by "This initiative is closed. Its Q&A stays readable but does not change."
- **Set aside**: the rows leave the list with an inline "Set aside. Undo" line for 8 seconds. Confirmation text before the first set-aside of a session: "Set aside keeps this in the evidence. It just won't appear here again." Set-aside events still count as signal and still feed insights.
- **Attach to a published entry**: the rows leave the list; banner "Added to 'Can I raise a PO under 500 without finance?'. 2 people are told in their home window."
- **Empty**: "Nothing to answer. Questions the documents couldn't answer, and answers that left someone stuck, land here."
- **Loading**: three placeholder rows at full row height, no shimmer animation.
- **Error loading**: "Couldn't load. Check your connection and try again." with a **Try again** button.

#### Needs re-approval

Two groups, each with a small header.

**Documents marked suspect** (flow 19). One row per document whose suspect mark is set (phase 06 sets it on still stuck):
- Document title, "Marked suspect 23 September", "Someone was still stuck after it was cited 3 times".
- The cited passages that preceded those still-stuck events, as quote blocks with section name. These are document text, never employee text.
- **Upload corrected version** opens a file picker (same types as phase 05). The row then shows phase 05's processing states in place: "Uploading 40%", "Extracting", "Indexing", then "Ready (214 passages)". On ready: the suspect mark clears, the row leaves the group, and a banner reads "Corrected. 2 Q&A entries based on it need re-approval." (or "Corrected." when none depend on it).
- Failure: "Failed: couldn't read this PPTX. The current version stays in use." with **Retry** and **Replace**. The suspect mark stays.
- **The document is right** clears the mark without uploading, after a confirmation: "Clear the suspect mark? The still-stuck reports stay in To answer."

**Q&A entries**. One row per entry with status needs re-approval:
- Canonical question in full, then the reason line, one of:
  - "Procurement Policy v3 was corrected on 24 September."
  - "Procurement Policy v3 was marked suspect: someone was still stuck after it was cited."
  - "Someone was still stuck after this answer."
- Under it: "Withheld from answers until you re-approve."
- Detail pane: the entry's question and answer in the composer, the Based on chips, and for a corrected document an **Open corrected version** link. Buttons: **Re-approve** (publishes as is), **Approve and publish** after any edit, and **Unpublish**, which confirms "Remove this from Q&A? It goes back to To answer as a draft. People who were already told keep their notice."
- Re-approving sends no new notices.

Empty: "Nothing needs re-approval. Entries land here when a document they rest on changes, or when someone is still stuck after them."

#### Published

- One row per published entry: canonical question and answer in full, "Approved by Priya Raman, 18 September", "Asked by 41 people", "Based on: Procurement Policy v3".
- Detail pane: **Edit** (opens the composer; saving is **Approve and publish**, which re-embeds and re-publishes at once and sends no new notices) and **Unpublish** (same confirmation as above).
- Empty: "Nothing published yet for Procurement rollout."

### Anonymity on this surface

- The routed-event text (transcript or question) is shown to owners and leaders, because it is the thing being answered. It is never published: Q&A shows only the owner's canonical wording.
- Screenshots, clips, and app names of individual routed events are not shown on this page. Evidence of that kind appears only in the insight evidence panel, under the anonymity threshold (default 5 distinct employees; below it the panel shows "Evidence visible at 5 reports", as in the shell).
- Counts are always of distinct people or of reports, never lists of people.

### Record fix (flow 20)

On the Insights page (shell), the insight detail pane's footer gets a live **Record fix** button for leaders and for the insight's owner. For anyone else it is absent. An insight with no owner shows the button to leaders only (assigning owners is flow 17, phase 09).

The button opens a sheet over the detail pane:
- Title "Record fix", then the insight's title in full.
- **What changed**: a single-line field, required, placeholder "POs no longer need a finance call. Approval now goes to your manager." A character counter appears after 200 characters; the limit is 280 and the field refuses more input rather than cutting text later.
- **Corrected document**: optional document picker over the initiative's documents. When set, the notice links to it.
- A preview box: "12 people who flagged or asked about this will see:" followed by the notice exactly as it will render in their home window (title, line, link, "Still happening?" button shown inert).
- Primary **Record fix and notify 12 people**, secondary **Cancel**. When nobody is behind the insight's reports: primary reads **Record fix** and the preview box reads "Nobody is behind this insight's reports yet, so no one is notified."
- Mid-action: "Recording". Failure: "Couldn't record the fix. Nothing was sent. Try again."

After recording, the insight row's fix state reads "Fixed 24 September" and the detail pane shows "Priya Raman: POs no longer need a finance call. Approval now goes to your manager." and "12 people notified". An insight can be fixed more than once: when "Still happening?" reports arrive after a fix, the row shows "Still happening since the fix: 2" and the button reads **Record another fix**. The newest fix is the one shown; earlier fixes list under "Earlier fixes" with their dates.

### What the employee sees (flow 21, rendered by phase 07)

Phase 07 renders notices in the home window. This spec defines their content and the one action on them.

- **Fix notice** (pinned, as in the shell): title "Fixed: POs no longer need a finance call. Approval now goes to your manager." (the owner's line), body "You reported this on 22 September. Procurement rollout." (the employee's own earliest related event, their own record), link "See the corrected passage" when a document was set, and **Still happening?**.
- **Q&A notice**: title "Answered: Can I raise a PO under 500 without finance?" (the canonical question), body "Priya Raman answered a question you asked about Procurement rollout." Opening it shows the entry in Q&A.
- **Still happening?** opens a small sheet in the home window: "Tell the owner this is still happening". It states exactly what leaves the Mac: "This sends: 'Still happening' about 'Fixed: POs no longer need a finance call', plus the line below if you add one. Leaders see it without your name." An optional one-line field "What's still happening? (optional)". Buttons **Send** and **Cancel**. Nothing is sent before Send.
- After Send: the pinned item shows "You said this is still happening. It's with the owner." and a new row appears in My record with class Still stuck, outcome With owner.
- Offline or failure: "Couldn't send. Try again when you're connected." Nothing is queued; the employee retries.

### Out of scope

- Flow 17 (review insight, assign owner), clustering, insight generation, Q&A drafting, and health computation: phase 09. This spec works against seeded insights, clusters, and draft entries.
- Similarity grouping of routed events beyond exact normalized text.
- Any notice for a document correction on its own (the owner publishes a Q&A entry or records a fix to tell people).
- A "Reopened" notice to other employees when someone says still happening.
- System notification banners, badges, emails. Never.
- Rendering the home window, notice list, and read state (phase 07).
- Withdrawing a flag, attaching a name to a flag (product open questions, untouched).

## Technology

### Decisions

| Decision | Rationale | Rejected |
|---|---|---|
| "Who asked" in v1 is the `qa_entry_event` link: the routed events an owner attaches to an entry (and, from phase 09, the cluster members a draft is built from). Notices go to the distinct users behind those events. | One explicit record, written at the moment of attachment, needs no clustering; phase 09 fills the same table for drafts, so the notice function never changes | Nearest-neighbour "similar askers" at publish: invents clustering early and notifies people who asked something else |
| Embed and write the entry inside the approve request, in one transaction with the status change; Inngest only fans out notices | Flow 18 says searchable at once; research Part 2 flow map allows "inside the approval request"; a published row without an embedding would be unsearchable and break the promise | Embedding in `ft/qa.published`: seconds of window where a published entry cannot be found |
| Embed failure fails the whole approve (503) | Never a published entry that retrieval cannot see | Publish and backfill the embedding later |
| Embedded text is "Question: {question}\nAnswer: {answer}" with phase 05's embedder (`@cf/qwen/qwen3-embedding-0.6b`, 1024 dimensions) | Matches both question-to-question and content matches; one model for passages and Q&A so cosine scores are comparable in 06's merged retrieval | Question only: misses askers who describe the symptom the answer names |
| Verbatim guard on the service: reject a canonical question equal to any attached event text after normalization, or containing 8 or more consecutive words of one | The rule "never an employee's own words" enforced where it cannot be bypassed; normalization defeats case and punctuation edits | Client-side only check: bypassable, duplicates logic; semantic similarity check: false positives on legitimately close rewrites |
| Needs re-approval entries are withheld from retrieval and from employee Q&A browsing (phase 06 and 07 serve `status = 'published'` only; this spec does not change their filters) | An answer resting on a document that changed or misled someone should not keep being served beside the corrected document; the owner re-approves in one click | Keep serving until re-approved: needs 06 and 07 filter changes and risks serving a contradicted answer. Recorded as an open decision. |
| Transitions to `needs_reapproval` come from this spec's own Inngest functions listening to `ft/event.still_stuck` and `ft/document.ready` | Inngest runs every function subscribed to an event (Context7 `/websites/inngest`, fan-out-jobs guide), so 08 adds behavior without editing 05's or 06's functions | Editing 06's still-stuck function and 05's replace transaction: non-additive, merge conflicts with parallel phase 07 |
| Suspect clears on the ready replacement version in 08's `document.ready` listener (and "The document is right" clears it directly) | Reuses 05's replace path untouched; a replacement of a suspect document is the correction | A separate "correct document" upload route: duplicates 05's ingestion |
| Fix recipients resolve through insight to clusters to `cluster_member` to events. Seeded insights get seeded clusters and members that point at real dev events. | The same query works unchanged when 09 produces real clusters; no throwaway table | An `insight_event` table for seeds: removed again in 09 |
| New entries use a client-generated UUID and the shell's `POST /v1/qa/:id/answer` (save draft, upsert) and `POST /v1/qa/:id/approve` (upsert and publish) | Uses shell routes; retries are idempotent | A separate create route |
| New routes live inside the existing route files that hold the qa, documents, insights, and me routes | Shell rule: never touch the router | A new `owner.ts` mounted in the router |
| Notices carry a unique index on `(user_id, kind, ref_id)` and inserts use `ON CONFLICT DO NOTHING`; a 15-minute Inngest cron sweep re-runs the resolvers for fixes and publications of the last 7 days | "Tell employees when a problem they flagged gets fixed" is an Always rule; a lost `waitUntil` send must not lose a notice; the unique index makes every retry and the sweep safe | Trusting `waitUntil` alone; a transactional outbox table: more machinery than an idempotent sweep |
| Re-approval and edits send no new notices; attaching new events to a published entry notifies only the newly attached people | The unique notice index gives this for free and avoids repeat notices | Notify all askers on every edit |
| "Still happening?" creates a `Flag` with class `still_stuck` directly, linked to the fix, with no answer pipeline run | The answer is already known (the fix did not hold); the flag is signal and routes to the owner like any still-stuck event | Running it through 06's pipeline: would answer with the corrected document the employee just said did not help |
| Owner-queue payloads never select user columns; dates are serialized as `YYYY-MM-DD` | The rule "Show a leader which person sent a flag" is a Never; enforced at the query, tested on the serialized JSON | Filtering names in the Mac app: the name would still cross the wire |

### Architecture

Files this spec adds or extends, inside the shell's layout:

```
packages/contracts/src/concepts/
  owner-queue.ts        OwnerQueueItem, ReapprovalItem, SuspectDocument, OwnerScope (new)
  qa-entry.ts           QAEntry gains optional basedOnDocumentIds, reapprovalReason (additive)
  fix.ts                Fix gains optional documentId (additive)
  notice.ts             Notice gains optional initiativeId, documentId, qaEntryId (additive)
  requests.ts           QAAnswerRequest, QAApproveRequest, QAAttachRequest, SetAsideRequest,
                        FixRecordRequest, StillHappeningRequest (new schemas in an existing file or new file)
packages/contracts/fixtures/
  owner-queue.json, reapproval.json, suspect-documents.json (new)

apps/api/src/
  owner/scope.ts          requireLeader, requireOwnerOrLeader(initiativeId), requireFixPermission(insightId)
  owner/queue.ts          toAnswer, needsReapproval, published queries (no user columns)
  owner/verbatim.ts       normalize, isVerbatim(question, eventTexts)
  owner/publish.ts        approveEntry: embed, then one transaction
  owner/recipients.ts     qaRecipients(entryId), fixRecipients(insightId)
  owner/notices.ts        insertNotices (ON CONFLICT DO NOTHING), notice copy builders
  inngest/functions/
    qa-published-notify.ts
    fix-recorded-notify.ts
    qa-reapproval-on-still-stuck.ts
    qa-reapproval-on-document-ready.ts
    notice-sweep.ts
  routes/ (existing files, handlers added)
  db/schema.ts           additive tables and columns below
  drizzle/NNNN_owner_loop.sql
  db/seed-owner-loop.ts  dev-branch seed extension

apps/mac/Friction/Main/
  OwnerQA/OwnerQAView.swift, OwnerQATiles.swift, ToAnswerList.swift, ReapprovalList.swift,
          PublishedList.swift, QAComposer.swift, SuspectDocumentRow.swift, OwnerQAModel.swift
  Insights/RecordFixSheet.swift (new), insight detail footer wired (additive)
  Home/StillHappeningSheet.swift (new), pinned item's button action wired (one line)
  Sidebar.swift           Owner Q&A item; section visibility = leader or owner (additive)
apps/mac/Friction/Client/ LiveClient gains the owner methods below
```

### Interfaces

Routes (flow numbers in route comments). All require a session (phase 02); organization comes from the session; an id from another organization returns 404.

- `GET /v1/qa/scope` (18): `OwnerScope { leader, initiatives: [{ id, name, status }] }`. Drives sidebar visibility.
- `GET /v1/qa/queue?tab=to_answer|needs_reapproval|published&initiativeId=` (18, 19): owner or leader. `to_answer` returns `OwnerQueueItem[]`; `needs_reapproval` returns `{ suspectDocuments: SuspectDocument[], entries: ReapprovalItem[] }`; `published` returns `QAEntry[]`; every response includes `counts { toAnswer, needsReapproval, published }`.
  - `OwnerQueueItem` routed: `{ kind: "routed", eventRefs: [{ kind: flag|question, id }], text, resolutionClass, initiativeId, initiativeName, sentOn: "YYYY-MM-DD", groupCount, othersCount | null, reflagOfFix: { summary } | null, answers: Answer[] }`. Draft: `{ kind: "draft", qaEntry, reportCount }`.
- `POST /v1/qa/:id/answer` (18): save draft, upsert by client id. Body `{ initiativeId, question, answer, eventRefs, basedOnDocumentIds }`. Status stays `draft`. Draft rows attach their events so other owners do not answer them twice.
- `POST /v1/qa/:id/approve` (18): same body plus `expectedUpdatedAt` (null for new). Order: permission, validate (400 empty fields, 422 `verbatim_question`), embed (503 `embed_failed` on failure), then one transaction: upsert entry with `status = published`, question, answer, embedding, `approved_by_user_id`, `approved_at = now()`, clear `reapproval_*`; insert `qa_entry_event` rows (409 `already_attached` if any event is attached elsewhere or set aside); replace `qa_entry_document` rows; stale `expectedUpdatedAt` gives 409 `stale`. After commit: `c.executionCtx.waitUntil(inngest.send({ id: "qa-published-" + entryId + "-" + approvedAtMillis, name: "ft/qa.published", data }))` (Hono `executionCtx.waitUntil`: Context7 `/honojs/website` context API; producer `id` dedupe: research Part 2). Response `{ qaEntry, notifiedPeople }` where notifiedPeople is the distinct count of users who have no notice for this entry yet.
- `POST /v1/qa/:id/attach` (18): `{ eventRefs }` onto a published entry; same 409 rules; sends `ft/qa.published` with the same shape.
- `POST /v1/qa/:id/reapprove` (18, 19): publishes the entry unchanged: status `published`, `approved_at = now()`, clears `reapproval_*`. No embedding change, no notice.
- `POST /v1/qa/:id/unpublish` (18): status `draft`; attachments stay.
- `POST /v1/qa/set-aside` and `DELETE /v1/qa/set-aside` (18): `{ eventRefs }`.
- `PUT /v1/documents/:id` (19): phase 05's replace handler, unchanged except the permission check now also admits owners of the document's initiative (additive branch in the check).
- `POST /v1/documents/:id/keep` (19): clears `suspect`, sets `suspect_cleared_at`.
- `POST /v1/insights/:id/fix` (20): leader or insight owner. Body `FixRecordRequest { summary (1 to 280 chars, single line), documentId | null }`. Inserts `fix`, sets `insight.fix_id`, then `waitUntil` sends `ft/fix.recorded { orgId, insightId, fixId }` with event id `fix-recorded-` + fixId. Response `{ fix, notifiedPeople }`.
- `GET /v1/insights/:id/fix-preview` (20): `{ recipients: number, notice: Notice }` for the sheet's preview; the same builder the function uses.
- `POST /v1/me/notices/:id/still-happening` (21): body `{ flagId (client UUID), note | null }`. The notice must belong to the caller and be `fix_recorded`, else 404. Upserts a `flag` row: `id = flagId`, `user_id = caller`, `initiative_id` from the fix's insight, `transcript = note ?? ""`, `app_names = []`, `resolution_class = still_stuck`, `reflag_of_fix_id = fixId`. Idempotent on `flagId`. Sends `ft/event.still_stuck` so every listener (06's routing, 08's re-approval, 09's clustering) sees it.

Inngest functions (v4 syntax, triggers in config; Context7 `/websites/inngest` reference/typescript/v4):
- `qa-published-notify`: trigger `ft/qa.published { orgId, qaEntryId }`. Steps: `resolve` (distinct user ids of `qa_entry_event` rows with `source` in `owner_answer` or `cluster`; `cited` rows are excluded because those people already received the answer; returns ids only), `insert` (bulk notice insert, `ON CONFLICT DO NOTHING`, returns `{ inserted }`).
- `fix-recorded-notify`: trigger `ft/fix.recorded`, `idempotency: "event.data.fixId"`. Steps: `resolve` (distinct users over the insight's clusters' `cluster_member` events, every class included), `insert`, then `step.sendEvent("evidence-changed", { name: "ft/initiative.evidence_changed", ... })` for phase 09's health.
- `qa-reapproval-on-still-stuck`: trigger `ft/event.still_stuck { orgId, eventKind, eventId }`. Reads the event's answer citations. Sets `document.suspect_marked_at = coalesce(suspect_marked_at, now())` on cited documents (06 sets `suspect`). Moves published entries that are cited directly (`answer_still_stuck`) or based on a cited document (`document_suspect`) to `needs_reapproval`, recording `reapproval_document_id` and `reapproval_requested_at`.
- `qa-reapproval-on-document-ready`: trigger `ft/document.ready { orgId, documentId, versionId }`. When the document had an earlier ready version (a replacement): clear `suspect`, set `suspect_cleared_at`, move published and needs-reapproval entries based on it to `needs_reapproval` with reason `document_replaced`. First versions are a no-op.
- `notice-sweep`: `triggers: [cron("*/15 * * * *")]` (Context7 `/websites/inngest` triggers reference). Re-runs both resolvers for fixes and publications of the last 7 days and inserts missing notices.

Schema, one additive migration (`drizzle/NNNN_owner_loop.sql`, next index at build time):
- `qa_entry_event` is NOT created here: the shell (01-shell, Database) owns it and the `linkEventToQA` helper. Owner attachments are rows with `source = 'owner_answer'`, `attached_by_user_id` set; the shell's partial unique index on `event_id where source = 'owner_answer'` enforces one event, one entry (409 `already_attached`).
- `qa_entry_document`: `qa_entry_id`, `document_id`, `organization_id`; primary key on the pair.
- `routed_set_aside`: `organization_id`, `flag_id null`, `question_id null`, `set_aside_by_user_id`, `set_aside_at`; same check and partial unique indexes.
- `qa_entry`: add `reapproval_reason text null` (check in `document_suspect`, `document_replaced`, `answer_still_stuck`), `reapproval_document_id uuid null`, `reapproval_requested_at timestamptz null`, `updated_at timestamptz not null default now()` if the shell did not create it.
- `document`: add `suspect_marked_at timestamptz null`, `suspect_cleared_at timestamptz null`.
- `fix`: add `document_id uuid null`. Multiple fixes per insight are allowed; `insight.fix_id` points to the newest.
- `flag`: add `reflag_of_fix_id uuid null references fix`.
- `notice`: unique index on `(user_id, kind, ref_id)`.
- `qa_entry.tsv`: the shell is expected to define it as generated from question and answer, like `passage.tsv` (Drizzle `generatedAlwaysAs`, Context7 `/drizzle-team/drizzle-orm-docs` full-text-search-with-generated-columns). If the shell migrated it as a plain column, `approveEntry` sets `tsv = to_tsvector('english', question || ' ' || answer)` in the same UPDATE. The column definition is never changed.
- `askedCount` on `QAEntry` is computed on read as `count(distinct user_id)` over `qa_entry_event` (all sources; 07 writes `cited` rows from answer citations). Never stored.

Contracts: every new schema has a fixture; Swift mirrors are Codable with the new fields optional so existing fixtures still decode.

### Key flows

**Approve and publish (18).** Owner selects events, writes, presses Approve and publish. The service checks permission for the entry's initiative, validates, runs the verbatim guard against the texts of every attached event (for drafts, against the texts of the draft's attached events), embeds, then commits entry, links, and documents in one transaction. On commit the entry is in 06's retrieval (vector and full-text), so the next identical question is answered from it with an "Owner answer" citation. Then `ft/qa.published` fans out notices. Failure modes: embedding error (503, nothing written), attach race (409, rolled back), Inngest send lost (the sweep inserts the notices within 15 minutes), closed initiative (409 `initiative_closed`).

**Correct a document (19).** Owner uploads from the suspect row; 05's replace path stores and indexes the new version and emits `ft/document.ready`. 08's listener clears the suspect mark and moves dependent entries to Needs re-approval. The Mac polls 05's `GET /v1/documents/:id/status` every 2 seconds while the row is processing (as 05 does), then refreshes the queue. Failure: extraction fails, 05 marks the version failed, the old version stays active, the mark stays, the row shows 05's failure copy.

**Still stuck reaches re-approval (9 into 18).** 06 handles `ft/event.still_stuck` (class, suspect, routing); 08's listener, running independently on the same event, moves dependent entries to `needs_reapproval`. Either function can retry without affecting the other; both writes are idempotent (`coalesce`, status set to a fixed value).

**Record fix and notify (20, 21).** Leader or insight owner records the line. The fix row and `insight.fix_id` commit together, then `ft/fix.recorded`. The function resolves recipients through clusters and inserts one `fix_recorded` notice per distinct user, `ref_id = fixId`, carrying `initiativeId` and `documentId`. Phase 07's next pull shows it pinned. Failure: function retries; duplicates are impossible by the unique index.

**Still happening (21).** Employee confirms the sheet; the Mac POSTs with a fresh UUID. The flag lands as still stuck, appears in the owner's To answer with the "Still happening after the fix" line, and the insight counts it under "Still happening since the fix" by `reflag_of_fix_id`. Retried POSTs upsert the same flag.

### Tests (each seen failing for the named mutation before it is trusted)

API integration tests run against a Neon test branch through `@cloudflare/vitest-pool-workers`; the embedder is phase 05's port with a deterministic test implementation; Inngest functions run through `InngestTestEngine` from `@inngest/test` with `t.execute({ events })` (Context7 `/websites/inngest` reference/typescript/v4/testing). Seeds: two initiatives, owners A and B, a leader, four employees, routed events, one seeded insight with two clusters.

1. **Searchable at once.** Approve an entry, then call 06's public retrieval function with a new question phrased like the canonical one: the top Q&A hit's id equals the entry id. Mutation: move the embedding write into `qa-published-notify`; the test fails because the hit is absent.
2. **Verbatim guard.** Question equal to an attached event's text in different case and punctuation returns 422 `verbatim_question`; a question containing 8 consecutive words of it returns 422; a rewrite returns 200 and the entry is published. Mutations: drop lowercasing in `normalize` (first case fails); change the run length to 80 (second case fails).
3. **No sender on the wire.** The serialized JSON of every `GET /v1/qa/queue` tab contains none of the seeded user ids, names, or emails, and every `sentOn` matches `^\d{4}-\d{2}-\d{2}$`. Mutation: add `flag.userId` to the to-answer select; the test fails naming the leaked id.
4. **Permissions, table driven.** Employee: 403 on queue, approve, attach, keep, fix. Owner of A: 200 on A's queue and approve, 403 on B's. Leader: 200 everywhere. Owner of insight X: 403 fixing insight Y. Other organization's ids: 404. Mutation: make `requireOwnerOrLeader` ignore `initiativeId`; the owner-of-A-on-B row fails.
5. **Q&A notices go to distinct askers, once.** Approve with three events from two users (one sent two): exactly two `qa_published` notices with `ref_id` = entry id and user ids equal to the two askers; the approver, who asked nothing, gets none; executing the function twice still leaves two. Mutations: remove `DISTINCT` (three notices); remove `ON CONFLICT DO NOTHING` and the unique index (four after the rerun).
6. **Fix notices reach everyone behind the insight.** Seeded insight with two clusters whose members span four users, including one whose event was Answered and one who appears in both clusters, plus a member of another insight's cluster: exactly those four users get a `fix_recorded` notice. Mutation: filter members to `resolution_class <> 'answered'`; the Answered user's assertion fails.
7. **Still happening lands as still stuck.** POST creates a flag with class `still_stuck`, `reflag_of_fix_id` equal to the fix, owned by the caller; a second POST with the same `flagId` leaves one row; the event appears in owner A's To answer; another user's notice id returns 404. Mutation: set the class to `unanswerable`; the class assertion fails.
8. **Correction moves only dependent entries.** Replace a suspect document; after `qa-reapproval-on-document-ready` runs, `document.suspect` is false, entries based on it are `needs_reapproval` with reason `document_replaced`, and an unrelated published entry in the same initiative is still `published`. Mutation: drop the `qa_entry_document` join from the update; the unrelated entry's assertion fails.
9. **Re-approval gates serving.** An entry moved to `needs_reapproval` is absent from 06's retrieval; after `POST /reapprove` it is present again with status `published`. Mutation: have reapprove clear the reason but not set status; the second assertion fails.
10. **One event, one entry.** An event attached to entry A, then approved into new entry B: 409 `already_attached`, and entry B does not exist. Mutation: remove the partial unique index and the pre-check; B is created and the test fails.
11. **Swift: contract drift.** New fixtures decode into the Swift mirrors. Mutation: rename `reapprovalReason` in Swift; decoding fails.
12. **Swift: error copy.** `OwnerQAModel` maps `verbatim_question`, `already_attached`, `stale`, `embed_failed`, and `initiative_closed` to the exact UI strings above. Mutation: map `verbatim_question` to the generic failure; the test fails on the string.

What these tests do not kill: the visual layout, the sort order of the To answer list (covered only by manual review), and the Mac's 2-second status polling.

### Rollout

1. Build on branch `iteration-1/08-owner-loop` in its own worktree after 06 merges; create Neon branch `08-owner-loop` from `dev`, run the migration against its direct URL, `neon diff` before commit.
2. Run the seed extension on the branch: seeded insights with clusters and members over real seeded events, one seeded draft entry with attached events, one suspect document with a published entry based on it.
3. Local: one API dev server on 8787 from this worktree; Inngest dev server against it; exercise every flow on the Mac.
4. Merge to `main`; Cloudflare deploys on push; sync the app in Inngest Cloud so the five new functions register; confirm `notice-sweep` shows its schedule.
5. Rollback: revert the commits. The migration is additive; the new tables and columns can stay unused. Notices already written stay (they are true).

### Open decisions

- **Anonymity threshold value.** Default 5 distinct employees, applied to the insight evidence panel as in the shell. Owner: Andrés (product.md open question).
- **Does the threshold also gate routed-event text in To answer?** Default no: owners and leaders see the text of each routed event without any identity, because it is the thing being answered; screenshots, clips, and app names stay off this page. A transcript can still identify someone by content; accepted for v1.
- **Are needs-re-approval entries served while waiting?** Default no: withheld from retrieval and Q&A browsing until re-approved.
- **Does one still-stuck event move an entry to Needs re-approval?** Default yes (one event, as the suspect mark in flow 9 does). Alternative: a minimum of 2 distinct employees.
- **Can a non-leader owner act?** Default yes, scoped: Owner Q&A for initiatives they own, Insights assigned to them, document correction on their initiatives. Alternative: owners must also be leaders.
- **Who can record a fix on an insight with no owner?** Default leaders only.
- **Does a document correction on its own notify the still-stuck reporters?** Default no; the owner publishes a Q&A entry or records a fix.

---

## Sessions

- 2026-09-24: Initial spec · `claude -r cf097e99-94f3-4cce-9596-642e0c0c18b8`
