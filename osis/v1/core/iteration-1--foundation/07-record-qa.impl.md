# Record and Q&A

**Iteration:** iteration-1--foundation
**Depends on:** 06-answer-pipeline
**Status:** not started

## UX

This spec makes two worker surfaces real: Home, the employee's own record (flow 11), and Q&A, the published answers of the initiatives they belong to (flow 10). After it lands, everything the employee has flagged or asked appears in Home with its answer, Resolution class, others count, and outcome, kept current from the service and readable offline. Q&A shows only owner-approved canonical entries, and its search field asks a real Question through the answer pipeline (flow 8). The screens are the shell's screens (01-shell, "Home" and "Q&A"); this spec swaps fixture data for live data and fills in every state. The one layout change is on Q&A, where one initiative shows at a time (see Decisions).

Reference models: the Linear inbox for list plus detail pane with an activity timeline; the Base44 "My Support Tickets" tabs; Wispr Flow's grouping by day; the Notion "Verified" line and the ElevenLabs FAQ accordion for Q&A (Part 1, sections 4 and 5 of the flows research). Anti-patterns carried from the research: no ticket ids, SLAs, priorities, upvotes, "Declined" status, personal stat counters, or ellipsized rows.

### Home: the happy path (flow 11)

1. Sam opens the main window (pill click, or **Open Friction** in the menu bar menu). Home shows his cached record at once, from this Mac, before any network call returns. A refresh runs in the background; changed rows update in place without the list jumping (selection and scroll position are kept).
2. Above the list: pinned notices (see below), then the tabs **All**, **Waiting**, **Fixed**. The tabs carry no counts (counts drift toward personal stat counters, a research anti-pattern).
3. The list is grouped by the day the item was sent, in the Mac's current time zone, newest first: "Today", "Yesterday", then "Monday 21 September", and "Monday 21 September 2025" for earlier years. Groups regroup at midnight without a relaunch.
4. Each row, left to right, wrapping onto more lines as needed and never truncated:
   - A glyph: flag (waveform in a capsule) or question (speech bubble).
   - My words in full: the transcript exactly as I sent it (after my edits in review), or the question text.
   - The initiative chip ("Procurement rollout"). A closed initiative's chip reads "Procurement rollout, closed". A flag whose initiative was never settled reads "No initiative".
   - The class pill: **Answered**, **Sent to owner**, or **Still stuck** (UI copy for `answered`, `unanswerable`, `still_stuck`).
   - The others count: "23 others" (or "1 other"). Hidden when zero.
   - The outcome text: **Answered**, **With owner**, or **Fixed**.
5. Tabs: **All** shows everything. **Waiting** shows items whose outcome is With owner. **Fixed** shows items whose outcome is Fixed.
6. Selecting a row opens the detail pane on the right (list about 420 pt wide, detail fills the rest; the divider is draggable). Arrow keys move the selection.

### Home: the detail pane

Top to bottom:

- **Header**: "Flag" or "Question", the send time ("Tuesday 22 September, 14:32", in the Mac's locale and 12 or 24 hour preference), the initiative chip.
- **What you sent** (flags) or **What you asked** (questions). For a flag:
  - The transcript in full.
  - The redacted screenshot as a thumbnail at its aspect ratio, black boxes burned in exactly as sent. Click opens it large in a sheet; Esc closes it.
  - The clip, when one was sent, as an inline player with its duration ("0:12"). It plays only when the employee presses play.
  - App chips ("Chrome", "SAP GUI").
  - A row for each part the employee removed before sending: "No screenshot sent", "No clip sent", "No app names sent".
  - A caption under the section: "This is exactly what left your Mac. Leaders see it without your name."
  - When the media came from the service rather than this Mac (see Technology), a second caption: "Loaded from your account. This Mac no longer keeps its own copy."
- **The answer card as it finished**, rendered by the same `AnswerCardView` as 06 in its finished state: the Provisional line if one was shown, "Update: the docs do cover this." if it was followed by an answer, the answer text with numbered citation chips, a quote block per citation (Q&A citations carry the "Owner answer" badge), the resolution row (class pill, "23 others hit this" or "23 others asked this", "Routed to Procurement owner" for routed classes), and the "This didn't solve it" button while the class is Answered and the item is not Fixed (flow 9, 06's behavior).
- **Fix**, when Fixed: "Fixed: POs no longer need a finance call", the owner's one line on what changed, and "See the corrected passage" when the fix points at a passage.
- **Timeline**: only events that happened, oldest first, each with "22 September, 14:32":
  - "Sent" (flag) or "Asked" (question)
  - "Answered from the docs" (class Answered at answer time) or "Not covered by the docs" (Unanswerable)
  - "Routed to the Procurement rollout owner"
  - "You said this didn't solve it"
  - "Answer published to Q&A", with "Open in Q&A"
  - "Fixed"

### Home: notices (flows 18 and 21 delivered, 21 rendered here)

- Notices are created by 08 (a fix recorded, a Q&A entry published that answers something I asked). This spec shows them.
- Unread notices sit pinned above the tabs, newest first, every one shown in full. A fix notice: "Fixed: POs no longer need a finance call", the owner's one line, "See the corrected passage", and "Still happening?" (08 wires that action; until 08 merges the button is hidden, never shown inert). A Q&A notice: "Answered in Q&A: Who approves a PO over 10,000 AED?", the owner's answer in full, and "Open in Q&A".
- Clicking a notice's body selects the record item it concerns, when that item is in the list.
- A notice is marked read once it has been on screen for 1 second while the main window is key and Home is showing. It stays pinned, with its unread dot removed, until the window is next opened; then it leaves the pin area and lives on as the item's "Fixed" or "Answer published to Q&A" timeline entry.
- The menu bar icon shows a small static dot while any notice is unread. It never animates. No system banner, no Dock badge, no pill badge, ever. The dot clears the moment the last notice is read on this Mac, even offline.

### Home: every other state

- **First load, empty cache** (first launch after sign-in, or after sign-out and back in): the list area shows a small spinner and "Loading your record". Items render as soon as the first page is saved.
- **Empty, All tab**: "Nothing here yet. Hold fn whenever something gets in your way, or ask a question in Ask." The shortcut text is the employee's current capture key, not a constant.
- **Empty, Waiting tab**: "Nothing is waiting on an owner."
- **Empty, Fixed tab**: "Nothing fixed yet. When an owner fixes something you flagged or asked about, it shows here."
- **Just sent**: the moment a flag or question is sent, its row appears under Today with the answer card streaming in the detail pane (06). The row has no class pill until the `class` event arrives; its outcome reads "Waiting for an answer".
- **Not sent yet** (a flag waiting in 04's outbox while offline): a row under Today with the flag glyph, the transcript, the initiative chip, and the outcome text "Not sent yet. It sends when you're back online, exactly as you approved it." It shows in All only. Its detail shows What you sent from the outbox and no answer card.
- **Offline**: a quiet bar above the tabs: "You're offline. Showing what's saved on this Mac." Everything cached stays browsable, including local media.
- **Refresh failed** (service error): "Couldn't refresh. Showing what's saved on this Mac." with a "Try now" button. The bar disappears after the next successful refresh.
- **Signed out or session expired**: "Sign in again to refresh your record." with a "Sign in" button (02's sign-in).
- **Media loading from the service**: a placeholder at the image's aspect ratio with "Loading screenshot" (or "Loading clip").
- **Media unavailable offline with no local copy**: "This Mac doesn't have a copy of the screenshot. Connect to see it."
- **Media failed to load online**: "Couldn't load the screenshot." with "Try again".

### Q&A: the happy path (flow 10)

1. Sam opens Q&A in the sidebar. The page header reads "Q&A" with an initiative menu button showing the current initiative, "Procurement rollout", and a chevron. The menu lists his live initiatives, then closed ones marked "(closed)". The last choice is remembered. With only one initiative, the header shows its name without a menu.
2. Under the header, the search field, placeholder "Search or ask about Procurement rollout".
3. Under the field, the entries: published canonical questions only, most asked first, ties broken by most recently approved. Each collapsed entry shows the question in full and a meta line: "Asked by 41 people" (hidden when nobody has asked yet) and, only when Sam asked it himself, a chip "You asked this · only you see this".
4. Clicking an entry (or Space on the focused entry) expands it: the owner's answer in full, then "Approved by Priya Raman, 18 September". Clicking again collapses it. No votes, no comments, no threads, no names other than the approving owner, and never an employee's own words.

### Q&A: searching is asking

- Typing filters the entries on this Mac, instantly, matching question and answer text, ignoring case and accents. Nothing is sent while typing.
- When the field has focus, a hint line sits under it: "Typing filters answers on this Mac. Press Return to ask. Questions reach leaders without your name."
- Return asks: the text becomes a Question about the shown initiative and runs through the answer pipeline (flow 8). The answer card streams in under the search field, the same card as Ask. If the answer cites a Q&A entry, clicking its chip scrolls to that entry, expands it, and tints its background for one second. The card has a close button; closing it does not undo the Question.
- The Question appears in Home like any question, and counts as signal like any question.
- Return is enabled once the text has at least 3 words. Below that, Return does nothing and the hint reads "Type a full question to ask."
- Pressing Return again with the same text (ignoring case and surrounding spaces) for the same initiative within 60 seconds shows the existing card again and sends nothing.
- No matches while typing: "No published answer matches. Press Return to ask."

### Q&A: every other state

- **Loading, nothing cached**: spinner and "Loading answers".
- **No entries yet**: "No answers published for Procurement rollout yet. When an owner approves an answer to a common question, it appears here."
- **Not part of any initiative**: "You're not part of any initiative yet. When a leader adds you to one, its answers appear here." No search field.
- **Closed initiative**: a line under the header: "Procurement rollout is closed. Its answers stay here to read. Asking about it has stopped." Typing filters; Return is disabled.
- **Offline**: entries from the cache; hint reads "You're offline. Filtering still works. Asking needs a connection." Return is disabled.
- **Refresh failed with a cache**: "Couldn't refresh Q&A. Showing what's saved on this Mac." With no cache: "Couldn't load Q&A for Procurement rollout." and "Try again".
- **Entry withdrawn from publication** (08 moves it to needs re-approval): it disappears on the next refresh. Home items that linked to it keep their "Answer published to Q&A" timeline entry.

### Privacy the employee can rely on

- My record is mine. No leader, owner, or admin screen shows it, and the service has no route that lets anyone else read it.
- Q&A shows no employee names and no employee words. "You asked this" is visible only to me; nobody else can learn that I asked.
- Nothing I type in the Q&A search leaves the Mac until I press Return.

### Out of scope

- Creating notices, the "Still happening?" re-flag, owner queues, and the corrected-passage link target (08).
- Cluster-based others counts and fix links from real insights (09; this spec reads whatever clusters and insights exist).
- Withdrawing or deleting a flag (open question in `product.md`), editing a sent item, exporting the record.
- Searching across all initiatives at once. System banners, sounds, or any attention request.

## Technology

### Decisions

| Decision | Rationale | Rejected |
|---|---|---|
| The detail pane reads the Mac's local copy of what was sent first, and falls back to the service copy through an author-only route | The local copy is the outbox directory 04 wrote at Send: the approved, redacted bytes that left the Mac, immutable and hash-listed in its `manifest.json`. It shows instantly and offline. The service copy exists anyway (leaders' anonymous evidence), so the fallback exposes nothing new, and it covers a new Mac, a reinstall, and flags sent before this spec. Privacy rule: the record is private to its author, so the fallback route resolves the user only from the session and answers 404 for anyone else | Server copy only: no offline viewing, re-downloads media, no privacy gain. Local only: after a reinstall the pane would show nothing for a flag leaders can still see, which misleads the employee about what exists |
| On server acknowledgement, 04's outbox directory is moved (one rename on the same volume) into the record folder instead of deleted | Keeps exactly the approved bytes with no copy and no re-download | Copy then delete (doubles disk briefly, no benefit). Delete then fetch from the service (download for bytes the Mac already had) |
| Local cache in SwiftData | System framework, so `project.yml` gains no package (the brief puts every Mac dependency in the shell); `@Query` drives SwiftUI lists; `@Attribute(.unique)` makes `insert` an upsert (Apple, "Maintaining a local copy of server data", via Context7 `/websites/developer_apple_swiftdata`); `@ModelActor` for background writes | GRDB: a new package edit to the shell's `project.yml`. JSON files: no queries for tabs and grouping |
| One delta endpoint, `GET /v1/me/record?since=`, whose per-item `changedAt` is derived in SQL from every input to the row, with a safe-watermark cursor | One user's record is small (hundreds to low thousands of rows), so deriving `changedAt` per request is cheap, and no writer in 06, 08, or 09 has to remember to bump a counter | A sequence bumped by every writer: a forgotten call means silent staleness. Full re-fetch each poll: wasteful. Durable Object push: research says only for near-real-time needs |
| ETag from Hono's built-in `etag()` middleware over the response body | The ETag cannot disagree with the body because it is the body's digest; `If-None-Match` matches return 304 with retained headers (Context7 `/websites/hono_dev`, middleware/builtin/etag) | A hand-built ETag from aggregates: a second code path that can drift from the body |
| Notices travel inside the record response | One request per poll per employee | Polling `/v1/me/notices` separately: two requests a minute per employee |
| Pull on window open, app foreground, wake, network return, after a send or still-stuck, and every 60 s (±10 s jitter) while the app runs; back off to 120 s then 300 s on errors | The cadence the research set (Part 2, section 8); pulling is not initiating, and nothing surfaces beyond the home window and a static dot | SSE subscription or APNs: not needed while the app is always running |
| Q&A search: typing filters locally; Return asks a Question with `origin: qa_search` | Server search per keystroke would send text the employee never chose to send. Asking on Return keeps "searching is asking" honest and makes Q&A lookups visible as signal | Search as a non-signal lookup: Q&A reads would vanish from the signal pool, against "count every flag and question as signal" |
| `youAsked` computed server-side from a link table, returned as one boolean for the requester | The client cannot see cluster or owner-answer links; the server never returns who else asked | Client-side matching against its cached questions: misses cluster links and would need member ids sent down |
| Q&A shows one initiative at a time with a menu | A Question needs an `initiativeId` (01 contract), so search needs one scope; matches the research's "one page per initiative" | The shell's all-sections scroll: search scope ambiguous |
| Menu bar dot is the only signal outside the window | Brief: no system banners this iteration; product: never interrupt | Banner, Dock badge, pill badge |
| Per-user local store and folder, deleted on sign-out | A second account on the same Mac must never see the first account's record | One shared store filtered by user |

### Architecture

Files this spec adds, inside 01's layout:

```
packages/contracts
  src/views/record.ts        MyRecordPage, RecordTimelineEntry, SentManifestView (additive fields on MyRecordItem)
  src/views/qa.ts            QAEntryView, QAPage
  fixtures/my-record-page.json, fixtures/qa-page.json

apps/api
  src/routes/me.ts           handlers for GET /v1/me/record, GET /v1/me/notices,
                             POST /v1/me/notices/read, GET /v1/me/record/:eventId/media/:kind
  src/routes/qa.ts           handler for GET /v1/initiatives/:id/qa
  src/record/query.ts        the record query: view model, derived changedAt, outcome, timeline
  src/record/cursor.ts       opaque cursor encode/decode, watermark rule
  src/inngest/functions/record-link-cited-qa.ts   on ft/event.answered: link events whose answer cited a Q&A entry
  drizzle/NNNN_record_qa.sql additive migration (generated) plus a --custom migration for the trigger

apps/mac/Friction
  Record/RecordModels.swift      @Model RecordItem, Notice, QAEntry, SyncState
  Record/RecordStore.swift       per-user ModelContainer at Application Support/Friction/<userId>/Record.store
  Record/RecordSync.swift        @ModelActor: pull, upsert page, advance cursor, mark notices read
  Record/PullScheduler.swift     triggers, coalescing, jittered timer, backoff (injected clock)
  Record/SentCopyStore.swift     adopt(outboxDir:), local media lookup with manifest hash check, service fallback
  Record/RecordGrouping.swift    pure: items, calendar, now -> day sections and titles
  Record/RecordTabs.swift        pure: tab -> predicate over outcome and local state
  Record/NoticeReadTracker.swift pure: visibility intervals -> ids to mark read
  Main/Home/                     HomeView, RecordList, RecordRow, RecordDetail, SentContentView, TimelineView, NoticeCard
  Main/QA/                       QAView, QAEntryRow, QASearchField, QAFilter.swift (pure local filter)
  App/MenuBarDot.swift           status item image with or without the dot
```

The one edit outside these folders: 04's outbox acknowledgement calls `SentCopyStore.adopt(outboxDir:)` instead of deleting the directory. `FrictionClient` gains four methods (`fetchRecord`, `markNoticesRead`, `fetchQA`, `fetchMedia`) with `FixtureClient` implementations reading the new fixtures; `LiveClient` implements them.

### Interfaces

**Migration (additive only).**
- `flag` and `question`: `updated_at timestamptz not null default now()`, `still_stuck_at timestamptz null`. Backfill `updated_at = created_at`.
- `question`: `origin question_origin not null default 'ask'`, enum `question_origin ('ask', 'qa_search')`.
- Custom SQL migration (`drizzle-kit generate --custom`; drizzle-kit has no trigger DSL, per Context7 `/drizzle-team/drizzle-orm-docs`, custom migrations and config `entities`): function `ft_touch_event()` as a `BEFORE UPDATE` trigger on `flag` and `question` that sets `updated_at = now()` and, when `resolution_class` changes to `still_stuck`, sets `still_stuck_at = now()`.
- No new Q&A link table: `qa_entry_event` and the `linkEventToQA` helper are defined in the shell (01-shell, Database), shared with 08 and 09. This spec only writes `cited` links and reads the table.
- Indexes: `flag (organization_id, user_id, created_at)`, `question (organization_id, user_id, created_at)`, `notice (organization_id, user_id, created_at)`.

**`linkEventToQA`** (shell helper) inserts into `qa_entry_event` on conflict do nothing. `askedCount` is computed on read as `count(distinct user_id)`; nothing is stored or maintained. 07 calls it with `cited` from `record-link-cited-qa` (trigger `ft/event.answered`, `idempotency: "event.data.eventId"`; it reads the `citation` rows for the event's answer, not the event payload). 08 calls it with `owner_answer` when an owner answers an unanswerable question; 09 with `cluster` when a Q&A entry is drafted from a cluster. Inngest runs several functions on one event, so this function sits beside 06's handler without touching it.

**`GET /v1/me/record?since=<cursor>&limit=<n>`** (flow 11). Session user and active organization only; no user parameter exists. `limit` default 200, max 500. Response `MyRecordPage`:
```json
{ "items": [MyRecordItem], "notices": [Notice], "cursor": "opaque", "hasMore": false }
```
`MyRecordItem` keeps 01's fields (kind, id, text, initiative name, resolutionClass, othersCount, outcome, createdAt, timeline) and adds, all additive: `initiativeId`, `initiativeStatus`, `answer` (`{ text, citations, provisionalShown }` or null), `sent` (`{ transcript, appNames, hasScreenshot, hasClip }` for flags, null for questions), `fix` (`{ summary, recordedAt, passageId }` or null), `qaEntryIds`, `origin`, `changedAt`. Timeline entry kinds: `sent`, `answered`, `not_covered`, `routed`, `still_stuck`, `qa_published`, `fixed`, each with `at`.
- Derivations in `src/record/query.ts`, one place: `outcome = fixed` when a `fix` exists on an insight whose clusters contain the event; else `answered` when the class is `answered` or a linked Q&A entry is published; else `with_owner`. `othersCount` = the count 06 stored with the answer, replaced by cluster `memberCount - 1` once the event is clustered. `routed` at = answer time for Unanswerable, `still_stuck_at` for Still stuck. `changedAt = greatest(event.updated_at, answer.created_at, max linked fix.recorded_at, max linked qa_entry_event.created_at, max linked qa_entry.approved_at)`; 09 adds its cluster timestamp to this expression when it has one.
- Order `(changedAt, id)` ascending, keyset `> cursor`. Watermark rule: when `hasMore`, the cursor is the last row's `(changedAt, id)`; on the last page it is `min(last row or incoming cursor, now() minus 120 s)`. A row committed up to two minutes late is therefore still returned, re-sent rows are harmless because the client upserts, and after two quiet minutes the response becomes identical and returns 304. Invariant: no transaction writing record inputs runs longer than 120 s.
- Notices: the user's notices with `greatest(created_at, read_at) > cursor time`, same watermark.
- Middleware: `etag()` from `hono/etag` on this route only; `Cache-Control: private, no-cache`; `Vary: Authorization`. The body is deterministic (fixed key order, fixed row order, no generation timestamp).

**`GET /v1/me/notices`**: the unread notices, same shape as `notices` above. **`POST /v1/me/notices/read`** `{ ids: uuid[] }` sets `read_at = now()` where `user_id` is the session user and `read_at is null`; returns `{ updated: n }`; other users' ids update nothing.

**`GET /v1/me/record/:eventId/media/:kind`** (`kind` is `screenshot` or `clip`): looks up the flag by id, organization, and session user; 404 when absent, not the author's, or the key is null. Streams `env.FILES.get(key)` with `writeHttpMetadata` and `httpEtag` (Context7 `/websites/developers_cloudflare_r2`, Workers API usage), `Cache-Control: private, max-age=31536000, immutable`. The etag middleware is not applied here (it would buffer a clip to hash it).

**`GET /v1/initiatives/:id/qa`** (flow 10): 404 unless the session user is an `initiative_member` of that initiative (404, not 403, so existence is not revealed). Response `QAPage`: `{ initiative: { id, name, status }, entries: [QAEntryView] }` with `QAEntryView = { id, question, answer, approvedByName, approvedAt, askedCount, youAsked }` and exactly those keys. Only `status = 'published'`. `youAsked = exists (qa_entry_event where qa_entry_id = entry and user_id = session user)`. Same `etag()` and cache headers. No pagination in v1; revisit past 500 entries per initiative.

**Contracts**: `Question` gains optional `origin` (`ask | qa_search`, default `ask`). Swift mirrors every new view and field; the drift test decodes the two new fixtures.

**Consumed from siblings**: `POST /v1/events` and the SSE events (06); `GET /v1/initiatives` returning only the employee's initiatives for a non-leader (05); the outbox directory layout `Outbox/<flagUUID>/manifest.json, screenshot.png, clip.mp4` with a SHA-256 per file (04).

### Key flows

**Pull.** A trigger fires; `PullScheduler` starts one fetch, and any triggers during it collapse into exactly one follow-up. `RecordSync` sends `since=<stored cursor>` with `If-None-Match: <stored ETag for that cursor>` and cache policy `reloadIgnoringLocalCacheData` so URLCache never answers for it. 304: only `lastSuccessAt` changes. 200: upsert items and notices in one save, then store the new cursor and ETag; if `hasMore`, fetch again immediately. The cursor is stored only after the page is saved, so a crash mid-page repeats the page instead of skipping it. 401: stop polling and show the sign-in bar. Network failure: offline bar, back off. Triggers: `NSApplication.didBecomeActiveNotification`, main window open, `NSWorkspace.didWakeNotification`, `NWPathMonitor` becoming satisfied, `done` or still-stuck from 06, the jittered timer.

**Send to record.** On 06's `done` event the app upserts a local `RecordItem` from the answer state and the outbox manifest, then triggers a pull; the server row has the same client-generated id, so the upsert converges. On outbox acknowledgement, 04 calls `adopt`, which renames `Outbox/<id>` to `Application Support/Friction/<userId>/Record/<id>`. Failure to rename (different volume, disk full) falls back to deleting, as 04 does today; the detail then uses the service copy.

**Detail media.** `SentCopyStore.media(eventId, kind)`: if the local file exists and its SHA-256 matches the manifest, show it with no caption. If it is missing or does not match, discard the local file, fetch from the media route, show it with the "Loaded from your account" caption, and write it back into the record folder. Unredacted originals never exist here: 04 burns redactions in before writing the outbox.

**Read notices.** `NoticeReadTracker` receives visibility intervals (card on screen, window key, Home showing). At 1 s it marks the notice read locally (the dot updates at once) and queues the id; queued ids flush in one `POST /v1/me/notices/read` after 2 s of quiet, and again on the next successful pull if offline.

**Q&A refresh.** On page open, on initiative switch, and whenever a pull brings a `qa_published` notice for that initiative: `GET /v1/initiatives/:id/qa` with `If-None-Match`; on 200 replace the cached entry set for that initiative (entries no longer published disappear).

**Search ask.** Return with at least 3 words and a live initiative: build `Question { id: UUID(), initiativeId, text, origin: "qa_search" }`, POST through 06's `AnswerStream`, render the card under the field. The dedupe key is `(initiativeId, lowercased trimmed text)` held for 60 s in memory.

**Sign-out.** Stop the scheduler, delete `Application Support/Friction/<userId>/` (store and record folder). The service keeps everything; signing back in re-syncs.

### Performance

- Home paints cached rows within 100 ms of the window opening, independent of the network.
- `GET /v1/me/record` p95 at the Worker under 150 ms for a user with 2,000 items; a 304 costs the same query and no body. At 1,000 employees the poll is about 17 requests a second, nearly all 304.

### Tests (each must be seen failing for the named mutation before it is trusted)

API (vitest with `@cloudflare/vitest-pool-workers`, integration against a throwaway Neon branch, real Postgres, no DB mocks):
1. User B's record never contains user A's items, and B's media request for A's flag returns 404. Mutation: drop the `user_id` predicate in `record/query.ts`; the test fails naming A's item id.
2. After still-stuck on an item, the delta from the prior cursor contains exactly that item with `resolutionClass: "still_stuck"`, `outcome: "with_owner"`, and a `still_stuck` timeline entry. Mutation: remove the trigger; the delta is empty.
3. A row written with `changedAt` 30 s before the returned cursor's wall time is returned on the next poll. Mutation: set the watermark overlap to 0.
4. The same request with `If-None-Match` returns 304 with an empty body; after a change it returns 200 with a different ETag. Mutation: add a `generatedAt` field to the body; the 304 assertion fails.
5. 450 items with `limit=200` come back in three pages whose ids are 450 distinct values, with `hasMore` false on the third. Mutation: keyset `>=`; the duplicate check fails.
6. Outcome table, exact values: answered with no fix gives `answered`; unanswerable gives `with_owner`; still stuck gives `with_owner`; linked fix gives `fixed`; unanswerable plus a published linked entry gives `answered`. Mutation: map `still_stuck` to `answered`.
7. Q&A returns only published entries from a seed with draft, published, and needs re-approval rows, and a non-member gets 404. Mutations: drop the status filter; drop the membership check.
8. A asked entry E twice, B never did: B's entry has `youAsked: false`, `askedCount: 1`, and its key set equals exactly the seven `QAEntryView` keys. Mutations: compute `youAsked` without the user filter; use `count(*)`; add an `askers` field.
9. Marking another user's notice read updates 0 rows and leaves its `read_at` null. Mutation: drop the user filter.
10. The new fixtures parse with their Zod schemas. Mutation: rename `qa_search` in the enum.

Swift:
11. Grouping in `Asia/Dubai` with a fixed `now`: items at 23:59 and 00:01 local fall under "Yesterday" and "Today"; an item from 2025 titles "Monday 22 September 2025". Mutation: group with a UTC calendar.
12. Tabs: Waiting holds exactly the `with_owner` items, Fixed exactly the `fixed` ones, and outbox rows appear only in All. Mutation: include `answered` in Waiting.
13. Sync: applying the same page twice leaves an identical store; a later page with a changed class overwrites; when saving the page throws, the stored cursor is unchanged. Mutation: store the cursor before saving.
14. 304 leaves every item unchanged and updates `lastSuccessAt`. Mutation: treat 304 as an empty page that clears the cursor.
15. `SentCopyStore`: a local file whose hash matches the manifest is returned with source `local`; a tampered file returns source `service` and is replaced. Mutation: skip the hash check.
16. Menu bar dot shows exactly when the unread count is above zero. Mutation: `>= 0`.
17. `NoticeReadTracker`: 0.9 s visible marks nothing; 1 s visible in a key window marks the id; 5 s visible in a non-key window marks nothing. Mutation: ignore key state.
18. Typing in the Q&A search makes zero requests through the injected client (a privacy invariant, so the request count is the asserted state), and the filter matches "Aprobación" for "aprobacion". Mutation: fire the pipeline on text change.
19. Return with 2 words sends nothing; with 3 words sends one Question with `origin: "qa_search"`; the same text within 60 s sends nothing more. Mutation: drop the dedupe.
20. `PullScheduler` with an injected clock: five triggers during one in-flight fetch produce exactly one follow-up fetch. Mutation: no coalescing.

### Rollout

1. Build on branch `iteration-1/07-record-qa` in its own worktree, API dev server on 8787 restarted from this worktree.
2. Create a Neon branch for the migration, `neon diff` against `dev`, apply with drizzle-kit against the direct URL. The migration is additive with defaults, safe to run before the Worker deploys.
3. Merge to `main`; the Worker deploys on push. Mac builds from this point sync on first launch into an empty cache (the "Loading your record" state). Flags whose outbox was deleted before this spec show media from the service with the "Loaded from your account" caption.
4. Rollback: revert the commits. The new columns, table, and trigger are harmless to older code; local stores can be deleted without loss because the service holds everything.

### Open decisions

- **Search creates a Question and counts as signal.** Recommended default: yes, on Return only, with `origin: qa_search` so analysis can tell Q&A lookups from Ask. Built on this default.
- **Minimum length before Return asks.** Default: 3 words, so fragments like "po" filter instead of becoming signal.
- **Local copy retention.** Default: keep local sent copies until sign-out, capped at 1 GB per user; above the cap the oldest clips go first, then the oldest screenshots, and the detail falls back to the service copy. Text is never evicted.
- **Outcome when an owner publishes an answer to my Unanswerable question.** Default: outcome becomes Answered while the class stays Unanswerable, so the signal (a process gap) is kept and the row stops showing in Waiting.
- **Read notices leave the pin area on the next window open**, with no manual dismiss. Default as specified.
- **Ownership of `qa_entry_event`.** Resolved by the orchestrator (2026-09-24): the shell owns the table and `linkEventToQA`; 07, 08, and 09 all write through that helper.
- **Q&A layout change from the shell** (one initiative at a time with a menu, not all sections in one scroll). Default as specified; recorded in Engineering Notes as the one departure from 01's screen.
- **Verification gaps**: SwiftData `#Predicate` over a `String` raw value for outcome and the `hono/etag` handling of a weak `If-None-Match` were not checked in docs; the client echoes the exact ETag string, and outcome is stored as a raw `String` to keep predicates simple. `NWPathMonitor` and `NSWorkspace.didWakeNotification` usage is from platform knowledge, not re-verified this session.

---

## Sessions

- 2026-09-24: Initial spec · `claude -r cf097e99-94f3-4cce-9596-642e0c0c18b8`
