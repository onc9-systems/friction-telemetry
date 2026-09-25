---
type: research
date: 2026-09-23
source: three research agents (Mobbin plus practitioner threads; Context7 plus live vendor docs; Apple docs, WWDC, Context7)
summary: UI/UX reference patterns and implementation details for the 21 flows in v1/core/product.md
---

# Flows research: UX patterns and implementation

Research for the Flow Catalogue in `osis/v1/core/product.md`. Flow numbers below refer to that catalogue. Three reports follow unedited: UX patterns (Part 1), the service (Part 2), the macOS app (Part 3). Items marked unverified in the reports stay unverified.

## Reading guide: what the research surfaced

Decisions these reports raise, for the iteration brief:

1. **Stack recommendations.** Neon Postgres with pgvector and full-text search as the single store for relational data and passages (atomic reindex, Q&A searchable on commit) over Vectorize or AI Search. Drizzle through Hyperdrive. better-auth on the Worker with SSO and SCIM plugins (WorkOS if customer IT demands self-serve setup). SSE from the Worker for the answer; Inngest for everything after it. Claude Haiku 4.5 for the instant answer with `search_result` citations.
2. **Jev shape.** Choice for which initiative (plus one Noul per initiative), a Noul against the document outline for the early "likely covered" judgment (show provisional "not covered" only below about 0.1), and per-passage Nouls packed into one request to set the class. The account rate limit (1,200 requests per minute) forces the packing. Jev judges outlines and passages, not whole documents (32k state limit).
3. **"23 others hit this" needs a fast path.** Clusters form after the answer, so the count at answer time comes from a nearest-neighbour lookup over recent events, not from clustering.
4. **The capture key needs no permission.** KeyboardShortcuts (Carbon hotkeys) supports hold-to-talk with no Accessibility or Input Monitoring grant. Part 1 lists Accessibility for the capture key; Part 3 supersedes it. Flow 2 drops that permission.
5. **The rolling buffer is visible to the employee at all times.** macOS shows a screen-recording indicator whenever capture runs and re-asks for approval monthly. This bears directly on the open question of whether the buffer can be turned off. Buffer-off mode is "screenshot at press, no clip".
6. **macOS 26 minimum**, forced by on-device transcription (SpeechTranscriber). Transcription must be on device because the employee reviews the transcript before anything leaves.
7. **Leader anonymity has three enforcement points:** the evidence panel, screenshots (the reporter's own name and avatar in app chrome), and a minimum group size (Culture Amp uses 5). Part 1 recommends leaders get transcripts, never audio.
8. **Fix notices stay in the home window**, with at most a static dot on the menu bar icon. No system banners, consistent with "never interrupts". An opt-in "tell me when this is fixed" at send time would permit a local notification.
9. **PPTX needs its own extractor**; Workers AI `toMarkdown` does not read it.
10. **Mobbin has no macOS captures.** Pill and permission references come from iOS and web plus vendor docs.

---

# Part 1: UX patterns

## UI/UX reference report for friction-telemetry v1: pill, capture, answers, home window, Q&A and the initiative surface

**Coverage caveat:** Mobbin only indexes web and iOS apps. It has no macOS desktop captures, so Granola desktop, Superwhisper, Raycast, CleanShot and ChatGPT desktop could not be pulled. For the pill I used Granola iOS, Wispr Flow iOS and Loom web, and took the desktop behaviour from vendor docs. Every Mobbin link below is a screen or flow I looked at.

---

### 1. Floating pill and hold-to-talk

**References**
- **Granola iOS, recording** ([screen](https://mobbin.com/screens/5c3372c3-e5ea-4346-9f1f-6b0ce06afaf0)): a bottom bar with only three things: pause, timer "02:30" with a green level meter, and a black "End" pill. On desktop, Granola's indicator floats on the right edge of the screen. You can drag it away, and clicking it returns you to the note ([docs](https://docs.granola.ai/help-center/taking-notes/transcription)).
- **Loom recording bar** ([active](https://mobbin.com/screens/96664708-cd8b-43bd-86c9-27efe0f69202), [paused](https://mobbin.com/screens/9c31769d-e00c-47a6-9c61-f1cc243183e8)): a dark capsule with stop, pause, rewind, timer, draw, restart and delete. When paused it shows a toast ("Recording paused. Press rewind to play back and trim") and a keyboard shortcut tooltip ("Resume Opt Shift P").
- **Wispr Flow** ([onboarding flow](https://mobbin.com/flows/a743edfe-4338-4537-984b-17f173f3212d)): the listening sheet has X on the left, a check on the right, a dotted waveform, and "Listening / iPhone Microphone", so it names the mic in use. On Mac, holding Fn is push-to-talk. Double-tapping Fn within half a second, or pressing Fn+Space, locks hands-free. The Flow Bar is clickable and has a visibility setting. Keyboards without Fn fall back to Ctrl+Opt ([docs](https://docs.wisprflow.ai/articles/6391241694-use-flow-hands-free)).
- **Todoist Ramble** ([screen](https://mobbin.com/screens/514ad767-e56f-49ce-97a3-3c7b73ef657c)): a live waveform in the header, with example sentences ("Try ...") as the empty state.
- **Practitioner input:** on the [Aqua Voice HN thread](https://news.ycombinator.com/item?id=43634005), users could not tell listening from idle, and AirPods "mic init latency" swallowed their first words. On the [Ghost Pepper HN thread](https://news.ycombinator.com/item?id=47666024), users asked for a live transcript "to jog my memory about what I've just said".

**Pattern to adopt**
- **Idle:** a small capsule docked to an edge and draggable, like Granola. It shows only the app glyph, and hovering reveals "Hold ⌃⌥ to flag".
- **Arming:** when the key goes down, show "Listening" only once audio frames actually arrive. The hold must never start on a dead mic.
- **Recording:** the capsule grows sideways and shows:
  - a red dot, a level meter and a timer
  - the last line of live transcript
  - the mic name
  - X to cancel and a check to finish
- **Hold vs lock:** releasing the key goes straight to review. Double-tapping locks hands-free and shows a lock glyph. Esc discards and says "Discarded. Nothing sent."
- **Processing:** a spinner inside the capsule, then the review window opens. It never auto-sends.

**Anti-patterns**
- Loom's seven-button bar. A flag needs finish and cancel, nothing more.
- Modal recorders that take focus (ClassDojo, Canva).
- A recording indicator that appears late.
- Hiding the pill by default.

**Tension with the rules**
- "Never interrupts" means the pill never pulses, badges or nudges to ask for a flag.
- The rolling screen buffer runs while the pill is idle. To keep "nothing silent" honest, the idle pill should carry a persistent buffer indicator with a pause control. This ties into the open question about whether the buffer can be turned off.

### 2. Capture review before send

**References**
- **Google Meet and Gemini "Report an issue"** ([flow](https://mobbin.com/flows/c8454570-7321-433c-ac80-36f5ba625ef8), [flow](https://mobbin.com/flows/bafc8313-5662-4733-a1ff-3f5b1b8eef1a)): a right-side sheet with "Please don't include any sensitive information", an optional "Capture screenshot", an opt-in "We may email you" checkbox, and then "Report sent, thank you!"
- **WhatsApp image editor** ([screen](https://mobbin.com/screens/d580884f-9587-4f3a-bab5-482c117b4dea)): drag a rectangle to pixelate, with handles, an intensity slider and a trash icon.
- **Substack image editor** ([screen](https://mobbin.com/screens/b847fae0-cab0-47d6-b207-4533a1130e21)): a dedicated "Redact" tool in the left rail.
- **Microsoft Teams** ([screen](https://mobbin.com/screens/9d6a4c29-0910-4753-b781-8c4d9f1d5821)): an explicit Yes/No for "Share relevant content samples and additional log files?"
- **Zoom** ([screen](https://mobbin.com/screens/234d7fdf-c57d-43d3-a09d-422db84d13ac)): a "Who can see your feedback?" link in the footer.
- **Relevance AI** ([flow](https://mobbin.com/flows/448e71fe-a1ac-45a2-8e9c-f3397a0b8f2a)): displays the attached email, project and region, plus "Need help right now? Try Support AI".
- **Jam** ([docs](https://jam.dev/docs/record-a-jam/video-screen-recording/video-blur)): the blur tool pauses recording, you click an element to blur it and click again to undo. With auto-blur, the unblurred content never reaches the server.
- **Sentry replay** ([docs](https://docs.sentry.io/platforms/javascript/session-replay/privacy/)): masks all text and blocks all media on the client by default.

**Pattern to adopt**
- A separate window, not a modal over the app where the friction happened. It is laid out as a manifest headed "This will be sent", with one row per item and a remove X on each:
  - Transcript: editable inline.
  - Screenshot: a thumbnail that opens a rectangle pixelate tool like WhatsApp's.
  - Clip "0:12": scrub, trim, and region blur that holds across frames, like Jam.
  - App names: removable chips.
  - Any system metadata: listed as its own row too.
- Redaction is burned in on the Mac, before upload.
- The footer has a primary "Send 4 items", "Discard", and a "Who sees this" line: "Leaders see this without your name."
- Offline state: "Waiting for connection. Will send exactly as approved."

**Anti-patterns**
- Google's "Some account and system information may be sent". A vague "may" breaks "show everything".
- A manual "Attach screenshot" upload (Grok, Dropbox Dash).
- Sentry-style default masking, which destroys the evidence. Pre-suggesting blur boxes over detected emails and numbers, visible and removable by the employee, is an acceptable middle ground.

**Tension with the rules**
- Review adds a step to a one-press capture. Keep it to one screen, with Send focused and Return to send.

### 3. Instant answer, provisional state, resolution, "didn't solve it"

**References**
- **Dropbox Dash** ([screen](https://mobbin.com/screens/f4ca9d48-c17a-40e5-98a2-f3a293483967)): "Thinking... Searching for 'Q1 challenges' / Analyzing 20 sources", with a live source list.
- **Customer.io agent** ([screen](https://mobbin.com/screens/fafcbfb9-fa85-4b4d-b17f-54df962305b5)): a collapsible "Searched docs" and a "5 references" popover.
- **Gemini Notebook** ([screen](https://mobbin.com/screens/c1644911-b9ff-4f0f-a4eb-61145ab23997)): a numbered chip on every sentence, and an "8 sources" scope label in the composer.
- **Gorgias** ([screen](https://mobbin.com/screens/e077aad0-3aaa-4244-8c91-452d0f9e7b5f)): the answer, then a card "AI Agent used the following sources", then a status timeline ending in "Closed".
- **Mistral** ([screen](https://mobbin.com/screens/4a5c8393-5ae0-47ee-a729-499c3d68256f)): "What was wrong?" chips.
- **Practitioner input:** [Frank Denis](https://00f.net/2025/06/04/rag/) argues for returning curated FAQ links alongside RAG. That supports preferring an approved Q&A entry over a generated answer.

**Pattern to adopt**
- The answer is one card that upgrades in place:
  1. "Checking the Procurement rollout docs", with the initiative name, Dash style.
  2. The provisional state carries a visible "Provisional" label: "Probably not covered in the docs. Sent to the owner. Still checking."
  3. The final answer is 1 to 3 sentences with numbered chips. Under it, a quote block shows the exact passage, the document and section name, and "Open at passage".
  4. A Q&A citation carries an "Owner answer" badge so it reads differently from a document citation.
- A resolution row sits under the answer:
  - a class pill: Answered, Sent to owner, or Still stuck
  - "23 others hit this"
  - "Routed to Procurement owner"
- One secondary button, "This didn't solve it". It takes an optional one-line reason, then flips the class and says "Sent to owner. The cited passage is marked for review."
- If a provisional "not covered" turns out wrong, append an update to the same card. Never retract silently.

**Anti-patterns**
- Thumbs up and down, which record nothing actionable.
- "Talk to a human" and ticket language. The product is not a helpdesk.
- Sources shown only as a list at the bottom.
- Suggested follow-up chips (Gemini Notebook), which break "never suggest".
- A satisfaction survey afterwards (Intercom has a template for this).

**Tension with the rules**
- Routing copy must not promise a reply. Use "The owner sees this. You'll hear here when it's fixed."

### 4. Employee home window (my record)

**References**
- **Linear inbox** ([screen](https://mobbin.com/screens/beb9d6b3-ec34-46d7-9332-320fcb32a338)): a list on the left, and a detail pane on the right with an activity timeline ("moved from Todo to In Progress").
- **Base44 My Support Tickets** ([screen](https://mobbin.com/screens/321af85e-b070-409c-aee0-56f225266c07)): Open, Closed and All tabs, ending in a "This ticket has been resolved" card.
- **Fireflies** ([screen](https://mobbin.com/screens/7593760e-a0b3-4873-b5f3-2780defcd538)): a status column with icon plus label.
- **Granola iOS note** ([screen](https://mobbin.com/screens/95e63adb-159f-4c50-9b1c-1d1550a4c82c)): a "Chat with note" bar at the bottom.
- **Wispr Flow home** ([flow](https://mobbin.com/flows/bf917cdc-b0cd-4f29-b046-9479cd6ec76f)): items grouped by day.

**Pattern to adopt**
- Granola-style sidebar with Home, Ask, and Q&A.
- Home is grouped by day. Each row shows:
  - a flag or question glyph
  - my words, wrapped and never truncated
  - an initiative chip and a class pill
  - "23 others"
  - the outcome (Answered, With owner, or Fixed)
- The detail pane shows exactly what was sent (redactions included), the cited answer, and a timeline: Sent, Answered, Routed, Q&A published, Fixed.
- Tabs: All, Waiting, Fixed.

**Anti-patterns**
- Ticket IDs, SLAs and priorities.
- Upvotes (Featurebase).
- A "Declined" status (Dribbble); this product has no such outcome.
- Personal stat counters like Wispr's "28 words dictated", which drift toward scoring individuals.
- Linear's ellipsized rows, which break the no-truncation rule.

### 5. Q&A section

**References**
- **Notion Verified popover** ([screen](https://mobbin.com/screens/96596a0d-32a0-4dcc-aa99-573ff6e90b64)): Expiration, Owner, "Last verified by X, date".
- **Slite knowledge management** ([screen](https://mobbin.com/screens/290fe23a-5d4a-4361-977c-1fbeef9c2f40)): quick-filter tiles for Outdated, Verification expired and Verification requested.
- **ElevenLabs FAQ** ([screen](https://mobbin.com/screens/1ff9832d-c93b-4cba-b56a-82fc7fbe2ddb)): an accordion with an "Ask" button in the header.
- **Bard help** ([screen](https://mobbin.com/screens/c7135f10-40d1-42f1-80fd-e9dd6c080249)): search on top, topics grouped in accordions.

**Pattern to adopt**
- Employee side: one page per initiative, with a search field that runs through the answer pipeline, so searching is asking.
- Each entry shows the canonical question, the owner's answer, "Approved by [owner], date", and "Asked by 41 people". Privately, it also shows "You asked this".
- Owner side, Slite style, has three queues: Drafts to answer, Needs re-approval (the document changed or is marked suspect), and Published.

**Anti-patterns**
- Votes, comments and threads in the Stack Overflow style. They contradict the rule that employees never browse or vote.
- Any verbatim employee text.

### 6. Create initiative, theses, and document processing

**References**
- **Linear new project** ([empty](https://mobbin.com/screens/cc38a735-233a-425e-b85d-87574c9f93af), [filled](https://mobbin.com/screens/9435c194-c967-4fcb-97bb-8cdee53b1026)): name, summary, a row of property chips (status, lead, members, dates), a long description, and a Milestones section below.
- **Linear initiative inline create** ([screen](https://mobbin.com/screens/83a32c27-4504-4f60-9aca-5708f52ba8fa)).
- **PandaDoc** ([screen](https://mobbin.com/screens/f7443f66-5e59-433b-a611-deebd86db562)): "Imported 1 of 4 files", with each row showing Imported, Processing or Uploading 90%.
- **AWS upload status** ([screen](https://mobbin.com/screens/d0b2a1fa-99a9-4c29-ba83-f77a3f850d40)): Succeeded, In progress 58%, Pending, plus an Error column and a summary.
- **Intercom Fin** ([screen](https://mobbin.com/screens/0b35c1d1-193c-44dd-8785-e5e65585ee06)): the banner "Your content is currently being ingested... Fin may not have your latest content", with a live Preview panel beside it.
- **StackAI** ([screen](https://mobbin.com/screens/89e694f3-663c-48b2-868d-0cf06bb57bc9)): a footer "Files: 2 Indexed: 2 Errors: 0".

**Pattern to adopt**
- A Linear-style modal:
  - Name and "What is changing"
  - Chips for Owner, Affected people and Target date
  - A "Why" section
  - Theses as a list block with "+ Thesis", using the product's own PO example as the placeholder
  - A documents drop zone
- Each document row moves through Uploading %, Extracting, Indexing, then either "Ready (212 passages)" or "Failed: reason", with Retry and Replace.
- The header summary reads "2 of 3 ready".
- Publish is disabled with a stated reason: "Needs one ready document."
- Processing continues after the modal closes.
- A Fin-style "Try a question" preview lets the leader test answers before publishing.

**Anti-patterns**
- PandaDoc's "Keep this window open".
- Chatbase's manual "Retrain agent" step ([screen](https://mobbin.com/screens/ea8eb92f-1f21-4675-90a9-f3e5bb1a039c)).
- Failures that are only visible on hover.

### 7. Insights grouped by thesis

**References**
- **Dovetail Channel themes** ([screen](https://mobbin.com/screens/f501023d-1e15-4dfb-be0b-f363f502ce0f)): a theme list with count bars, a stacked chart over time, and a right panel of "16 data points", each with date and source, under an AI summary.
- **Churnkey** ([screen](https://mobbin.com/screens/70ea5dfa-9c52-45d4-9105-59385e052f9a)): share bars per category, with "N responses".
- **Linear initiative projects table** ([screen](https://mobbin.com/screens/36065aa3-7929-4c53-a61d-7538096b3bba)): Health, Lead and Status columns.
- **Anti-pattern references:**
  - Dovetail highlight cards labelled with participant names ([screen](https://mobbin.com/screens/82c8f526-de94-4a19-9d95-f75d7a79704b)).
  - Hotjar's response detail, which shows email and country ([screen](https://mobbin.com/screens/82dfcf1a-062e-4eaa-b283-10f45e6d30bb)).
- **Anonymity threshold:** Culture Amp blocks any filter below a minimum group size, usually 5, and shows "not enough responses" instead ([docs](https://support.cultureamp.com/en/articles/7048386-confidentiality-protections-in-reporting)).

**Pattern to adopt**
- Each thesis is a section header: the sentence, a verdict chip (Holding, Breaking, or No evidence yet), and an evidence count.
- Insight rows under it show:
  - a one-sentence title
  - a 3-segment bar with counts: Answered, Unanswerable, Still stuck
  - a trend sparkline
  - an owner chip or "Assign owner"
  - the fix state
- The detail opens a Dovetail-style evidence panel: transcript excerpt, redacted screenshot, app names, date by day only, and documents marked suspect.
- Below the threshold, show "Evidence visible at 5 reports".

**Tension with the rules**
- Screenshots and audio can identify a person: their avatar or name in app chrome, or their voice. Recommendation: send leaders the transcript only, never audio, and auto-mask the reporter's own name and avatar in screenshots.

### 8. Health with visible components

**References**
- **Xero business health** ([screen](https://mobbin.com/screens/eee2ad22-2a97-43d0-9c05-9fea622a0686)): "Good, 7 targets achieved, How is this calculated?", above rows showing equation, target direction, comparison and "importance for score". This is the best match found.
- **Supabase service health** ([screen](https://mobbin.com/screens/704ea722-33ea-44f5-ba70-03005b33a9f9)): a tile per component, each with a sparkline and a headline such as "1.5% warnings".
- **Linear initiative** ([screen](https://mobbin.com/screens/fbe66735-93b3-495b-b071-923d3d5e1bad)): "On track" plus a health breakdown ("Update missing 1, On track 1").
- **Linear update diff** ([screen](https://mobbin.com/screens/43a3307a-6591-4ef2-95d8-197ea0720939)): "Progress since Mar 30", with before and after values.
- **Practitioner input:** keep every signal's contribution, ranked by impact, written as sentences a person would say. The question that changes behaviour is "what changed" ([dev.to](https://dev.to/jay_bheda_62a47fb51575cd1/how-we-built-a-customer-health-score-you-can-argue-with-13hi)).

**Pattern to adopt**
- A word label (Healthy, At risk, or Breaking), immediately followed by component rows. Each row has its value, the change since last week, and whether it pushed health up or down, and clicks through to its evidence:
  - Theses holding: 3 of 5
  - Resolution split: communication gap, process gap, documents wrong
  - Insights without an owner
  - Median time to fix
  - Documents marked suspect
- A "Changed since last week" line sits at the top.

**Anti-patterns**
- 1Password's "964 VERY GOOD" gauge ([screen](https://mobbin.com/screens/01399ac0-e9ac-43e8-a94a-90b04f813f74)).
- Okta's 56% donut.
- Hidden weights.
- Any per-team adoption metric below the anonymity threshold, which drifts into monitoring.

### 9. macOS permissions onboarding

**References**
- **Wispr Flow** ([screen](https://mobbin.com/screens/9ab0732f-4f26-4516-888c-8934dfe144eb), [flow](https://mobbin.com/flows/a743edfe-4338-4537-984b-17f173f3212d)): one permission per step with a segmented progress bar, ending in a practice dictation ("Say anything, tap ✓").
- **Spotify DJ** ([screen](https://mobbin.com/screens/0831a00e-8379-44a1-8992-f3e79dcd3cdb)): "Your microphone will only be on while you're making a request", followed by "You're in control".
- **Maze** ([screen](https://mobbin.com/screens/8cf9682a-28ba-4659-9c3c-3424ed51af2e)): a stepper listing each permission as a row.
- **Rise** ([screen](https://mobbin.com/screens/a2d978fc-1631-4ae7-abfa-9cf2bcff92e0)): toggles per permission, "(required)" marked, and a plain line on how data is stored.
- **Constraint (verify on the current macOS release):** Sequoia periodically re-asks apps using ScreenCaptureKit with "[App] is requesting to bypass the system private window picker..."; it was monthly as of 15.x ([9to5Mac](https://9to5mac.com/2024/08/14/macos-sequoia-screen-recording-prompt-monthly/), [Apple forum](https://developer.apple.com/forums/thread/765103)). The rolling buffer will trigger it.

**Pattern to adopt**
- A checklist window with three rows. Each has a one-sentence reason, an "Allow" button that opens the right System Settings pane, and a live checkmark once granted:
  - Microphone: "only while you hold the key"
  - Screen recording: "last N seconds, kept on this Mac"
  - Capture key: Accessibility / Input Monitoring
- The buffer explanation comes before the screen grant.
- Screen recording is skippable. Voice-only flags and chat still work without it.
- Finish with a practice flag that never leaves the Mac.
- Design a "Screen context paused, re-allow" pill state for when the permission lapses.

**Anti-patterns**
- Asking for every permission at first launch.
- Blocking the whole app on the screen recording permission.

### 10. Fix notice to the reporter

**References**
- **Canny changelog** ([screen](https://mobbin.com/screens/7cde0c8b-5a1f-447e-ad5c-4fe0fef9f807)): the tone "We've heard your feedback about...". Status changes email voters, with the admin's comment and image included ([docs](https://help.canny.io/en/articles/1291127-status-change-emails)).
- **Linear Asks:** requesters are notified when a request is completed, canceled, or reopened ([docs](https://linear.app/docs/linear-asks)). Linear Customer Requests notify when a requested issue ships ([docs](https://linear.app/docs/customer-requests)).
- **X Community Notes** ([screen](https://mobbin.com/screens/acfccfe0-b658-42b0-b297-1f92e25d7802)): at send time, "If a note is written and rated helpful, you'll see it on the post", with "Delete request". This sets the expectation up front and is relevant to the open question on withdrawing a flag.
- **Dovetail notifications** ([screen](https://mobbin.com/screens/3d315db6-ea16-4346-9cd2-4fd025da5f70)): one line per item with a "View" button.

**Pattern to adopt**
- At send time: "You'll hear here if this gets fixed."
- On fix, a pinned home-window item:
  - "Fixed: POs no longer need a finance call"
  - the owner's one line on what changed
  - a link to the corrected passage
  - "Still happening?", which re-flags with the link attached and lands as Still stuck
- Add a "Reopened" notice, following Linear.
- Delivery stays in the home window, with at most a static dot on the menu bar icon. No macOS banner, because banners would break "never interrupts". This is a decision for Andrés.

**Anti-patterns**
- A content-free "Thanks, your feedback helped!"
- Email blasts.
- Confetti.

---

### Cross-cutting
- **Copy tone:** plain, second person, and no exclamation marks. Name what happened and what happens next. Every status word must map to the Core Concepts vocabulary.
- **No truncation, anywhere.** Several references (Linear, Featurebase) ellipsize row text; do not copy that.
- **Leaders never see names.** This has to be enforced in three places: the evidence panel, the screenshots, and the minimum group size.

Sources: [Granola docs](https://docs.granola.ai/help-center/taking-notes/transcription), [Wispr Flow docs](https://docs.wisprflow.ai/articles/6391241694-use-flow-hands-free), [HN Aqua Voice](https://news.ycombinator.com/item?id=43634005), [HN Ghost Pepper](https://news.ycombinator.com/item?id=47666024), [Jam blur](https://jam.dev/docs/record-a-jam/video-screen-recording/video-blur), [Sentry privacy](https://docs.sentry.io/platforms/javascript/session-replay/privacy/), [Frank Denis on RAG](https://00f.net/2025/06/04/rag/), [Culture Amp confidentiality](https://support.cultureamp.com/en/articles/7048386-confidentiality-protections-in-reporting), [health score you can argue with](https://dev.to/jay_bheda_62a47fb51575cd1/how-we-built-a-customer-health-score-you-can-argue-with-13hi), [9to5Mac Sequoia prompt](https://9to5mac.com/2024/08/14/macos-sequoia-screen-recording-prompt-monthly/), [Apple dev forum](https://developer.apple.com/forums/thread/765103), [Canny status emails](https://help.canny.io/en/articles/1291127-status-change-emails), [Linear Asks](https://linear.app/docs/linear-asks), [Linear Customer Requests](https://linear.app/docs/customer-requests).

---

# Part 2: Service implementation

## friction-telemetry service research: flows 3a to 21 (Cloudflare Worker, Inngest, Jev, RAG, Claude)

The instant answer should run entirely in the Worker, with no queue in its path. I recommend Neon Postgres as the single store for both relational data and passages (pgvector plus full-text search), rather than Vectorize or AI Search. Inngest takes everything after the answer.

Four things need a decision before building:
- **Jev rate limit.** 1,200 requests per minute is 20 per second across the whole account. One Jev call per passage uses that up at about 100 events per minute. Pack the passage checks into one request per event (section 4c).
- **PPTX.** Cloudflare's `toMarkdown` does not read PPTX. It needs its own small extractor.
- **AI Search.** It rejects files over 4 MB, which rules it out for raw decks and PDFs.
- **"23 others hit this".** Clusters form after the answer, but flow 5 shows this count within seconds. It needs a fast lookup inside the Worker (section 4, design note).

Nothing was written or edited.

---

### 1. Inngest on Workers
Sources: Context7 `/websites/inngest` (serving-inngest-functions, sdk/environment-variables, guides/concurrency, features/realtime, reference/typescript/v4). The current docs are for SDK **v4**: triggers go inside the function config, and realtime is `step.realtime.publish`.

**Serving and keys**
```ts
// apps/api/src/index.ts (Hono)
import { serve } from "inngest/hono";
app.on(["GET","PUT","POST"], "/api/inngest", serve({ client: inngest, functions }));
// or: export default { fetch: serve({ client, functions, servePath: "/api/inngest" }) } from "inngest/cloudflare"
```
- Needs the `nodejs_compat` flag (for AsyncLocalStorage).
- Secrets: `INNGEST_SIGNING_KEY`, `INNGEST_EVENT_KEY`.
- Bindings are not global on Workers, so call `inngest.setEnvVars(c.env)` before `send`.
- Functions reach bindings through the documented `WorkersBindingsMiddleware`, which injects `env` into `ctx`, or through `import { env } from "cloudflare:workers"`.
- `serve({ streaming: true })` extends the per-step timeout.

**Local dev**
- Run `wrangler dev` on 8787 with `INNGEST_DEV=1` in `.dev.vars`.
- Then `npx inngest-cli@latest dev -u http://localhost:8787/api/inngest`. The dev server UI is on 8288.
- Tunnel with ngrok only when using `wrangler dev --remote`.

**Primitives** (all confirmed in the docs)
- Steps: `step.run(id, fn)`, `step.sendEvent(id, events[])` for fan-out (batch payload under 512 KB), `step.waitForEvent(id, { event, timeout, if: "async.data.x == '...'" })`.
- Deduplication: a producer-side event `id` dedupes, and function config `idempotency: "event.data.x"` guarantees one run.
- Flow control: `debounce: { key, period }`, `throttle: { key, limit, period, burst }`, `singleton: { key, mode: "skip" }`.
- `concurrency` can hold several limits at once: per organization (`{ key: "event.data.orgId", limit: N }`, scope `fn` by default) plus an account-wide provider cap (`{ scope: "account", key: '"workers-ai"', limit: N }`).
- Retries and `NonRetriableError` exist. The default retry count was not confirmed on this pass. Keep step return values small (ids, counts) and never return document text.

**Event names:** use the docs' `domain/noun.verb` style, for example `ft/document.uploaded`.

**Inngest Realtime:** do not use it for the answer. It sends from functions (`step.realtime.publish` is durable, `inngest.realtime.publish` is not) to subscribers. Its subscribers are the React hook with `getClientSubscriptionToken`, or a server-side `subscribe()` whose `getEncodedStream()` gives SSE chunks. A Swift client would need a Worker in the middle. It could carry flow 3a's document status, but polling the document status row every 2 s while processing is simpler. Whether `subscribe()` runs inside Workers (it uses a WebSocket client) is **unverified**.

**Hand-off from the Worker:** once the stream ends, call `ctx.waitUntil(inngest.setEnvVars(env).send({ id: eventId, name: "ft/event.answered", data }))`.

**Flow map**

| Flow | Event | Function config and steps |
|---|---|---|
| 3a, 19 | `ft/document.uploaded {orgId, initiativeId, documentId, versionId}` | `idempotency: versionId`; concurrency per orgId (limit about 3) plus an account `"workers-ai"` cap. Steps: extract (writes markdown to R2) → chunk → embed in batches (one step per batch) → insert passages → mark ready, or failed via `onFailure`. Then `sendEvent ft/document.ready`. |
| 4, 19 | `ft/document.replaced`, `ft/document.removed` | Index the new version, then one transaction flips the active version, deletes old passages and clears suspect marks (flow 19). |
| 8 tail | `ft/event.answered {eventId, kind, class, citedPassageIds}` | Store evidence metadata; `if class == unanswerable` route to the owner; `sendEvent ft/cluster.requested`. |
| 9 | `ft/event.still_stuck` | Set class; mark the cited documents suspect; route to the owner. |
| 13 | `ft/cluster.requested {initiativeId}` | `debounce {key: initiativeId, period: "2m"}` and `singleton {key: initiativeId}`. |
| 14, 15 | `ft/cluster.updated` | Two functions: score the insight against theses; draft Q&A for question clusters. |
| 16 | `ft/initiative.evidence_changed` | Debounce per initiative, recompute health with its components. |
| 18 | `ft/qa.published` | Embed and insert (or do this inside the approval request so it is searchable at once), then bulk-insert notices for askers. |
| 21 | `ft/fix.recorded` | Query the cluster's members, bulk-insert notices in one step. Use per-user `sendEvent` only if per-user work appears later. |
| 6 offline | none | Worker endpoint is idempotent on the client-generated flag UUID. |

---

### 2. Document ingestion (3a)

**Upload**
- Upload through the Worker: stream `request.body` into `env.DOCS.put(key, body)`. R2 streaming puts need a known length. Worker request bodies are capped per plan (100 MB on Free/Pro from memory, **verify**).
- Presigned PUT via `aws4fetch` (`signQuery: true`, Source: Context7 `/cloudflare/cloudflare-docs` r2/examples/aws4fetch) needs R2 S3 keys. It is only worth it for very large files. Choose Worker upload.

**Extraction** with `env.AI.toMarkdown([{ name, blob }])` (Source: Context7 cloudflare-docs markdown-conversion)
- Supported, checked on the live page https://developers.cloudflare.com/workers-ai/features/markdown-conversion/supported-formats/: pdf, docx, xlsx/xls, odt/ods, html, csv, numbers, images.
- **PPTX is not supported.** Unzip with `fflate` and pull the `<a:t>` text from `ppt/slides/slideN.xml`, keeping slide numbers for citations.
- Free for document formats. Image conversion uses paid models.
- No file-size limit is documented. Whether scanned PDFs get OCR is **unverified**.

**Chunking**
- Split on markdown headings, then about 300 to 500 tokens per passage with about 15% overlap.
- Store heading path, page or slide number and character offsets per passage.
- Also split each passage into sentence blocks for Claude's citations (section 5).

**Embeddings** (Workers AI pricing, Source: Context7 cloudflare-docs pricing and ai-search changelog 2026-04-09)

| Model | Dimensions | Max input tokens | Price per M input tokens |
|---|---|---|---|
| `@cf/qwen/qwen3-embedding-0.6b` | 1024 | 4096 | $0.012 |
| `@cf/baai/bge-m3` (multilingual) | 1024 | not confirmed | $0.012 |
| `@cf/baai/bge-base-en-v1.5` | 768 | not confirmed | $0.067 |

- Pick qwen3 or bge-m3.
- Input is `{ text: string[] }`. The per-call batch cap was not confirmed (roughly 100 from memory, **verify**).

**Vector store options**

*Vectorize* (Source: Context7 `/llmstxt/developers_cloudflare_vectorize_llms-full_txt`, cloudflare-docs vectorize limits)
- Limits: 1536 dimensions max; 20M vectors per index; 50k namespaces per index; 10 metadata indexes, each indexing only 64 bytes per vector; 10 KiB metadata; topK 100, or 50 with `returnMetadata: "all"`; upsert batches of 1,000 from Workers.
- Filters: `$eq $ne $in $nin $lt $lte $gt $gte`, applied before topK. Metadata indexes must exist before upsert.
- **Every mutation, including `deleteByIds`, is asynchronous** ("a few seconds" until queryable).
- Layout would be namespace = orgId, metadata indexes on `initiativeId` and `kind` (doc or qa), vector id = passageId.

*AI Search* (formerly AutoRAG; Source: cloudflare-docs ai-search)
- Features: managed chunking, hybrid search (vector plus BM25, rrf), `context_expansion`, reranking, `items.upload`, `items.delete(itemId)`, one instance per tenant through the namespace binding (5,000 instances on Paid).
- Limits: **4 MB file limit**, 5 custom metadata fields, filters see only the first 64 bytes, indexing is asynchronous.
- It gives up control over passage ids and chunking, which per-passage judging and suspect marking depend on.

*pgvector on Neon* (Source: Context7 `/neondatabase/website`)
- HNSW `vector_cosine_ops` plus `tsvector` / `websearch_to_tsquery` gives hybrid search in one SQL query.
- Exact `WHERE org_id AND initiative_id AND active`.
- **Transactional and immediate**: replace or delete (flows 4, 19) is atomic, and a published Q&A entry is searchable on commit (flow 18).

**Recommendation:** pgvector on Neon. At v1 scale it removes a second, eventually consistent store. If Vectorize is used anyway, re-check every hit against Postgres `active = true` so async deletes cannot leak.

---

### 3. Relational store: Neon Postgres through Hyperdrive, with Drizzle
Sources: cloudflare-docs d1 limits, workers/databases/neon; Context7 `/drizzle-team/drizzle-orm-docs`.

**D1 limits:** 10 GB per database, 100 bound parameters per query, 100 KB statements, SQLite (no pgvector, no jsonb operators), single writer.

**Why Neon:**
- One store for data and vectors, with real joins for clusters, theses and health.
- It matches your Neon conventions: a project named `friction-telemetry` in org `org-sparkling-dawn-02665417`, branch-first workflow, the durable URL in `~/.secrets/projects.env`.
- Cloudflare recommends Hyperdrive for Neon.

**Setup:**
- `drizzle-orm/node-postgres` with `new Client({ connectionString: env.HYPERDRIVE.connectionString })`, one client per request; Hyperdrive does the pooling.
- `localConnectionString` for dev; run migrations against the direct (non-pooler) URL with drizzle-kit.
- Scale-to-zero cold starts would land in the answer path. The Free plan cannot disable it; Launch can.

---

### 4. Jev (TypeSafe)
Sources: https://docs.typesafe.ai/api.md, /models.md, /confidence.md, /primitives/noul.md, /model-jaggedness/jev-1.13.md, /patterns/fan-out.md, /cookbooks/{classifying_rag_passages, semantic_find, citation_check, rerank_typesafe, parallel_questions}.md, plus the npm tarball `@typesafe-ai/sdk@0.6.0`.

**API**
- `POST https://api.typesafe.ai/v1/systemone` with `Authorization: Bearer`.
- Body: `{ state, model: "jev-latest", questions: { id: {type: "noul"|"choice"|"score", instructions, criteria} } }`. Many questions per request are evaluated in parallel.
- Noul returns `noul` (a probability, no separate confidence). Choice returns `choice`, `probabilities` and `confidence`. Choice allows at most 255 options.
- Output tokens are free.

**Model jev-1.13.0**

| | |
|---|---|
| Price | $0.042 per M input tokens |
| Rate limit | 250k tokens/s, **1,200 requests/min**, "adjusting dynamically" |
| Context | 64k per request; 32k for state plus the longest question |
| Input | Text only, English best |
| Latency | 13 questions over a ~54k-character article took 0.27 s in one call, versus 2.71 s for 13 sequential calls |

Pin `jev-1.13.0` once thresholds are tuned, because `jev-latest` moves.

**SDK on Workers:**
- Zero dependencies. The code detects `cloudflare-workers` and only refuses when `window.document` exists.
- It reads `process.env`, so pass `new TypeSafeClient({ apiKey: env.TYPESAFE_API_KEY })` explicitly.
- Defaults are a 10 s timeout and 2 retries. In the answer path set `{ timeout: 1500, retry: { maxRetries: 0 }, signal }`.

**Jaggedness rules that shape the design:** Jev reads questions literally, loses accuracy on large states full of irrelevant text, does not generate text, does no arithmetic, and Noul and Choice thresholds do not transfer between each other.

**Can it judge full documents?** Only up to about 32k tokens, and accuracy drops as irrelevant text grows. Judge outlines and retrieved passages, not whole documents.

**(a) Which initiative the event belongs to** (only when the employee is in more than one)
```ts
initiative: choice("Which initiative is the problem in `event` about?",
  { erp_rollout: "New ERP: purchase orders, invoices, approvals", hours_logging: "..." })
```
- Option keys are labels the model reads, so use readable slugs mapped to ids.
- Add one speculative Noul per initiative ("Is `event` about `initiatives.erp_rollout`?"), because Choice probabilities always sum to 1.
- Following confidence.md: at 0.8 or above, route; from 0.5 to 0.8, route but show the initiative as switchable; below 0.5, or when every Noul is under about 0.3, ask the employee.

**(b) Likely covered, early** (the semantic_find pattern)
- State: `{ event, outline: "S001| heading..." }`, the initiative's section headings with ids plus canonical Q&A questions.
- Questions:
  - `exists`: Noul "Does any section of `outline` address `event`?" with true/false criteria.
  - `where`: Choice over section ids (up to 255).
- The docs observed present answers scoring 0.9 or more and absent ones 0.05 or less (thresholds FOUND 0.7, ABSENT 0.35).
- Show the provisional "not covered" only when `exists < 0.1` (a wrong early message is costly), then let (c) decide. `where` also seeds retrieval.

**(c) Per-passage verifier sets the class**
- Follow the classifying_rag_passages Nouls: `is_relevant`, `contains_answer_evidence`, `contradicts_query_premise`, `contains_prompt_injection`.
- The cookbook's starting thresholds: injection above 0.70 exclude; contradicts above 0.70 goes to a conflict block; relevant below 0.45 exclude; evidence above 0.55 include.
- Class rules:
  - Answered: at least one passage above about 0.7 on evidence.
  - Unanswerable: every passage below about 0.3.
  - Middle band: let Claude answer, then check each cited claim with the citation_check Choice (supports, contradicts, says_nothing, auto-accepted at confidence 0.8 or above). If nothing verifies, the class is Unanswerable.
- **Rate-limit caveat:** the cookbook sends one request per passage. With K=10 that caps the account near 100 events per minute. Instead send one request with state `{event, passages:[...]}` and one Noul per `passages[i]` (the docs' own counting example uses this indexing). Evaluate both against a labeled set.
- Cost is about 10k tokens per event, roughly $0.0004.

**Design note, "23 others hit this":** clusters form asynchronously, so at answer time either run a pgvector nearest-neighbour search over recent events in the initiative, or ask Jev "same problem as `cluster.canonical`?" over the top 5 candidate clusters. Count only matches above a tuned threshold.

---

### 5. Claude cited answers
Sources: Context7 `/anthropics/anthropic-sdk-typescript`; https://platform.claude.com/docs/en/build-with-claude/search-results.md and /citations.md; the claude-api skill.

**Workers:** Cloudflare Workers is a supported runtime. Use `client.messages.stream(...)`.

**Search result blocks:** pass each passage as a top-level `search_result` block in the user message. No beta header is needed.
```ts
{ type: "search_result", source: `ft://doc/${docId}#${passageId}`, title: `${docTitle} · ${heading}`,
  content: sentences.map(t => ({ type: "text", text: t })), citations: { enabled: true } }
```
- Citations come back as `search_result_location` with `search_result_index`, `start_block_index`, `end_block_index` and `cited_text`. `cited_text` does not count as output tokens.
- Sentence-level blocks give fine citation spans.
- Streaming adds `citations_delta` inside `content_block_delta`.
- Citations cannot be combined with `output_config.format` (400). That is another reason the class comes from Jev and code, not from Claude.
- Keep the conflict block separate, and tell Claude to treat passages as untrusted text.

**Model**

| Model | Price per M in/out | Thinking | Cache minimum |
|---|---|---|---|
| `claude-haiku-4-5` (your `-20251001` snapshot also works) | $1 / $5 | Off by default | 4,096 tokens |
| `claude-sonnet-5` | $2 / $10 | Can be turned off | 1,024 tokens |
| `claude-opus-5-5` | $4 / $20 | Cannot be turned off | not checked |

- Use Haiku 4.5 for the instant answer: lowest latency, no thinking by default.
- Sonnet 5 with `thinking: {type: "disabled"}` is the quality step-up. Measure time to first token on both.
- Opus 5.5 does not fit the latency budget.

**Prompt caching:** a frozen system prompt plus the initiative brief can be cached on Sonnet 5. On Haiku it rarely reaches 4,096 tokens. Retrieved passages change per request, so the savings are small. Verify with `usage.cache_read_input_tokens`.

---

### 6. Streaming to the Mac: SSE from the Worker
- One `POST /v1/events` returns `text/event-stream` from a `TransformStream`. Event types: `meta` (eventId, initiative, confidence), `provisional`, `class`, `delta`, `citation`, `count`, `done`.
- Swift reads it with `URLSession.bytes(for:)` and `.lines`. EventSource is not needed, and POST carries the flag payload.
- Upload screenshots and the clip first (Worker to R2), then reference them.
- WebSocket or Durable Objects add nothing for a one-shot answer.
- Workers bill CPU time, not the time spent waiting on streams.

---

### 7. Auth: better-auth on the Worker
Sources: Context7 `/better-auth/better-auth`, `/websites/workos`.

**better-auth plugins:**
- `organization`
- `@better-auth/sso`: OIDC and SAML, domain mapped to organization, `organizationProvisioning` (flow 1)
- `@better-auth/scim`: SCIM 2.0 directory import (flow 1)
- `bearer`: the Mac sends `Authorization`
- `deviceAuthorization`: RFC 8628

**Mac sign-in:** ASWebAuthenticationSession opens the Worker-hosted sign-in page, which redirects to a custom scheme. Exchange the result for a bearer token and store it in the Keychain.

Better-auth also runs on Hono and Workers with the Drizzle Postgres adapter (use `nodejs_compat`). I recommend it: your data stays in your own database, there are no per-connection fees, and it matches the atlas primitive.

**The trade-off:** WorkOS has an Admin Portal where the customer's IT team sets up SAML and SCIM themselves, and a native Swift `PublicClient` using PKCE. If the first customers' IT teams insist on self-service setup, WorkOS is the swap. Clerk has no advantage here.

---

### 8. Notices (flows 18, 21): pull, no APNs in v1
- Flow 21 says the notice arrives in the home window. A system banner would break "never start a conversation, interrupt, or suggest".
- Serve `GET /v1/me/record?since=cursor` with an ETag. Fetch it when the home window opens, when the app comes to the foreground, and on a relaxed poll (about 60 s) while the pill runs.
- APNs is available later if wanted. Developer ID plus push requires `aps-environment` in a provisioning profile; not checked.
- A per-user Durable Object WebSocket is only worth it if near-real-time updates are ever needed.

---

**Not verified:**
- Worker request-body limit per plan
- Workers AI embedding batch cap
- Whether `toMarkdown` OCRs scanned PDFs
- Inngest's default retry count and deduplication window
- Whether Inngest Realtime `subscribe()` runs on Workers
- Jev latency with about 12 passages in the state (only the 13-question article benchmark exists)
- WorkOS pricing
- APNs under Developer ID

---

# Part 3: macOS app implementation

I've researched all 11 topics below. Four findings change the build. First, macOS 26 is the right minimum, because Apple's new on-device transcription API needs it; everything else runs on 26 or earlier. Second, the capture key needs no permission. Third, keeping a screen buffer means the system's screen-recording indicator shows the whole time the app runs. Fourth, macOS asks the employee to re-approve screen recording every month, and our app can't stop that. Items I couldn't confirm are marked **[unverified]**. I wrote no files.

### 0. Version picture (Sept 2026)
- **macOS 26 minimum is forced by transcription.** Apple's `SpeechAnalyzer` / `SpeechTranscriber` need macOS 26 and later. Everything else below needs 15.2 or earlier. The latest 26.x is 26.7 (14 Sep 2026). Source: https://en.wikipedia.org/wiki/MacOS_Tahoe
- **macOS 27 and Xcode 27 are already out or about to be.** Sparkle 2.10.0 (13 Sep 2026) mentions "Xcode 27" and fixes for macOS 27. KeyboardShortcuts 3.1.0 (11 Sep 2026) says "Improve macOS 27 compatibility". Test on 27 before first customers. Source: `gh release view` on both repos.
- **Intel Macs:** Tahoe still runs on Intel, but `SpeechTranscriber` has hardware requirements. Check `SpeechTranscriber.isAvailable` and fall back to `DictationTranscriber` **[unverified that the gate is exactly Apple Silicon]**.

### 1. Floating pill
**Panel recipe.** Set everything at init. There are reports of exceptions or erratic behaviour when the style mask changes later on a live window, including on 26.3. Sources: https://github.com/ahkohd/tauri-nspanel/issues/120, https://levelup.gitconnected.com/swiftui-macos-floating-window-panel-4eef94a20647

```swift
final class PillPanel: NSPanel {
  init<V: View>(_ root: V) {
    super.init(contentRect: .init(x: 0, y: 0, width: 200, height: 44),
               styleMask: [.nonactivatingPanel, .borderless, .fullSizeContentView],
               backing: .buffered, defer: false)
    isFloatingPanel = true
    level = .floating                 // .statusBar if it must sit above other floating panels
    collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary, .ignoresCycle]
    hidesOnDeactivate = false
    becomesKeyOnlyIfNeeded = true
    isMovableByWindowBackground = true
    isOpaque = false; backgroundColor = .clear; hasShadow = true
    contentView = FirstMouseHostingView(rootView: root)   // override acceptsFirstMouse -> true
  }
  override var canBecomeKey: Bool { false }
  override var canBecomeMain: Bool { false }
}
// show with panel.orderFrontRegardless(), never makeKeyAndOrderFront
```

- **Showing over other apps' full-screen windows.** A regular app with `.floating` and `[.canJoinAllSpaces, .fullScreenAuxiliary]` is still not drawn over another app's full-screen Space. It works when the app runs as a background (menu bar) app (`LSUIElement=YES`, `setActivationPolicy(.accessory)`), or reportedly with `.nonactivatingPanel` alone. Use both. Sources: https://github.com/karansinghgit/speaktype/pull/142, https://github.com/tinkertanker/classroom-widgets/pull/162
- **Capture review panel.** This one needs keyboard input for transcript edits. Make a second `.nonactivatingPanel` with `canBecomeKey = true`. It can take typing without activating our app, so the employee's app keeps its menu bar and focus until they interact.
- **Following the active screen.** Observe `NSWorkspace.didActivateApplicationNotification`, `activeSpaceDidChangeNotification` and `NSApplication.didChangeScreenParametersNotification`. Then call `CGWindowListCopyWindowInfo(.optionOnScreenOnly, kCGNullWindowID)`, filter to the frontmost app's PID at layer 0, and read `kCGWindowBounds`. Bounds and owner names need no permission; window titles need Screen Recording. Map to an `NSScreen`, flipping the y-axis from CG to Cocoa coordinates. A cheaper fallback is the screen under `NSEvent.mouseLocation`.
- **Granola is Electron.** Their blog says "Granola is an Electron app". Its floating indicator is presumably an Electron panel window configured visible on all workspaces and full-screen spaces, which maps to the same NSPanel flags **[unverified]**. Source: https://www.granola.ai/blog/so-you-think-its-easy-to-change-an-app-icon
- **App shape.** Recommended: a background app with a `MenuBarExtra` (status and quick actions), the pill panel, and SwiftUI `Window("Home", id:)` and `Window("Initiatives", id:)` scenes. When a window opens, switch to `.regular` so it appears in the Dock and Cmd-Tab; switch back to `.accessory` when the last window closes. Both surfaces live in one app, with leader permission deciding whether the Initiatives scene is reachable. For the pill look, macOS 26 SwiftUI has `.glassEffect()` **[not checked in docs]**.

### 2. Hold-to-talk capture key
| Option | Permission | Hold (down/up) | Notes |
|---|---|---|---|
| **sindresorhus/KeyboardShortcuts 3.1.0** (Carbon `RegisterEventHotKey` inside) | **None** | Yes: `events(for:)` yields `.keyDown` and `.keyUp`. Repeating events are a separate API (`repeatingKeyDownEvents`), so the default stream does not auto-repeat. | Needs a modifier plus a real key. Can't record Fn alone, Caps Lock or media keys. |
| Carbon `RegisterEventHotKey` directly | None | Pressed and released events | Same limits, more code. |
| `CGEventTap` (listen-only) on `.flagsChanged` | Input Monitoring (Accessibility also works) | Yes, including a bare Fn or right-Option hold (Fn is key code 63) | The only way to get modifier-only push-to-talk like Wispr Flow. Reportedly still sees modifier changes during Secure Input. |
| `NSEvent.addGlobalMonitorForEvents(.flagsChanged)` | Accessibility | Yes | Observes only, can't swallow keys. |

Sources: Context7 `/sindresorhus/keyboardshortcuts` (events, EventType, Fn/Shift constraints, the Option-only rule for sandboxed apps on 15.0/15.1); https://github.com/blackboardsh/electrobun/issues/334; https://github.com/EvanCNavarro/PushText; https://blog.eternalstorms.at/2024/09/23/keyboard-shortcuts-using-option-and-or-shift-modifiers-only-no-longer-allowed-on-macos-sequoia/ (Option/Shift-only hotkeys fail with -9868 on 15.0; allowed again from 15.2).

**Recommendation: KeyboardShortcuts.** It removes Accessibility and Input Monitoring from onboarding entirely. That matters for trust: Accessibility is the "control your computer" permission, which clashes with "never act on the employee's behalf" and with "not employee monitoring". So "the capture key" in flow 2 needs no permission prompt.
```swift
extension KeyboardShortcuts.Name {
  static let capture = Self("capture", initial: .init(.space, modifiers: [.control, .option]))  // 3.0 renamed default: -> initial:
}
Task { for await e in KeyboardShortcuts.events(for: .capture) {
  e == .keyDown ? capture.begin() : capture.end() } }
```
Add two guards: a short tap (under about 300 ms) toggles recording on and off, and a maximum recording length covers a key-up that never arrives. Whether Carbon hotkeys keep firing during Secure Input is **[unverified]**.

### 3. On-device transcription
| | SpeechTranscriber (macOS 26) | SFSpeechRecognizer / DictationTranscriber | WhisperKit (argmax-oss-swift 1.1.0) |
|---|---|---|---|
| Accuracy | 2.12% word error rate clean and 4.56% noisy; Whisper Small scores 3.74% and 7.95%. 3.5 to 4x fewer errors than the old API. | Old model | small.en scores 12.8% on earnings calls vs Apple 14.0% (Argmax's own benchmark) |
| Speed | About 3x faster than Whisper Small; speed factor 70 | Fast | base.en 111, small.en 35 |
| Languages | About 42 locales, including ar_SA, en, es, fr, de, ja, zh, ko, pt_BR, ru, he, tr | Same set as the old API | ~100 |
| Model | Downloaded by the system through `AssetInventory`; lives outside the app's size and memory | Built into the OS | Downloaded by the app, ~150 MB to 1.5 GB, first-run CoreML compile |
| Custom vocabulary | `AnalysisContext.contextualStrings` is documented for DictationTranscriber | Yes | Yes |
| Minimum OS | macOS 26 | Older | macOS 14 |

Sources: Context7 `/websites/developer_apple_speech`; https://developer.apple.com/videos/play/wwdc2025/277/; https://www.argmaxinc.com/blog/apple-and-argmax; https://mjtsai.com/blog/2026/07/22/whisper-and-speechanalyzer/; https://dev.to/iravoice/apple-speechanalyzer-vs-whispercpp-a-40-speaker-mac-benchmark-40i4; locale list from search results citing https://developer.apple.com/documentation/speech/speechtranscriber/supportedlocales

**Recommendation:** use SpeechTranscriber with `.volatileResults`, so the review panel shows the transcript forming live. Fall back to `DictationTranscriber` when `!SpeechTranscriber.isAvailable`. Add WhisperKit only if a customer needs a language outside the list.

- Download the model during flow 2 with a visible progress bar (`AssetInventory.assetInstallationRequest(supporting:)`, then `downloadAndInstall()`).
- Declare `NSSpeechRecognitionUsageDescription` and request Speech Recognition. Reports say the new API needs it **[unverified whether strictly required]**.
- Start `AVAudioEngine` only on key-down, so the orange mic indicator shows only while the employee speaks. Engine start costs roughly 100 to 300 ms **[estimate]**; show a "listening" state immediately.
- Convert audio with `SpeechAnalyzer.bestAvailableAudioFormat(compatibleWith:)`, feed an `AsyncStream<AnalyzerInput>`, and call `finalizeAndFinishThroughEndOfInput()` on key-up.

### 4. Screen context
**APIs and availability:**
- `SCScreenshotManager.captureImage(contentFilter:configuration:)` on macOS 14.
- `captureImage(in: rect)` on 15.2.
- macOS 26 adds `captureScreenshot(contentFilter:configuration:)` with `SCScreenshotConfiguration` (`dynamicRange` SDR/HDR/both, `contentType`, `fileURL`, `includeChildWindows`, `ignoreShadows`).
- `SCRecordingOutput` (write the stream straight to a file) exists.

Sources: Context7 `/websites/developer_apple_screencapturekit`; https://github.com/dotnet/macios/wiki/ScreenCaptureKit-macOS-xcode26.0-b1

**Excluding our own windows.** Use `SCContentFilter(display:excludingApplications:[ourSCRunningApplication], exceptingWindows: [])`. Do not rely on `NSWindow.sharingType = .none`: from macOS 15 ScreenCaptureKit ignores it. Sources: https://developer.apple.com/forums/thread/792152, https://github.com/tauri-apps/tauri/issues/14200

**Rolling buffer design.**
- Never keep raw `CMSampleBuffer`s. They hold IOSurfaces from the stream's small pool (`queueDepth` is at most about 8), which stalls or crashes capture. Apple's engineer also warns that `CMSampleBufferCreateCopy` doesn't copy the pixel data. Source: https://developer.apple.com/forums/thread/794659
- Encode as frames arrive and keep a ring of compressed segments:
```swift
let cfg = SCStreamConfiguration()
cfg.minimumFrameInterval = CMTime(value: 1, timescale: 5)   // 5 fps is plenty for UI context
cfg.width = 1440; cfg.height = /* keep aspect */; cfg.pixelFormat = kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange
cfg.queueDepth = 5; cfg.showsCursor = true
// SCStreamOutput: skip frames whose SCStreamFrameInfo.status != .complete (idle frames arrive when nothing changed)

let w = AVAssetWriter(contentType: .mpeg4Movie)               // no URL: segments arrive via delegate
w.outputFileTypeProfile = .mpeg4AppleHLS
w.preferredOutputSegmentInterval = CMTime(seconds: 2, preferredTimescale: 600)
w.delegate = ring   // assetWriter(_:didOutputSegmentData:segmentType:segmentReport:)
                    // keep the .initialization segment plus the last N/2 .separable segments
let vIn = AVAssetWriterInput(mediaType: .video, outputSettings: [
  AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: 1440, AVVideoHeightKey: h,
  AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 1_500_000,
                                    AVVideoMaxKeyFrameIntervalDurationKey: 2]])
vIn.expectsMediaDataInRealTime = true
```
- On a flag, write the init segment plus the retained segments into one `.mp4` (a valid fragmented MP4). Source: https://developer.apple.com/videos/play/wwdc2020/10011/
- At key-down, freeze the ring so the seconds *before* the press don't roll off while the employee talks.
- The alternative is `VTCompressionSession` with a ring of compressed samples, then a passthrough `AVAssetWriter` starting at a keyframe on export.
- **Cost [estimate, measure it]:** hardware encoding at 5 fps, 1440 px wide, about 1.5 Mbps comes to roughly 6 MB of RAM for 30 s and low single-digit CPU.
- **Multiple displays:** buffer the display the pill sits on and switch with `stream.updateContentFilter(_:)`, or run one stream per display at a multiple of the cost.
- **Screenshot at key-down:** copy the latest complete frame (instant) or call `SCScreenshotManager` for full resolution. Take it before any of our UI appears; our windows are excluded anyway.

**Permission behaviour (a real product constraint):**
- **Monthly re-approval.** Since Sequoia, any capture that doesn't go through the system picker (`SCContentSharingPicker`) triggers a system alert every 30 days: "[App] is requesting to bypass the system private window picker", with an "Allow For One Month" button. It is still present on Tahoe. Developers can't disable it. The `persistent-content-capture` entitlement is for remote-desktop (VNC) apps only. Managed Macs can use the MDM key `forceBypassScreenCaptureAlert` (15.1+, reportedly only partly effective from 15.2). Sources: https://9to5mac.com/2024/08/14/macos-sequoia-screen-recording-prompt-monthly/, https://mjtsai.com/blog/2024/08/08/sequoia-screen-recording-prompts-and-the-persistent-content-capture-entitlement/, https://derflounder.wordpress.com/2024/10/31/managing-user-notifications-for-apps-which-request-screen-access-on-macos-sequoia-15-1/, https://www.screenify.studio/blog/2026-04-23-macos-screen-recording-permissions
  - The system picker can't feed a buffer that has to exist before the press.
  - Start the stream at launch so the monthly alert lands at login, not in the middle of a flag **[unverified exactly when it fires]**.
  - Worth offering enterprise customers an MDM profile.
- **Always-on indicator.** Since 15.1 the menu bar and Control Center show a purple screen-recording indicator while any capture runs, and apps can't hide it. An always-on buffer means the indicator is always on. That is honest, but it looks like monitoring. It feeds straight into the open question on whether the employee can turn the buffer off. Buffer-off mode is simply "screenshot at press, no clip". Sources: https://developer.apple.com/forums/thread/769968, https://github.com/FelixKratz/SketchyBar/issues/641

**Active app names.** `NSWorkspace.shared.frontmostApplication?.localizedName` plus `kCGWindowOwnerName` of on-screen layer-0 windows; no permission needed. Send app names only. Window titles often carry document names; if we ever add them, they must appear in the review. Source: https://developer.apple.com/documentation/appkit/nsworkspace/frontmostapplication

### 5. Redaction
- **Build it in-house; no library needed.** A SwiftUI overlay over the screenshot lets the employee draw rectangles. Then render a new bitmap in `CGContext`: draw the image, fill the rectangles with solid black, export PNG without metadata.
- **Default to solid boxes.** Gaussian blur and pixelation can be reversed (by machine learning or brute force). Offer "blur" only as heavy pixelation, or not at all. Sources: https://hovav.net/ucsd/dist/redaction.pdf, https://datablur.app/blog/can-blurred-text-be-recovered
- **Clip.** `AVPlayerView.beginTrimming` gives Apple's built-in trim UI. Export with `AVAssetExportSession` and a `timeRange`. To black-box regions across every frame, use `AVVideoComposition(asset:applyingCIFiltersWithHandler:)` and composite a black `CIImage` over each rectangle.
- **Every part removable:** transcript editable; screenshot, clip and each app name each have a remove toggle.
- **Optional helper:** a "Find text" button runs on-device OCR (Vision `VNRecognizeTextRequest`) and proposes boxes. It runs only when pressed, which respects "never suggest unasked".
- **Reference:** macshot is an open-source native Swift example of the redaction modes. Source: https://github.com/sw33tLie/macshot

### 6. Offline queue (flow 6)
- **A file-based outbox, not SwiftData, holds the approved payload.** On Send, atomically write `Application Support/<bundle>/Outbox/<flagUUID>/` containing `manifest.json` (transcript, app names, a SHA-256 per file), `screenshot.png` and `clip.mp4`. It is immutable after that, which guarantees "exactly as approved". Delete it after the server acknowledges.
- SwiftData (or GRDB) is fine for the home window's local cache of flags, answers, class, count and outcome.
- **Uploader:** an actor using `URLSessionConfiguration.default` with `waitsForConnectivity = true`, plus `NWPathMonitor` to trigger retries, exponential backoff with jitter, and an `Idempotency-Key: <flagUUID>` header so the Worker upserts.
- **Background URLSession is optional.** It only keeps uploads going from a file after the app quits, and it's slower even in the foreground. The pill app runs as a login item (`SMAppService.mainApp.register()`, macOS 13), so plain sessions suffice. Source: https://www.avanderlee.com/swift/urlsession-common-pitfalls-with-background-download-upload-tasks/
- **Size limit [unverified]:** Workers request bodies are capped by plan (about 100 MB on Free/Pro), so upload clips to R2 through presigned URLs.

### 7. Streaming the answer: use SSE
- Flow 8 is one-way server-to-client (provisional class, then passages, then the cited answer, class and count). Flow 9 ("still stuck") is a separate POST.
- WebSocket would need a Durable Object and reconnection logic for no gain.
- Protocol: POST multipart (manifest plus screenshot, since the answer is grounded in what was on screen), and the Worker responds with `text/event-stream`. Upload the clip in parallel.
- **Gotcha:** `URLSession.AsyncBytes.lines` drops empty lines, which are SSE's event separators. Use mattt/EventSource 1.5.1, which parses `AsyncBytes` for any request, including POST. Sources: https://github.com/mattt/EventSource, https://github.com/Ichigo3766/Open-Relay/issues/219
```swift
let (bytes, resp) = try await URLSession.shared.bytes(for: postRequest)
for try await ev in bytes.events {
  switch ev.event { case "provisional": …; case "token": …; case "answer": …; case "class": …; default: break }
}
```
- Worker side: `new Response(readable, { headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' } })`.

### 8. Permissions onboarding (flow 2)
| Permission | Check | Request | Notes |
|---|---|---|---|
| Microphone | `AVCaptureDevice.authorizationStatus(for: .audio)` | `requestAccess(for: .audio)` | Needs `NSMicrophoneUsageDescription` **and** the hardened-runtime entitlement `com.apple.security.device.audio-input`. Without it, a signed and notarized build fails silently. |
| Speech Recognition | `SFSpeechRecognizer.authorizationStatus()` | `requestAuthorization` | `NSSpeechRecognitionUsageDescription`; kick off the model download here. |
| Screen Recording | `CGPreflightScreenCaptureAccess()` | `CGRequestScreenCaptureAccess()` | The system alert shows once; after that, only a deep link works. A grant usually needs the app to quit and reopen, so persist onboarding state and relaunch. |
| Accessibility / Input Monitoring | Not needed | | Only if you choose a CGEventTap or Fn key. |
| Notifications | Only on opt-in | | See section 10. |

- **Deep links:** `x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone`, `?Privacy_ScreenCapture`, `?Privacy_SpeechRecognition`, `?Privacy_ListenEvent`, `?Privacy_Accessibility`. A newer form exists: `com.apple.settings.PrivacySecurity.extension?Privacy_ScreenCapture`. Verify both on 26 and 27. Sources: https://gist.github.com/rmcdongit/f66ff91e0dad78d4d6346a75ded4b751, https://github.com/bvanpeski/SystemPreferences
- macOS gives no callback when a permission changes, so re-check on `NSApplication.didBecomeActiveNotification`.
- Grants are tied to the code signature: keep Team ID and bundle ID stable. Unsigned dev builds lose their grants on every build; reset with `tccutil reset ScreenCapture <bundle-id>` when testing.
- Order: explain the buffer first (flow 2 requires it), then mic, then speech (download in the background), then screen recording (relaunch), then the login-item toggle.

### 9. Auth (web SSO)
```swift
let s = ASWebAuthenticationSession(url: authorizeURLWithPKCE,
                                   callback: .customScheme("frictiontelemetry")) { url, err in … }
s.presentationContextProvider = self      // background app: NSApp.activate() first, anchor = a window
s.prefersEphemeralWebBrowserSession = false   // reuse the IdP's SSO cookie
s.start()
```
- The `Callback` API is macOS 14.4+. Prefer a custom scheme: `.https(host:path:)` callbacks need Associated Domains and have reported callback problems. Sources: https://developer.apple.com/forums/thread/769749, https://developer.apple.com/forums/thread/794610
- On Entra-managed Macs, Microsoft's Enterprise SSO extension may take over the session and sign in silently **[unverified for our flow]**.
- **Token storage:** keep the refresh token in Keychain and the access token in memory. The modern data-protection keychain (`kSecUseDataProtectionKeychain`) needs `keychain-access-groups` / `application-identifier`, which means a **Developer ID provisioning profile** (`python3 ~/.appstoreconnect/asc-profile.py <bundle-id>`, then manual signing, per your global CLAUDE.md). Without a profile, the legacy file-based login keychain via `SecItem` works fine. Sources: https://github.com/Round-Tower/M1K3/issues/319, https://developer.apple.com/documentation/technotes/tn3137-on-mac-keychains

### 10. Fix notices
- Flow 21 already says the notice lands in the **home window**. A system banner is the app speaking first, which conflicts with "never initiate".
- **Default:** the app pulls notices (on launch, wake, and every few minutes, or an SSE subscription while running) and shows a quiet badge on the pill or menu bar icon plus an entry in the home window.
- **Optional:** a per-flag opt-in at Send ("Tell me when this is fixed"), which is the employee asking. That triggers a local `UNUserNotificationCenter` notification; local notifications need no entitlement.
- **APNs** works for Developer ID apps, but needs `com.apple.developer.aps-environment` through a provisioning profile. It isn't needed while the app is always running. Source: https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.developer.aps-environment
- Open question left for you: whether "a notice in the home window" rules out system banners entirely.

### 11. Auto-update: Sparkle 2.10.0 (13 Sep 2026)
- Minimum macOS 12; CocoaPods support dropped; add via SPM.
- Info.plist: `SUFeedURL`, `SUPublicEDKey` (from `generate_keys`; the private key stays in the login keychain, export a backup with `generate_keys -x` into `~/.secrets`), `SUEnableAutomaticChecks`.
- Release: build a notarized and stapled zip or DMG, run `generate_appcast <folder>`, host the appcast and archives on R2.
- XPC services are only needed if the app is sandboxed; ours won't be.
- **Never interrupt:** Sparkle's default scheduled check shows a modal alert. Instead set `automaticallyDownloadsUpdates = true` (installs silently on quit) and implement `supportsGentleScheduledUpdateReminders` so an available update shows in the home window. A background app rarely quits, so offer "Restart to update" or relaunch while idle and not recording.
- Permission grants survive updates if the signing identity and bundle ID stay constant **[unverified for the monthly screen-recording timer]**.
- Sources: Context7 `/websites/sparkle-project` (programmatic setup, gentle reminders, EdDSA, `generate_appcast`); `gh release view 2.10.0`.

### Implications for the product doc
- Flow 2 needs no key permission if we use KeyboardShortcuts. Drop "the capture key" from the list of permissions.
- The rolling buffer brings two visible system behaviours: a permanent screen-recording indicator and a monthly re-approval alert. Both belong in the flow 2 explanation and in the open question about turning the buffer off.
- The clip should cover the seconds *before* the press, frozen at key-down.
- Redaction should default to solid boxes, because blur can be reversed.

---

## Sessions

- 2026-09-23: Research for the 21-flow catalogue, three parts plus reading guide · `claude -r cf097e99-94f3-4cce-9596-642e0c0c18b8`
