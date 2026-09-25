# Shell

**Iteration:** iteration-1--foundation
**Depends on:** none
**Status:** built locally 25 September 2026; Cloud deploy and Inngest sync pending the Worker in the Cloudflare dashboard
**Build reference:** `01-shell.docs.md` (verified library docs and 15 deltas from this spec; read Part 0 before building)

## UX

The shell is the whole product with nothing real behind it. Every surface in the product's surface table exists, looks the way it will look, is reachable the way it will be reached, and shows sample data shaped exactly like the real contracts. A person clicking through it should understand the product without anyone explaining it. Features in phases 02 to 08 replace sample data with real behavior; they do not redesign screens.

Reference models: the worker surface follows the Granola desktop app (quiet, one sidebar, generous whitespace, content first). The initiative surface follows Linear initiatives and projects (dense lists, property chips, detail panes). The pattern details for each surface are in Part 1 of `osis/inbox/2026-09-23--flows-research.md`; follow them. Real Granola screens, with what Friction takes from each and where it deliberately differs, are in `osis/references/granola/` (read its README before drawing any worker screen).

Type: page titles and panel titles use New York, the macOS system serif (`.fontDesign(.serif)`), as Granola uses a serif for its headings. Everything else is SF.

### App presence

- The app runs as a menu bar app. No Dock icon while only the pill is showing.
- A menu bar icon (a small glyph, static, never animated, never badged in this phase) opens a menu: **Open Friction**, **Flag something** (disabled in the shell, label shows the capture key), **Pause screen context** (disabled in the shell), a separator, **Debug** submenu (only in Debug builds), **Quit**.
- When the main window opens, the app appears in the Dock and Cmd-Tab. When the last window closes, it leaves the Dock again. The pill stays.

### Pill (flows 6, 12)

- A small dark vertical capsule, about 44 pt wide and 88 pt tall, slightly translucent with a hairline border and soft shadow, docked to the right edge of the screen, vertically centered on first launch (Granola's pill, `osis/references/granola/03-floating-pill.png`). The glyph sits on top and a status area below. States that need words grow leftward from the edge into a horizontal card and return to the capsule after. Draggable anywhere by its body; its position is remembered per display.
- It floats above every app, on every Space, and over other apps' full-screen windows. It never takes focus: clicking it does not deactivate the app the employee was using, and keyboard focus stays where it was.
- Idle: shows only the app glyph. Hover grows it leftward to reveal the text "Hold fn to flag" (the shell's sample capture key; every place that names the key reads it from one `CaptureKeyDisplay` value, so phase 03 swaps the source, not the strings). Moving the pointer away collapses it.
- Click (not hold): opens the main window on Home.
- The pill has five visual states, all built in the shell and cycled from the Debug submenu so they can be reviewed:
  1. **Idle**: glyph only.
  2. **Listening**: three activity dots under the glyph, then the card grows leftward with "Listening" and the microphone name ("MacBook Pro Microphone"). No timer yet.
  3. **Recording**: red recording dots (Granola's recording control), a level meter animating from sample values, a timer counting up ("0:07"), the last line of live transcript in one line that wraps rather than truncates (the capsule grows taller for a second line), an X (discard) and a check (finish).
  4. **Processing**: a small spinner inside the capsule with "Preparing review".
  5. **Screen context paused**: glyph with a small slashed-screen badge; hover text "Screen context is off. Flags send voice only."
- The pill never pulses, bounces, or badges to ask for attention. No state is entered without the employee's action (in the shell, without a Debug action).
- Discard from Recording shows, inside the capsule for 2 seconds, "Discarded. Nothing sent." then returns to Idle.

### Capture review panel (flow 6)

- Opens from the Debug submenu ("Show capture review") in the shell. In phase 04 it opens on key release.
- A separate floating panel, about 560 by 640 pt, centered on the display the pill is on. It can take keyboard input (the transcript is editable) but does not activate the app: the employee's app keeps its menu bar until they interact with the panel.
- Layout follows Granola's draft modal (`osis/references/granola/06-draft-modal.png`): large corner radius, serif title, rows, a notice strip, a footer with the primary action on the left.
- Header: serif title "This will be sent" and the initiative chip ("Procurement rollout"), switchable from a menu listing sample initiatives.
- One row per item, each with a remove X on the right:
  - **Transcript**: editable multi-line text, full length, no truncation.
  - **Screenshot**: a thumbnail (sample image bundled with the app). Clicking opens a larger view with a rectangle tool; drawn rectangles render as solid black boxes. The shell supports drawing and deleting boxes on the sample image; phase 04 burns them into the export.
  - **Clip**: a thumbnail with duration "0:12" and a scrub bar. The shell shows the static thumbnail and duration only.
  - **Apps**: removable chips ("Chrome", "SAP GUI", "Slack").
- Removing a row collapses it into a line "Screenshot removed. Undo".
- Above the footer, a notice strip with an info icon: "Leaders see this without your name."
- Footer: primary button "Send 4 items ⌘↩" (count reflects remaining rows; ⌘Return triggers it, because Return adds a new line in the transcript), outlined secondary "Discard" (Esc).
- In the shell, Send closes the panel and opens the answer card (below) streaming the stub answer from the local Worker. If the Worker is not running, the answer card shows the error state.

### Answer card (flow 8, rendered in phase 01 from the SSE stub)

- Opens in the main window's Home detail pane for the item just sent, and as a compact panel anchored near the pill if the main window is closed. In the shell, it appears in the main window.
- Sequence, driven by the stub stream:
  1. "Checking the Procurement rollout docs" with a subtle progress line.
  2. A **Provisional** labeled line: "Probably not covered in the docs. Sent to the owner. Still checking." (the stub sends this in one of its two scripted variants).
  3. Answer text streams in, 1 to 3 sentences, with numbered citation chips inline. Under it, a quote block for each citation: exact passage text, "Procurement Policy v3 · Section 4.2 Approvals", and a link "Open at passage" (inactive in the shell).
  4. A resolution row: class pill (**Answered**, **Sent to owner**, or **Still stuck**), "23 others hit this", and for routed classes "Routed to Procurement owner".
  5. One secondary button: "This didn't solve it". In the shell it flips the class pill to Still stuck locally and shows "Sent to owner. The cited passage is marked for review."
- If a provisional "not covered" is followed by a real answer, the card appends "Update: the docs do cover this." above the answer. It never silently removes the provisional line.
- Error state: "Couldn't reach Friction. Your flag is saved on this Mac and will send when the connection returns." (the outbox itself is phase 04).
- The stub has two scripts, chosen by a Debug toggle: **Answered** (no provisional line, citations, class Answered) and **Provisional then routed** (provisional line, no citations, class Sent to owner).

### Main window

A single window, about 1100 by 720 pt default, resizable, with a left sidebar and a content area. Title bar: traffic lights, a sidebar toggle, and a search icon (inert in the shell), as in Granola. Content sits in a centered column that keeps its width whether the sidebar is open or collapsed. No sign-in in the shell; a sample person is always signed in.

Sidebar, worker section (everyone):
- **Home**: my record.
- **Ask**: chat.
- **Q&A**.

Sidebar, initiative section (only when the sample person has the leader permission; a Debug toggle switches leader on and off so both views are reviewable):
- **Initiatives**
- **Insights**
- **Health**

Sidebar footer, Granola style: a row of small icon buttons including **Settings** (placeholder page with "Capture key", "Screen context", "Account" rows, all inert), a hairline, then the organization row at the very bottom: organization name ("Acme Logistics") and the signed-in person's initials.

The initiative section header is styled like Granola's "Spaces" header. The selected row gets a filled, rounded, slightly lighter background.

#### Home (flow 11)

- Serif page heading, Granola's "Coming up" treatment. Tabs under it: All, Waiting, Fixed.
- Grouped by day ("Today", "Yesterday", "Monday 21 September") with small muted group headers.
- Each row, Granola's list row: a 40 pt rounded-square tile with the flag or question glyph; as the title, my words in full (wrapped, never truncated); a muted second line with the initiative, class pill, and "23 others"; on the right the outcome text (Answered, With owner, Fixed) and the time.
- A floating "Ask anything" composer capsule is pinned to the bottom of the Home column, and the list scrolls under it. Sending from it opens Ask with that question and streams the answer there. It carries no suggested prompts.
- Selecting a row opens a detail pane on the right: exactly what was sent (transcript, redacted screenshot thumbnail, app chips), the answer card as it finished, and a timeline: Sent, Answered, Routed, Q&A published, Fixed, each with a date.
- A pinned card at the top (Granola card style: rounded, one step lighter than the background) when a sample fix notice exists: "Fixed: POs no longer need a finance call", the owner's one line on what changed, a link "See the corrected passage", and a button "Still happening?" (inert in the shell).
- Empty state (Debug toggle "Empty data"): "Nothing here yet. Hold fn whenever something gets in your way, or ask a question in Ask." (key name from `CaptureKeyDisplay`)
- Sample data: at least 8 items across 3 days, covering every class and every outcome, one with a fix notice.

#### Ask (flow 7)

- A chat thread with a composer at the bottom. Above the composer, a scope label: "Asking about: Procurement rollout" with a menu of the person's initiatives.
- Messages the person sends appear right-aligned; answers use the same answer card component as flags.
- In the shell, sending a message streams the stub answer from the Worker.
- No suggested prompts, no follow-up chips, ever.
- Empty state: "Ask anything about the changes you're part of. Answers come from the initiative's documents."

#### Q&A (flow 10)

- One section per initiative the person belongs to, with a search field at the top ("Search or ask"). In the shell, search filters sample entries locally; in phase 07 it runs through the answer pipeline.
- Each entry: the canonical question, the owner's answer, "Approved by Priya Raman, 18 September", "Asked by 41 people", and privately "You asked this" when the sample person did.
- Entries expand and collapse; the question text is never truncated.
- No votes, no comments.

#### Initiatives (flows 3, 3a, 4, 5)

- A Linear-style list: name, status chip (Draft, Live, Closed), owner, affected people count, documents ready count ("3 of 3 ready"), target date, health word.
- "New initiative" button opens a modal: name field; "What is changing" field; property chips row (Owner, Affected people, Target date); "Why" section; **Theses** list block with "+ Thesis" and the placeholder "Buyers can raise a PO without calling finance."; **Documents** drop zone. In the shell, dropping a file adds a row that steps through Uploading 40%, Extracting, Indexing, Ready (212 passages) on a timer, and a second sample row shows "Failed: couldn't read this PPTX" with Retry and Replace. Header summary "2 of 3 ready". The Publish button is disabled with the reason "Needs one ready document" until a row is Ready. Publishing in the shell adds the initiative to the local list only.
- Initiative detail: header with name and status, property chips, "What is changing", "Why", theses list with a verdict chip each (Holding, Breaking, No evidence yet), documents list with status and "Replace" and "Remove", affected people list, owners list, and a "Close initiative" action with a confirmation that says "Chat and flagging for this initiative will stop. Its evidence and insights stay readable."

#### Insights (flows 14, 17, 20)

- Grouped by thesis. Each thesis is a section header: the thesis sentence, verdict chip, evidence count.
- Under it, insight rows: one-sentence title, a three-segment bar with counts (Answered, Unanswerable, Still stuck), a small trend sparkline, owner chip or "Assign owner", fix state.
- Selecting an insight opens an evidence panel: transcript excerpts (no names, no audio), redacted screenshot thumbnails, app chips, dates by day only, documents marked suspect.
- One sample insight is below the anonymity threshold and shows "Evidence visible at 5 reports" instead of evidence.
- "Record fix" and "Assign owner" are present and inert in the shell.

#### Health (flow 16)

- Per initiative: a word label (Healthy, At risk, Breaking), then a "Changed since last week" line, then component rows, each with value, change since last week, whether it pushed health up or down, and a chevron to its evidence:
  - Theses holding: 3 of 5
  - Resolution split: communication gap, process gap, documents wrong (as counts)
  - Insights without an owner
  - Median time to fix
  - Documents marked suspect
- Never a bare number, never a gauge or donut.

### Copy rules

- Plain, second person, no exclamation marks. Status words come only from the Core Concepts vocabulary.
- No text anywhere is truncated or ellipsized. Rows grow; wide content wraps.
- No em dashes in any UI string.

### Out of scope for this spec

Real sign-in, real permissions prompts, real capture, real transcription, real network data other than the SSE stub and the health check, real document processing, and every analysis behavior. Settings rows are inert. The Dock-and-window policy, the pill, the panels, the navigation, and the sample data are fully real.

### What the person notices when the service side of the shell works

- The answer card streams from the local Worker in the shell, which proves the answer contract before any feature is built.
- The Inngest Cloud dashboard shows the app synced; a ping event runs to completion there. Nobody using the Mac app sees Inngest.

## Technology

### Decisions

| Decision | Rationale | Rejected |
|---|---|---|
| One main window with worker and initiative sections in one sidebar | Product says both surfaces live in one app and permissions decide what shows; one window avoids window-management work and gives Granola's single-sidebar feel | Two separate windows (Home, Initiatives): more activation-policy edge cases, harder for leaders who are also employees |
| Menu bar app (`LSUIElement` YES) switching to `.regular` activation policy while the main window is open | Required for the pill to draw over other apps' full-screen Spaces; keeps Dock presence honest | Always-regular app: pill does not show over full-screen apps |
| Pill is an `NSPanel` subclass, `.nonactivatingPanel` set at init, `canBecomeKey` false, shown with `orderFrontRegardless` | Never steals focus; style mask changes after init misbehave on 26.x | SwiftUI `Window` with `.windowLevel`: cannot guarantee non-activation |
| Capture review is a second `.nonactivatingPanel` with `canBecomeKey` true | Takes typing for transcript edits without activating the app | Regular window: activates app, changes the employee's menu bar |
| All sample data comes from the JSON fixtures in `packages/contracts/fixtures/`, bundled into the app as resources | One source for sample data and for contract tests; phase work swaps a data source, not screens | Hard-coded Swift sample structs: drift from contracts |
| Swift data access through a `FrictionClient` protocol with `FixtureClient` (shell) and `LiveClient` (partial: health check and SSE stub) | Feature phases replace fixture methods with live ones one at a time | Views calling URLSession directly |
| Contracts in Zod 4, Swift mirrors hand-written as Codable, both sides decode the same fixtures in tests | Single authority with a test that fails on drift; no codegen toolchain to maintain | quicktype or OpenAPI codegen: extra build step for 12 types |
| Every flow route exists in Hono returning 501 with `{ "flow": n, "status": "not_implemented" }` | Feature sessions add handlers inside existing route files, never touch the router | Adding routes per phase: router merge conflicts |
| Full schema migrated in the shell, including tables used only in later phases | Schema edits are the worst merge conflict; later phases add columns only | Schema per phase |
| better-auth tables are NOT created in the shell; domain tables carry `organization_id` and `user_id` as `text` without foreign keys | Phase 02 generates better-auth's tables with its CLI and adds the foreign keys in its own migration | Hand-writing auth tables now: guaranteed to disagree with better-auth's generator |
| Inngest v4 on Inngest Cloud from day one, with the dev server locally | Andrés asked for Cloud; syncing in the shell proves the deploy path before real functions exist | Dev server only until phase 05 |

### Architecture

```
packages/contracts          Zod 4 schemas, inferred TS types, SSE event types, Inngest event catalog, JSON fixtures
  src/concepts/*.ts         one file per Core Concept
  src/sse.ts                answer stream event union
  src/events.ts             Inngest event names and payload schemas
  fixtures/*.json           sample data, used by TS tests, Swift tests, and the Mac app

apps/api                    Cloudflare Worker (Hono)
  src/index.ts              Hono app, route mounting, /api/inngest
  src/routes/*.ts           one file per surface area, every flow route present
  src/sse/stub.ts           scripted answer streams (Answered, Provisional then routed)
  src/inngest/client.ts     Inngest client with Hono bindings middleware
  src/inngest/functions/    system-ping.ts only in the shell
  src/db/schema.ts          Drizzle schema, all tables
  src/db/client.ts          per-request Drizzle client over Hyperdrive
  src/analysis/seam.ts      AnalysisSeam interface and NoopAnalysis
  drizzle/                  generated migrations
  wrangler.jsonc

apps/mac                    macOS app
  project.yml               xcodegen spec (committed)
  Friction/App/             FrictionApp.swift, AppDelegate.swift, ActivationPolicy.swift
  Friction/Pill/            PillPanel.swift, PillView.swift, PillState.swift, PillPositionStore.swift
  Friction/Capture/         CaptureReviewPanel.swift, CaptureReviewView.swift, RedactionCanvas.swift
  Friction/Answer/          AnswerCardView.swift, AnswerStream.swift (SSE consumer, reducer)
  Friction/Main/            MainWindow.swift, Sidebar.swift, and one folder per surface:
                            Home/, Ask/, QA/, Initiatives/, Insights/, Health/, Settings/
  Friction/Client/          FrictionClient.swift, FixtureClient.swift, LiveClient.swift
  Friction/Contracts/       Codable mirrors of every concept and SSE event
  Friction/Debug/           DebugMenu.swift (Debug builds only)
  Friction/Resources/       fixtures (copied from packages/contracts/fixtures at build), sample screenshot, Assets
  FrictionTests/            fixture decoding, answer stream reducer, pill panel invariants
```

### Contracts (`packages/contracts`)

Zod 4 schemas, one per Core Concept, named exactly as in `product.md`. IDs are UUID strings. Timestamps are ISO 8601 strings.

- `Initiative`: id, organizationId, name, whatIsChanging, why, status (`draft | live | closed`), targetDate (nullable), createdAt, closedAt (nullable).
- `Thesis`: id, initiativeId, statement, verdict (`holding | breaking | no_evidence`), position.
- `InitiativeMember`: initiativeId, userId, role (`affected | owner | leader`).
- `Document`: id, initiativeId, title, activeVersionId (nullable), suspect (boolean), createdAt.
- `DocumentVersion`: id, documentId, r2Key, mimeType, byteSize, status (`uploading | extracting | indexing | ready | failed`), failureReason (nullable), passageCount (nullable), createdAt.
- `Passage`: id, documentVersionId, initiativeId, headingPath, locator (page or slide number, nullable), text, position. (Embedding is service-only, not in the contract.)
- `Flag`: id (client-generated UUID, also the idempotency key), initiativeId (nullable until judged), transcript, screenshotKey (nullable), clipKey (nullable), appNames (string array), resolutionClass (nullable until answered), createdAt.
- `Question`: id (client-generated), initiativeId, text, resolutionClass (nullable), createdAt.
- `Answer`: id, flagId or questionId (exactly one), text, citations (array of `{ passageId or qaEntryId, quote, documentTitle, locator }`), provisionalShown (boolean), createdAt.
- `ResolutionClass`: `answered | unanswerable | still_stuck`. UI copy maps unanswerable to "Sent to owner".
- `QAEntry`: id, initiativeId, question, answer (nullable while drafted), status (`draft | published | needs_reapproval`), approvedByUserId (nullable), approvedAt (nullable), askedCount.
- `Cluster`: id, initiativeId, canonical (short description), memberCount.
- `Insight`: id, initiativeId, title, clusterIds, thesisLinks (array of `{ thesisId, relation: supports | breaks }`), classSplit (`{ answered, unanswerable, stillStuck }`), ownerUserId (nullable), fixId (nullable), evidenceVisible (boolean; false below the anonymity threshold).
- `Owner`: represented as `ownerUserId` on Insight and as `InitiativeMember` role `owner`. No separate table.
- `Fix`: id, insightId, recordedByUserId, summary, recordedAt.
- `Health`: initiativeId, label (`healthy | at_risk | breaking`), components (array of `{ key, label, value, changeSinceLastWeek, direction: up | down | flat }`), computedAt.
- `Notice`: id, userId, kind (`fix_recorded | qa_published`), refId, title, body, createdAt, readAt (nullable).
- `MyRecordItem`: the Home row view model: kind (`flag | question`), id, text, initiative name, resolutionClass, othersCount, outcome (`answered | with_owner | fixed`), createdAt, timeline entries.

SSE events (`src/sse.ts`), discriminated on `event`:
- `meta`: `{ eventId, initiativeId, initiativeName, initiativeConfidence }`
- `provisional`: `{ message }`
- `delta`: `{ text }`
- `citation`: `{ index, passageId or qaEntryId, quote, documentTitle, locator }`
- `class`: `{ resolutionClass }`
- `count`: `{ othersCount }`
- `done`: `{ answerId }`
- `error`: `{ code, message }`

Inngest event catalog (`src/events.ts`), names only plus payload schemas, used from phase 05 onward: `ft/system.ping`, `ft/document.uploaded`, `ft/document.replaced`, `ft/document.removed`, `ft/document.ready`, `ft/event.answered`, `ft/event.still_stuck`, `ft/cluster.requested`, `ft/cluster.updated`, `ft/initiative.evidence_changed`, `ft/qa.published`, `ft/fix.recorded`.

Fixtures (`fixtures/*.json`): organization "Acme Logistics"; people (a leader "Priya Raman", owners, the signed-in employee "Sam Okafor"); two initiatives ("Procurement rollout" live with 3 documents and 4 theses; "New timesheets" live with 2 documents and 2 theses) plus one draft and one closed; at least 8 my-record items covering every class and outcome; 6 Q&A entries; 5 insights across theses including one below threshold; health for each live initiative; one fix notice. Every fixture parses with its Zod schema in a test.

### Service (`apps/api`)

- Packages (latest at build time; versions checked 23 September 2026): `hono` 4.13.x, `inngest` 4.21.x, `drizzle-orm` 0.45.x, `drizzle-kit`, `pg` (node-postgres, for Hyperdrive), `zod` 4.x, `wrangler` 4.x, `vitest`, `@cloudflare/vitest-pool-workers`.
- `wrangler.jsonc`: name `friction-telemetry-api`, `compatibility_flags: ["nodejs_compat"]`, current compatibility date, bindings `HYPERDRIVE` (Hyperdrive config over the Neon direct URL), `FILES` (R2 bucket `friction-telemetry-docs`), `AI` (Workers AI, used from phase 05). Local dev on port 8787 (`wrangler dev --port 8787`; Wrangler fails when the port is busy rather than drifting). `.dev.vars` holds `INNGEST_DEV=1` locally and is git-ignored; `localConnectionString` for Hyperdrive points at the Neon dev branch URL.
- Routes, every one present, returning 501 unless stated:
  - `GET /v1/health`: 200 `{ ok: true, version }`. Real in the shell.
  - `POST /v1/events`: flags and questions (flows 6, 7, 8). Real in the shell as the SSE stub: validates the body against the Flag or Question schema, then streams one of the two scripts with realistic pacing (meta at 50 ms, provisional at 400 ms when scripted, deltas every 40 ms, citations, class, count, done). Script chosen by header `x-ft-stub-script: answered | provisional_routed`, default answered.
  - `POST /v1/events/:id/still-stuck` (flow 9)
  - `GET /v1/me/record`, `GET /v1/me/notices` (flows 11, 21)
  - `GET /v1/initiatives/:id/qa` (flow 10)
  - `POST /v1/initiatives`, `GET /v1/initiatives`, `GET /v1/initiatives/:id`, `PATCH /v1/initiatives/:id`, `POST /v1/initiatives/:id/close`, `POST /v1/initiatives/:id/publish` (flows 3, 4, 5)
  - `POST /v1/initiatives/:id/documents`, `PUT /v1/documents/:id`, `DELETE /v1/documents/:id`, `GET /v1/documents/:id/status` (flows 3a, 4, 19)
  - `GET /v1/initiatives/:id/insights`, `POST /v1/insights/:id/owner`, `POST /v1/insights/:id/fix` (flows 14, 17, 20)
  - `GET /v1/initiatives/:id/health` (flow 16)
  - `POST /v1/qa/:id/answer`, `POST /v1/qa/:id/approve` (flow 18)
  - `/api/auth/*` reserved for better-auth (phase 02); returns 501 in the shell.
  - `GET|PUT|POST /api/inngest`: Inngest serve handler.
- Each route file carries a comment naming its flow numbers.
- `AnalysisSeam` interface in `src/analysis/seam.ts` with methods `onEventAnswered`, `recluster`, `scoreInsights`, `draftQA`, `computeHealth`, and a `NoopAnalysis` implementation. Phase 09 supplies the real one.

### Inngest (Cloud)

- Client: `new Inngest({ id: "friction-telemetry", middleware: [HonoBindingsMiddleware] })` where the middleware passes Hono's `env` into function `ctx.env`, as documented for v4 on Workers (Context7 `/websites/inngest`, "cloudflare-workers-environment-variables"). v4 syntax: triggers inside the function config (`triggers: { event: "ft/system.ping" }`).
- Serve: `app.on(["GET","PUT","POST"], "/api/inngest", serve({ client: inngest, functions }))` from `inngest/hono`.
- Function in the shell: `system-ping`, trigger `ft/system.ping`, one `step.run("echo", ...)` returning `{ receivedAt }`. Proves sync and execution in Cloud.
- Keys: `INNGEST_SIGNING_KEY` and `INNGEST_EVENT_KEY` from an onc9-owned Inngest Cloud account. The keys currently in `~/.secrets` belong to the mystory account and must not be used. Andrés creates the onc9 Inngest account (or app environment) and adds both keys to `~/.secrets/master.env` and to the Worker's secrets in the Cloudflare dashboard.
- Local: `INNGEST_DEV=1` in `.dev.vars`, then `bunx inngest-cli@latest dev -u http://localhost:8787/api/inngest` (dev UI on 8288).
- Cloud sync: after the Worker is deployed by push to `main`, sync the app at `https://<worker-host>/api/inngest` from the Inngest Cloud dashboard (or `curl -X PUT https://<worker-host>/api/inngest`). Verify by sending `ft/system.ping` from the dashboard and seeing the run complete.

### Database (Neon)

- Neon project `friction-telemetry` exists (created 24 Sep 2026): id `soft-lake-93513452`, org `org-sparkling-dawn-02665417`, Postgres 17, region `aws-eu-central-1` (Frankfurt, the Neon region nearest the UAE; Neon has no Middle East or India region). Branch `dev` for local work. In `~/.secrets/projects.env`: `FRICTION_TELEMETRY__DATABASE_URL` (dev, direct), `FRICTION_TELEMETRY__DATABASE_URL_POOLED` (dev, pooled), `FRICTION_TELEMETRY__PROD_DATABASE_URL` (main, direct). Never commit them. Hyperdrive config `friction-telemetry-prod` (id `8f08ea1a779445e486cece59c14a3178`) points at the main branch; put that id in `wrangler.jsonc`.
- Migration 0000 enables `vector` and creates every domain table: `initiative`, `thesis`, `initiative_member`, `document`, `document_version`, `passage` (`embedding vector(1024)`, `tsv tsvector` generated from `text`, HNSW index on `embedding vector_cosine_ops`, GIN on `tsv`, btree on `(organization_id, initiative_id)`), `flag`, `question`, `answer`, `citation`, `qa_entry` (also `embedding vector(1024)` and `tsv` so Q&A is searched with passages), `cluster`, `cluster_member`, `insight`, `insight_thesis`, `fix`, `notice`, `health_snapshot` (components as `jsonb`).
- `qa_entry_event` links flags and questions to Q&A entries (who asked). Columns: `organization_id text not null`, `qa_entry_id uuid not null references qa_entry`, `event_id uuid not null`, `event_kind event_kind ('flag','question') not null`, `user_id text not null`, `source qa_link_source ('cited','owner_answer','cluster') not null`, `attached_by_user_id text null` (set for `owner_answer`), `created_at timestamptz not null default now()`. Primary key `(qa_entry_id, event_id)`. Partial unique index on `event_id where source = 'owner_answer'` (an owner attaches one event to at most one entry). Index `(organization_id, user_id)`. Writers: 06 or 07 (`cited`), 08 (`owner_answer`), 09 (`cluster`), all through one helper `linkEventToQA(tx, { qaEntryId, eventId, eventKind, userId, source, attachedByUserId? })` in `apps/api/src/qa/links.ts` (insert on conflict do nothing). `askedCount` is never stored: it is `count(distinct user_id)` over this table, computed on read. Owned by the shell so phases 07 and 08, which build in parallel, share one definition.
- Every table has `organization_id text not null`. User references are `text` without foreign keys until phase 02.
- Enums as Postgres enums matching the contract enums exactly.
- `flag.id` and `question.id` are client-generated and the primary key, so retried sends upsert.
- Seed script loads the contracts fixtures into the `dev` branch so later phases have data.

### Mac app (`apps/mac`)

- `project.yml`: target `Friction`, bundle id `systems.onc9.friction`, deployment target macOS 26.0, Swift 6 language mode, `LSUIElement: YES`, hardened runtime, `DEVELOPMENT_TEAM: P62A3QS593`, `CODE_SIGN_IDENTITY: "Developer ID Application"`, `CODE_SIGN_STYLE: Automatic`. Entitlements file with `com.apple.security.device.audio-input` (needed by phase 04; declaring it now keeps project.yml stable). Info.plist usage strings for microphone, speech recognition, and screen capture written now in plain language:
  - Microphone: "Friction listens only while you hold the capture key."
  - Speech recognition: "Friction turns what you say into text on this Mac so you can review it before anything is sent."
  - Screen capture: "Friction keeps the last few seconds of your screen on this Mac so a flag can include what you were looking at. Nothing leaves without your review."
- Swift packages: `sindresorhus/KeyboardShortcuts` from 3.1.0, `mattt/EventSource` from 1.5.1, `sparkle-project/Sparkle` from 2.10.0. Linked now; Sparkle is not started until a later phase.
- A pre-build script copies `packages/contracts/fixtures/*.json` into the app bundle's resources.
- `xcodebuild` needs full Xcode: this Mac's active developer directory is the Command Line Tools. Build with `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer` rather than changing the system setting.
- Pill panel recipe (from Part 3 of the research doc): style mask `[.nonactivatingPanel, .borderless, .fullSizeContentView]` at init, `isFloatingPanel = true`, `level = .floating`, `collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary, .ignoresCycle]`, `hidesOnDeactivate = false`, `becomesKeyOnlyIfNeeded = true`, `isMovableByWindowBackground = true`, clear background, shadow, hosting view overriding `acceptsFirstMouse` to true, `canBecomeKey` and `canBecomeMain` false, shown with `orderFrontRegardless()`.
- Position persistence keyed by display identifier in `UserDefaults`.
- Activation policy: `.accessory` at launch; `.regular` when the main window opens; back to `.accessory` when it closes.
- `AnswerStream`: POSTs to `/v1/events` with the fixture flag body, reads SSE with EventSource's `AsyncBytes` events, and feeds a pure reducer `(AnswerState, SSEEvent) -> AnswerState`. The reducer is the unit under test. API base URL from a build setting: `http://localhost:8787` in Debug.

### Key flows

- **Stub answer end to end.** Trigger: Send in the capture review panel, or send in Ask. The app POSTs a fixture-shaped body; the Worker validates it and streams the chosen script; the reducer builds the card. Failure: connection refused or non-2xx sets the card's error state with the saved-on-this-Mac message. Invariant: the card never shows a class before the `class` event arrives.
- **Inngest ping.** Trigger: event `ft/system.ping` sent from the Inngest dev UI locally, or the Cloud dashboard after deploy. Terminal state: run completed with `{ receivedAt }`. Failure: signature failure in Cloud means a missing or wrong signing key in the Cloudflare dashboard.

### Tests (each must be seen failing before it is trusted)

- Contracts: every fixture parses with its schema; a fixture with a misspelled enum value fails. Mutation to prove red: rename one enum member in a schema and confirm the fixture test fails naming it.
- API: `POST /v1/events` with an invalid body returns 400; with a valid body streams events in the order `meta`, (`provisional`), `delta`+, `citation`*, `class`, `count`, `done`. Mutation: swap the order of `class` and `delta` in the stub and confirm the ordering test fails.
- API: every flow route listed above responds (501 or real), so a missing route fails a table-driven test.
- Swift: every fixture decodes into its Codable mirror (the drift test). Mutation: rename a Swift property and confirm decoding fails.
- Swift: the answer reducer never sets a class before a `class` event, appends rather than replaces when an answer follows a provisional line, and sets the error state on a transport failure. Mutation: have the reducer set the class on `done` and confirm the test fails.
- Swift: pill panel invariants: `canBecomeKey == false`, style mask contains `.nonactivatingPanel`, collection behavior contains `.canJoinAllSpaces` and `.fullScreenAuxiliary`. Mutation: drop `.fullScreenAuxiliary` and confirm failure.

### Rollout

1. Create the private GitHub repo `onc9-systems/friction-telemetry`, add it as `origin`, push `main`. (Outward-facing but private and reversible.)
2. Andrés, one time in the Cloudflare dashboard: create the Worker `friction-telemetry-api` connected to the repo with root `apps/api`, the R2 bucket `friction-telemetry-docs`, and the Hyperdrive config over the Neon production branch; add `INNGEST_SIGNING_KEY` and `INNGEST_EVENT_KEY` as Worker secrets. Read-only `wrangler` may be used to confirm.
3. Push to `main` deploys. Sync the app in Inngest Cloud. Send `ft/system.ping` and see it complete.
4. Build the signed Mac app locally. Notarization is not required in this phase; it is required before the app goes to anyone else.

Nothing in this spec changes data a real person owns, so rollback is reverting commits and deleting the Neon branch.

---

## Engineering Notes (build, 24 to 25 September 2026)

Built in the orchestrator session at Andrés's request. The library facts come from `01-shell.docs.md` and fresh Context7 queries, listed per area below.

### What is verified
- **Contracts:** 29 tests pass. Mutation: renaming the `answered` enum member failed 6 tests, including every fixture that uses it.
- **API:** 34 tests pass (vitest 4 with `@cloudflare/vitest-plugin`). Ten mutations each failed at least one test:
  - the class and delta order swapped in the stub (the spec's own mutation);
  - a route missing, or reporting the wrong flow number;
  - a constant version in the health check;
  - a validator that accepts anything;
  - no JSON error for malformed bodies;
  - `eventId` not replaced with the posted id;
  - a fixed `receivedAt`;
  - the middleware dropping `env`;
  - errors without field names.
- **Mac:** 17 Swift Testing tests pass. Each spec mutation failed its test:
  - a renamed Swift property fails the drift test;
  - a reducer that sets the class on `done` fails the class-before-event test;
  - dropping `.fullScreenAuxiliary` fails the pill test;
  - reverting request bodies to omitted nil keys fails the null-encoding test.
- **End to end:** the Mac app posted to the local Worker and streamed both scripts into the answer card. Answered showed 2 citations, the class and "23 others". Provisional then routed showed the provisional line, Sent to owner, and "7 others". With the Worker down, the card shows the saved-on-this-Mac error.
- **Database:** Neon `dev` branch migrated (pgvector 0.8.0, 20 tables, HNSW and GIN indexes) and seeded from the fixtures. The seed is idempotent.
- **Inngest:** `ft/system.ping` completed against the local dev server (the `echo` step returned `receivedAt`).

### Deviations from this spec, and why
- The docs deltas in `01-shell.docs.md` Part 0 were all applied.
- **Main window:**
  - It is an AppKit `NSWindow` hosting `NSHostingController(rootView:)` with `sceneBridgingOptions = [.toolbars]` (Context7 `/websites/developer_apple_swiftui`). This replaces the unverified `NSHostingSceneRepresentation` route and keeps the activation policy in one owner (`ActivationPolicy`).
  - The entry point is `main.swift`.
- **Request bodies:** the Swift encoding of `Flag` and `Question` writes nullable fields as explicit `null`, because Zod `.nullable()` rejects a missing key. The end-to-end run found this bug (the Worker answered 400). A test now holds it.
- **Contract additions:**
  - `Workspace`, `Organization` and `Person` for the sample directory (not Core Concepts; phase 02 replaces the source).
  - `MyRecordItem` gains `initiativeId`, `routedTo` and `answerId`.
  - `Health` gains `changeSummary`.
  - `QAEntry` gains `askedByMe`.
  - A new `InsightEvidence` view model holds excerpts, suspect documents and sparkline counts.
  - SSE `data` does not repeat the event name.
  - `contracts` stays free of `inngest`; the Worker wraps each catalog schema with `eventType`.
- **Sample dates:** the Mac shifts sample instants at load time so the newest item falls on today, which keeps "Today" and "Yesterday" meaningful.
- **Schema (API):**
  - An added `insight_cluster` join table holds `Insight.clusterIds`.
  - `classSplit` is stored as three columns.
  - `fixId` is derived from `fix.insight_id`.
  - `citation.passage_id` and `citation.qa_entry_id` have no foreign keys; a check constraint requires exactly one of them.
  - The `initiative_member` primary key is `(initiative_id, user_id, role)`.
  - `askedCount` is derived, not stored; the seed does not invent askers.
- **Wrangler:** `account_id` is pinned to the onc9 account (`6feca0ab...`). This machine sees a client's account too.
- **Local Worker:** `bun run dev` in `apps/api` reads the Neon `dev` direct URL from `~/.secrets/projects.env` into `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE`; it is never written into the repo. Start the Inngest dev server with `npx inngest-cli@latest dev -u http://localhost:8787/api/inngest --no-discovery`; `bunx` skips the CLI binary download.
- **Inngest tests** run in Node, not workerd, because `@inngest/test` pulls in `@opentelemetry/api`. `@inngest/test` does not run `wrapRequest`, so the middleware's hooks are tested directly (this settles docs Part 5 item 6).
- **Debug snapshots:** `-FrictionSnapshot <dir>` renders every pill state, the capture review panel and every surface to PNGs, then quits. It exists because `screencapture` needs Screen Recording and layer capture cannot see glass or scroll views. `PageScroll` lays pages out flat in that mode.

### Not verified yet
- **Visual checks on a real screen:** the pill over another app's full-screen Space, not taking focus when clicked, and hover while Friction is inactive. The panel configuration is tested; the behavior needs one look on screen.
- **Inngest Cloud sync and the Cloud ping:** these need the Worker created in the Cloudflare dashboard (rollout step 2), then a push to `main`. After that, check `GET /api/inngest` for `has_signing_key: true`.
- **Swift package versions float:** the generated `.xcodeproj` (and its `Package.resolved`) is not committed, so versions float within their `from:` ranges. Pin with `exactVersion:` before a release build.
- **Release signing:** a signed Release build (Developer ID) has not been made. Debug builds sign with Apple Development.
