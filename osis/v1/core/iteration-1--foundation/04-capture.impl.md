# Capture

**Iteration:** iteration-1--foundation
**Depends on:** 01-shell
**Status:** not started

## UX

This spec makes the client side of flow 6 real and builds flow 12. The employee hits friction in any app, holds the capture key (or clicks the pill), says what happened, releases, sees exactly what will leave the Mac, removes or blacks out anything they choose, and sends. The flag goes out exactly as approved, now or when the connection returns, and the answer streams into the answer card. The rolling screen buffer that supplies the clip lives only on the Mac.

The shell already drew every screen this spec touches (pill states, capture review panel, answer card). This spec replaces sample content with real capture and adds the few states the shell did not draw. It does not redesign any screen.

### Starting a capture

- **Hold** the capture key, which phase 03 binds in onboarding: fn or left Control held on its own (Input Monitoring granted), or the fallback shortcut ⌃⇧Space (no permission). For a lone modifier, the capture starts once the key has been held for 300 ms with no other key and no click; another key or a click inside those 300 ms cancels silently, because the employee was typing a shortcut or Control-clicking. For the ⌃⇧Space fallback, key down starts the capture. Key up ends it and opens the review.
- **Tap** (fallback shortcut only: key down and up within 300 ms) locks the capture on, hands free. A lone modifier has no tap gesture: fn and Control are tapped all day in normal use, and a tap of fn belongs to macOS. With a lone modifier, hands free is the pill click. The pill shows a small lock glyph next to the red dot. The capture ends on the next press of the capture key, on the pill's check button, or at the maximum length.
- **Click the pill** starts a locked capture, the same as a tap. A drag of more than 3 pt moves the pill instead and starts nothing. This changes the shell's click behavior (the shell opened the main window); the main window opens from the menu bar item **Open Friction**. The pill's hover text changes from "Hold fn to flag" to "Hold fn or click to flag", with the bound key's name from `CaptureKeyDisplay`.
- **Menu bar item "Flag something"** (disabled in the shell) becomes active and starts a locked capture. Its label shows the current capture key.
- **Maximum length: 90 seconds** of recording. At 80 seconds the pill's timer line reads "10 seconds left". At 90 seconds the capture ends and the review opens. Nothing is ever sent automatically. The same limit covers a key-up that never arrives.
- While a review panel is open, the capture key and a pill click bring that panel to the front instead of starting a second capture.

### The pill during a capture (flows 6, 12)

1. **Listening** (from key down until the first audio arrives, normally 100 to 300 ms): capsule expands, "Listening" and the microphone name ("MacBook Pro Microphone", "AirPods Pro"). No timer.
2. **Recording** (from the first audio buffer): red dot, live level meter from real input levels, timer from 0:00, the current phrase of the live transcript, X (discard) and check (finish). The timer starts only when audio flows, so a slow Bluetooth mic never swallows the first words while the pill already looks live. The transcript line shows the phrase being recognized right now, in full; the capsule grows taller to fit it and never ellipsizes. The whole transcript is in the review.
3. **Processing** on release: spinner and "Preparing review". Normally under one second.
4. Review panel opens (below). Pill returns to Idle (or to the paused state).

Other states the employee can enter:
- **Mic never starts** (no audio within 1.5 s of key down): pill shows "Microphone didn't start. Try again." for 3 s, then Idle. Nothing was captured.
- **Microphone permission missing**: pill shows "Friction needs the microphone. Open Settings" for 4 s; clicking it opens the microphone pane of System Settings. Before 03-permissions-onboarding lands, the first capture shows the system microphone prompt itself (the employee's own press caused it).
- **Discard** (X in the pill during recording): "Discarded. Nothing sent." for 2 s (shell copy). Audio, transcript, screenshot and the frozen clip are dropped from memory and temp files are deleted.
- **Speech model not installed or the language not supported**: capture still works; the review's transcript field is empty with the line "The speech model isn't on this Mac yet, so there's no transcript. Type what happened instead."
- **Silence**: the review's transcript field is empty with the placeholder "Nothing was heard. Type what happened, or discard."

### Screen context and the buffer (flow 12)

- Once the employee has granted screen recording and seen the buffer explanation (03 owns that explanation), the buffer runs whenever the app runs and screen context is on. The purple system screen-recording indicator is on while it runs; the app does not try to hide it.
- The buffer keeps the last 30 seconds of the display the pill is on, in memory only, never on disk. When the pill moves to another display, the buffer follows it and starts fresh there.
- At key down, the buffer freezes: the 30 seconds before the press are kept, and recording continues through the capture. The clip covers from 30 seconds before the press until release (up to 120 seconds total).
- At key down, a full-resolution screenshot of the same display is taken. The app's own windows (pill, panels) never appear in the screenshot or the clip.
- **Pause**: menu bar item **Pause screen context** (disabled in the shell) becomes real. Pausing stops capture immediately, drops the buffer from memory, and turns off the system indicator. The pill shows the shell's paused state: slashed-screen badge, hover text "Screen context is off. Flags send voice only." The menu item reads **Resume screen context**. The pause lasts until the employee resumes it, across relaunches. While paused, a flag carries no screenshot and no clip.
- Settings' **Screen context** row (inert in the shell) becomes a real switch with the line "Keep the last 30 seconds of your screen on this Mac. It leaves only inside a flag you send." It is the same state as the menu item. Settings' **Capture key** row becomes a real shortcut recorder.
- When the Mac locks, sleeps, or switches user, the buffer stops and is cleared; it restarts on unlock. Nothing from before a lock can appear in a clip.
- **Permission lapsed or refused** (including the monthly system re-approval alert being declined): the pill shows the paused badge with hover text "Screen context needs permission. Flags send voice only." and Settings' row shows "Allow" opening the Screen Recording pane.

### Capture review panel (flow 6)

Same panel, size, placement and header as the shell ("This will be sent"). Rows, top to bottom, each with a remove X:

- **Transcript**: the full transcript, editable, wrapping, never truncated. If the review opens while the last phrase is still finalizing, that phrase shows in secondary color and settles within a second.
- **Screenshot**: thumbnail of the real screenshot. Click opens the larger view with the rectangle tool: drag to draw a solid black box, click a box to select it, Delete removes it. Boxes are opaque black in the preview exactly as they will be in the sent image. No blur and no pixelate option.
- **Clip**: a player showing the clip with duration ("0:41"), play and pause, a scrub bar, and trim handles (drag the ends; the duration updates). A **Black out an area** button lets the employee draw rectangles on the video frame; each box blacks out that region on every frame of the clip. The player plays the clip with the trim and boxes already applied. While the clip is being assembled, the row shows "Preparing clip" with a small spinner.
- **Apps**: chips of the app names that were on screen ("Chrome", "SAP GUI", "Slack"), each removable. App names only, never window titles.
- Header chip: **initiative**. When the employee belongs to one live initiative, the chip shows its name and has no menu. When they belong to more than one, the chip reads "Friction will pick the initiative" and its menu lists each initiative by name plus "Let Friction pick". The pick is the employee's; the service judges only when they leave it to Friction (phase 06).
- A line under the rows: "Also sent: the time of this flag (24 September, 14:05) and the Friction version (0.4.0)." Nothing else leaves.
- Footer: "Send 4 items" (the count reflects the remaining rows; Return sends), "Discard" (Esc), and "Leaders see this without your name." (shell copy).

Review states:
- Removing a row collapses it to "Screenshot removed. Undo" (shell behavior), and the Send count drops.
- All rows removed or empty: Send is disabled and reads "Nothing to send".
- Clip still preparing: Send is disabled and reads "Preparing clip". The employee can remove the clip row to send without waiting.
- Clip could not be prepared: the row reads "Couldn't prepare the clip. It won't be sent." and counts as removed.
- Screen context paused or not permitted: no Screenshot and no Clip rows; a line reads "Screen context is off, so no screenshot or clip is included."
- On Send: the button reads "Sending" for the moment it takes to render the redacted files and write them to the outbox (normally under 2 seconds), then the panel closes.

### After Send

- The answer card opens in a compact panel anchored next to the pill (non-activating, same answer card component as the shell). It closes with its X or Esc when focused, and never auto-closes while streaming. If the main window is open on Home, the card shows there instead.
- Under the card's first line: "You'll hear here if this gets fixed."
- **Offline at Send**: the card reads "Waiting for connection. Will send exactly as approved." When the connection returns, the flag sends and the answer streams into the card if it is still open.
- **Service unreachable or erroring**: shell copy, "Couldn't reach Friction. Your flag is saved on this Mac and will send when the connection returns."
- **Rejected by the service** (a permanent error): "Friction couldn't accept this flag: {reason}. It's still on this Mac." with "Try again" and "Delete from this Mac".
- **Changed on disk after approval** (integrity check failed): "This flag changed on this Mac after you approved it, so it was not sent." with "Delete from this Mac". It is never sent.
- The menu bar menu shows a disabled line "2 flags waiting to send" while the outbox is non-empty. No badge, no banner, no sound.
- Until phase 06 lands, the answer is the shell's stub script; the flag, its files and the Idempotency-Key are real.

### Out of scope

The permissions checklist, speech model download UI and buffer explanation (03). Sign-in (02; until it lands the client sends as the shell's sample person). Service-side persistence of the flag, the real answer, initiative judgment, the "others hit this" count (06). My record listing of sent flags (07). Audio upload (voice never leaves the Mac, see Open decisions). Blur or pixelate redaction, time-scoped boxes on the clip, box tracking, on-device OCR suggestions ("Find text"), window titles, multi-display screenshots or clips, a system-picker capture path, withdrawing a sent flag (product open question), Windows.

## Technology

### Decisions

| Decision | Rationale | Rejected |
|---|---|---|
| Capture key events come from 03's `CaptureKeyRouter` as `.down(t)`, `.up(t)`, `.interrupted(t)`, tagged `.modifier` or `.shortcut`. The router owns both sources: a listen-only `CGEventTap` for a lone fn or left Control, and KeyboardShortcuts `events(for: .capture)` for ⌃⇧Space | One subscriber for both key kinds; 04 decides gestures, 03 decides which key and which permission | 04 subscribing to the tap or to KeyboardShortcuts itself: two listeners fire on one press |
| Hold, tap, the 300 ms modifier arming window, interruption, and max length decided by a pure `HoldGesture` reducer over (event, key kind, timestamp) | The only timing logic worth a unit test; no timers inside views | Timers in the view layer |
| `AVAudioEngine` created and started only on key down, stopped on key up | The orange mic indicator shows only while the employee is flagging; product says the mic listens only while held | Pre-warmed engine to hide 100 to 300 ms start latency (estimate from research): keeps the mic indicator on |
| `SpeechAnalyzer` + `SpeechTranscriber(locale:transcriptionOptions:reportingOptions: [.volatileResults], attributeOptions:)`, input `AsyncStream<AnalyzerInput>`, audio converted to `SpeechAnalyzer.bestAvailableAudioFormat(compatibleWith:considering:)`, `finalizeAndFinishThroughEndOfInput()` on key up; locale from `SpeechTranscriber.supportedLocale(equivalentTo: .current)` (Context7 `/websites/developer_apple_speech`) | On device, so the transcript exists before anything leaves; volatile results feed the pill and review live | Server transcription (audio would leave before review); WhisperKit (app-downloaded models, only for unsupported languages later) |
| Fallback when `SpeechTranscriber` is unavailable: `DictationTranscriber`; when no supported locale or assets missing: typed transcript | Research: availability gate on hardware is unverified | Blocking the capture |
| Screenshot with `SCScreenshotManager.captureImage(contentFilter:configuration:)` returning `CGImage` at native resolution (Context7 `/websites/developer_apple_screencapturekit`), started at key down | Full resolution text is legible; no need to hold a stream frame | Copying the latest buffer frame: 1440 px wide, and retaining it risks holding the stream's IOSurface pool |
| Exclude own windows with `SCContentFilter(display:excludingApplications: [ourApp], exceptingWindows: [])` for both screenshot and stream | `NSWindow.sharingType = .none` is ignored by ScreenCaptureKit from macOS 15 (research, Apple forum 792152) | `sharingType` |
| Rolling buffer: one `SCStream` at 5 fps, width 1440, 420v, `queueDepth` 5, cursor shown, no audio; frames with `SCStreamFrameInfo.status != .complete` skipped; each frame appended immediately to an `AVAssetWriter(contentType: .mpeg4Movie)` with `outputFileTypeProfile = .mpeg4AppleHLS`, `preferredOutputSegmentInterval` 1 s, `initialSegmentStartTime` set, H.264 hardware at 1.5 Mbps, keyframe every 1 s; segments arrive via `assetWriter(_:didOutputSegmentData:segmentType:segmentReport:)` into an in-memory ring (Context7 `/websites/developer_apple_avfoundation`) | Never retains `CMSampleBuffer`s (they pin the stream's small IOSurface pool; `CMSampleBufferCreateCopy` does not copy pixels, Apple forum 794659); compressed ring is about 6 MB for 30 s | Ring of raw sample buffers; `SCRecordingOutput` to a file (writes screen history to disk); `VTCompressionSession` plus passthrough writer (more code, same result) |
| 1 s segments rather than the research's 2 s | Ring granularity and the wait for the in-progress segment at release are both bounded by one second | 2 s segments: up to 2 s extra wait after release |
| Buffer follows the pill's display; on display change the writer is finished and a new one starts, the ring's generation increments and older segments are dropped | One stream costs one encoder; a new display has a new size | One stream per display (cost multiplied by display count); `updateContentFilter` on the same writer (output size is fixed at writer creation) |
| Ring lives in memory only; the frozen ring is written to `Caches/Capture/{flagId}/source.mp4` (0600) only after key down, for playback in review, and deleted on Send or Discard; the cache folder is swept at launch | Screen history never touches disk unless the employee started a flag | Disk-backed ring |
| Redaction is solid black boxes: screenshot burned with `CGContext` into a new PNG written by `CGImageDestination` with no metadata; clip boxes applied with `AVMutableVideoComposition(asset:applyingCIFiltersWithHandler:)` compositing black over each rect on every frame, exported with `AVAssetExportSession` (`timeRange` = trim, `metadata = []`, `export(to:as: .mp4)`) (Context7 `/websites/developer_apple_avfoundation`) | Blur and pixelation are reversible (research section 5); boxes are the honest default | Blur; pixelate; a redaction library |
| Preview and export share one value: `RedactionPlan` (normalized rects, trim range), and export is a pure function of (source, plan) | "Exactly what the review panel showed" is enforced by construction plus a test, not by care | Separate preview drawing code |
| Clip trim UI: `AVPlayerView` with `beginTrimming` inside the review panel via `NSViewRepresentable` (research section 5; not re-checked in Context7, unverified on 26) | Apple's own trim UI | A custom trimmer |
| File-based outbox: `Application Support/systems.onc9.friction/Outbox/{flagId}/` with `manifest.json`, `screenshot.png`, `clip.mp4`, written to a staging folder and renamed atomically, 0700 folder, 0600 files, never modified after rename; mutable delivery state kept separately in `Outbox/.state/{flagId}.json` | Immutable entry guarantees the sent bytes equal the approved bytes; the SHA-256 per file is checked before every upload attempt | SwiftData for the payload (mutable by design); a single state-and-payload folder (the entry would change after approval) |
| Uploader: one serial actor, `URLSessionConfiguration.default` with `waitsForConnectivity = true`, `NWPathMonitor` triggering an immediate retry on `.satisfied`, backoff 1 s doubling to 5 min with ±20% jitter, retries also on launch and wake; `Idempotency-Key: {flagId}` on every request | Plain session is enough because the app is a login item that rarely quits (research section 6) | Background `URLSession` (slower, only helps after quit) |
| Screenshot and clip go to R2 **through the Worker**: `PUT /v1/flags/:flagId/files/:kind` streams the raw body into `env.FILES.put(key, body, { sha256 })` | The largest object is a 120 s clip at about 1.5 Mbps, about 23 MB, far under the 100 MB request body limit on Free and Pro (Context7 `/cloudflare/cloudflare-docs`, workers/platform/limits); auth, key layout and immutability are enforced in one place; no R2 S3 credentials in the Worker; the Worker bills CPU, not time spent streaming | Presigned PUT via `aws4fetch`: needs R2 access keys as Worker secrets, a two-step dance, and cannot enforce immutability or checksum on its own; only worth it above 100 MB |
| R2 integrity via the `sha256` put option; immutability via `head()` then compare `customMetadata.sha256` | `R2PutOptions` has `sha256` "to check the received object's integrity" (live docs, developers.cloudflare.com/r2/api/workers/workers-api-reference, fetched 24 Sep 2026). What `put` does on mismatch is not documented: expected to throw; **unverified**, the test pins it | Trusting the client |
| Hono `bodyLimit` on the upload route (`hono/body-limit`; checks Content-Length, else counts the stream) (Context7 `/honojs/website`) | 413 before any R2 write | Checking size after the put |
| Active app names: `NSWorkspace.shared.frontmostApplication?.localizedName` first, then `kCGWindowOwnerName` of on-screen layer-0 windows on the captured display from `CGWindowListCopyWindowInfo(.optionOnScreenOnly, kCGNullWindowID)`, deduplicated, own app and system owners removed; `kCGWindowName` is never read (research section 4) | Owner names need no permission; titles carry document names | Window titles |
| A minimal `CapturePermissions` protocol owned by this spec | Lets 04 build in parallel with 03 (see Interfaces) | Waiting for 03 |

### Architecture

Files this spec adds or makes real, inside the shell's layout:

```
apps/mac/Friction/
  Capture/
    HoldGesture.swift           pure reducer over CaptureKeyRouter events (key names and binding live in 03)
    CaptureSession.swift        @MainActor state machine: idle, listening, recording(locked), processing, reviewing
    CapturePermissions.swift    protocol + SystemPermissionsReader (default until 03 merges)
    Audio/VoiceRecorder.swift   AVAudioEngine tap, AVAudioConverter to analyzer format, level meter, mic name
    Audio/LiveTranscriber.swift SpeechAnalyzer + SpeechTranscriber, finalized + volatile text
    Screen/ActiveDisplay.swift  display the pill is on (reads the shell's pill position), change notifications
    Screen/ScreenBuffer.swift   SCStream + AVAssetWriter, pause, lock/sleep handling, BufferStats
    Screen/SegmentRing.swift    pure ring: append, evict by time, freeze, generation, assemble
    Screen/Screenshotter.swift  SCScreenshotManager at key down
    Screen/AppNamesReader.swift frontmost + window owner names, pure filter over window-info dictionaries
    Review/ReviewModel.swift    rows, removals, RedactionPlan, initiative pick, send count, item manifest
    Review/ScreenshotBurner.swift  CGContext burn, PNG without metadata
    Review/ClipExporter.swift   AVMutableVideoComposition + AVAssetExportSession
    Review/ClipEditorView.swift AVPlayerView trim + box drawing
    CaptureReviewPanel.swift, CaptureReviewView.swift, RedactionCanvas.swift   shell files, made real
  Outbox/
    OutboxManifest.swift        Codable manifest, SHA-256 (CryptoKit)
    OutboxStore.swift           staged atomic write, integrity check, list, delete, state files
    OutboxUploader.swift        serial actor: upload files, POST /v1/events, hand stream to AnswerStream
    Connectivity.swift          NWPathMonitor wrapper
  Answer/AnswerPanel.swift      compact non-activating panel near the pill hosting the shell's AnswerCardView
  Answer/AnswerStream.swift     shell file: additive init taking a Flag body and extra headers
  Main/Settings/                Capture key and Screen context rows made real
  Debug/DebugMenu.swift         additive: "Buffer stats", "Mark buffer explained", "Drop network" toggle
FrictionTests/Capture/, FrictionTests/Outbox/

apps/api/src/
  routes/<file holding POST /v1/events>   additive: PUT /v1/flags/:flagId/files/:kind; key checks on POST /v1/events
  storage/flag-files.ts                    key layout, head-compare-put, size limits
packages/contracts/src/uploads.ts          FlagFileKind, FlagFileUploadResult, upload error codes; fixture uploads.json
```

No `project.yml` dependency change: KeyboardShortcuts is already linked by the shell; ScreenCaptureKit, AVFoundation, Speech, CryptoKit and Network are system frameworks. The audio-input entitlement and usage strings are already in the shell.

### Key flows

**1. Hold to talk.** `HoldGesture` receives `.down(t)`. For a `.modifier` key it waits: `.interrupted` or `.up` before `t + 0.3 s` returns `.cancel` and nothing starts (no mic, no screenshot); reaching `t + 0.3 s` returns `.start`. For a `.shortcut` key `.down` returns `.start` at once. On `.start`, `CaptureSession` in parallel: freezes the ring, starts `Screenshotter` for the active display, reads app names, starts `VoiceRecorder`. Pill goes Listening. The first audio buffer moves the pill to Recording and starts the timer. Buffers are converted and yielded as `AnalyzerInput` to `LiveTranscriber`; results update `finalizedText` (when `isFinal`) and `volatileText`. On `.up(t)`: for a `.shortcut` key, if `t - down < 0.3 s` the reducer returns `.lock`; otherwise, and always for a `.modifier` key, `.finish`. On finish: stop the engine, finish the input stream, await `finalizeAndFinishThroughEndOfInput()`, then open the review. In parallel: wait for the in-progress segment (at most about 1 s, or none if the screen was static and no frame arrived), assemble init segment plus the frozen generation's segments into `source.mp4`, set the default trim to the whole clip, and unfreeze the ring (it resumes rolling).
- Failure: no audio within 1.5 s: tear down, "Microphone didn't start. Try again." Screenshot error: row omitted, logged. Assembly error: clip row shows the failure line. Transcriber error mid-capture: keep the text so far; the review shows it editable.
- Invariant: nothing from the capture is written anywhere except `Caches/Capture/{flagId}/` until Send.

**2. Buffer lifecycle.** Start at launch when `permissions.screenRecording == .granted && permissions.bufferExplained && !paused`, so the monthly re-approval alert lands at launch rather than mid-flag (timing unverified). Stop and clear on pause, lock (`com.apple.screenIsLocked`), sleep, session resign, and `SCStreamDelegate` stop errors (then show the permission state). Restart on resume, unlock, wake. Ring eviction: keep segments whose end time is within 30 s of the newest; while frozen, evict nothing until 120 s total, after which the capture ends with the review (the clip cap and the 90 s recording cap together keep this unreachable in practice).

**3. Send.** `ReviewModel.makeSubmission()` produces the item list from the rows that remain. Render: `ScreenshotBurner` (if the screenshot row remains) and `ClipExporter` (if the clip row remains) with the current `RedactionPlan`. Build the `Flag` body: `id` = the flag UUID generated at key down, `initiativeId` = the employee's pick or null, `transcript` = the edited text exactly as in the field (no trimming, no normalization), `appNames` = remaining chips in displayed order, `screenshotKey`/`clipKey` = the deterministic keys the upload route will return, `resolutionClass` null, `createdAt` = key down time. Write staging folder, fsync, rename to `Outbox/{flagId}`. Delete `Caches/Capture/{flagId}`. Close the panel, open the answer card, wake the uploader.

**4. Deliver.** For the oldest entry: recompute every file's SHA-256 and compare to the manifest; on mismatch, mark `quarantined` and never send. For each file not yet acknowledged: `PUT /v1/flags/{id}/files/{kind}` with the file bytes, `Content-Type`, `Content-Length`, `x-ft-sha256`, `Idempotency-Key`. Then `POST /v1/events` with the manifest's flag JSON bytes verbatim and `Idempotency-Key`, handing the response to `AnswerStream`. On `done`: delete the entry and its state. On transport failure or 5xx or 429: keep, back off, retry (NWPathMonitor, launch, wake also trigger). On 401: keep and wait for sign-in (02). On 400, 409 `immutable_conflict`, 413, 422: mark `failed` with the server's message; "Try again" re-runs delivery, "Delete from this Mac" removes the entry.
- If the stream breaks after `meta` but before `done`, the entry stays and is re-POSTed with the same id. Phase 06 must make a repeated `POST /v1/events` for an already-answered flag replay the stored answer instead of answering twice (the flag id is the primary key, per 01).

### Interfaces

**Swift: permissions seam (meets 03 at merge).**

```swift
enum PermissionStatus: Sendable, Equatable { case granted, denied, notDetermined }
enum SpeechModelStatus: Sendable, Equatable { case installed, downloading(Double), missing }
@MainActor protocol CapturePermissions: AnyObject {
  var microphone: PermissionStatus { get }
  var screenRecording: PermissionStatus { get }      // CGPreflightScreenCaptureAccess
  var speechModel: SpeechModelStatus { get }
  var bufferExplained: Bool { get }                  // flow 2: buffer explained before it starts
  func changes() -> AsyncStream<Void>                // re-read on didBecomeActive
  func openSettings(for: CapturePermissionKind)
}
```

04 ships `SystemPermissionsReader` (reads system status, never prompts for screen recording, reads `bufferExplained` from `UserDefaults` key `ft.onboarding.bufferExplained`, which the Debug menu can set). 03 ships its `PermissionsService`; at merge, whichever branch lands second adds `extension PermissionsService: CapturePermissions {}` (or adapts the member names) and changes the one line in `AppDelegate` that constructs the capture stack. If 03 lands first with its own protocol, 04 conforms to 03's protocol instead and deletes `SystemPermissionsReader`. Either way the change is additive and recorded in the merging spec's Engineering Notes.

**Swift: capture key seam (meets 03 at merge).**

```swift
enum CaptureKeyKind: Sendable, Equatable { case modifier, shortcut }
enum CaptureKeyEvent: Sendable, Equatable {
  case down(TimeInterval), up(TimeInterval), interrupted(TimeInterval)  // interrupted: another key or a click while a modifier is down
}
@MainActor protocol CaptureKeySource: AnyObject {
  var kind: CaptureKeyKind { get }
  func events() -> AsyncStream<CaptureKeyEvent>
}
```

04 ships `ShortcutKeySource` (KeyboardShortcuts `events(for: .capture)`, initial ⌃⇧Space, kind `.shortcut`) so it builds and tests before 03 lands. 03's `CaptureKeyRouter` conforms to `CaptureKeySource` and replaces it at merge with a one-line change in `AppDelegate`, recorded in the merging spec's Engineering Notes.

**Swift: outbox manifest** (`manifest.json`, client only):
`{ schemaVersion: 1, flagId, approvedAt, flag: <Flag JSON exactly as it will be POSTed>, files: [{ kind: "screenshot" | "clip", name, contentType, byteSize, sha256 }], review: { transcriptEdited, screenshotBoxes, clipBoxes, clipTrim: { startSeconds, endSeconds } } }`. The `review` block records what the employee did, locally only; it is never uploaded.

**HTTP: upload route (flow 6), additive, in the route file that holds `POST /v1/events`.**
- `PUT /v1/flags/:flagId/files/:kind`, `kind` in `screenshot | clip`.
- Headers: `Idempotency-Key` (must equal `:flagId`, else 400 `idempotency_key_mismatch`), `Content-Type` (`image/png` for screenshot, `video/mp4` for clip, else 415), `Content-Length` (required, else 411), `x-ft-sha256` (64 lowercase hex, else 400).
- Limits via `bodyLimit`: screenshot 20 MB, clip 60 MB, 413 `too_large` beyond.
- Key: `flags/{organizationId}/{flagId}/screenshot.png` or `flags/{organizationId}/{flagId}/clip.mp4`, organization from the request identity (the shell's sample organization until 02).
- Logic: `head(key)`; if present and `customMetadata.sha256` equals the header, 200 with `reused: true`; if present and different, 409 `immutable_conflict` and nothing is written; else `put(key, c.req.raw.body, { sha256, httpMetadata: { contentType }, customMetadata: { sha256, flagId, userId } })`, 201. A put error from checksum mismatch returns 422 `checksum_mismatch`.
- Response (`FlagFileUploadResult`, Zod in `packages/contracts/src/uploads.ts`): `{ key, sha256, byteSize, reused }`.

**HTTP: `POST /v1/events` additions (still the stub stream otherwise).** Accept `Idempotency-Key`; if present it must equal the flag's `id`. If `screenshotKey` or `clipKey` is set, it must be under `flags/{organizationId}/{id}/` (else 400 `foreign_file_key`) and `head()` must find it (else 409 `files_missing`), checked before the stream starts.

**Contracts.** No change to `Flag`. New `uploads.ts`: `FlagFileKind`, `FlagFileUploadResult`, `UploadErrorCode` (`idempotency_key_mismatch`, `unsupported_media_type`, `length_required`, `too_large`, `immutable_conflict`, `checksum_mismatch`, `files_missing`, `foreign_file_key`), plus a fixture both TS and Swift decode.

**Schema.** None. Orphaned R2 objects (files uploaded for a flag whose POST never succeeded) are left for a later cleanup job; 06 or 09 owns it.

### Performance budget (flow 12)

| Measure | Budget | How to measure |
|---|---|---|
| Buffer CPU, steady state | at most 3% of one core averaged over 60 s on an M1 at 1440 px, 5 fps | `xcrun xctrace record --template 'Time Profiler' --attach Friction --time-limit 60s`; Activity Monitor CPU column as a sanity check |
| Buffer memory | ring at most 8 MB at 30 s; process footprint increase at most 40 MB with the buffer on vs off | Debug "Buffer stats" (ring bytes, segment count, frames delivered, frames dropped, current fps); `footprint Friction` with the buffer on and paused |
| Frozen ring during a capture | at most 25 MB at the 120 s cap | Buffer stats during a 90 s capture |
| Energy | Activity Monitor Energy Impact stays "Low" class with the buffer on and the screen idle | Activity Monitor, 5 minutes idle |
| Key down to screenshot captured | under 250 ms (estimate, unverified) | signpost `capture.screenshot` in Instruments |
| Release to review open | under 1 s without the clip; clip ready under 3 s for a 60 s clip | signposts `capture.review`, `capture.clipReady` |

A performance XCTest (`measure(metrics: [XCTCPUMetric(), XCTMemoryMetric()])`) runs the buffer for 60 s. It needs a screen-recording grant for the test runner, so it runs manually on Andrés's Mac, not in CI. If the budget fails, drop to 4 fps or 1280 px before anything else.

### Tests (each must be seen failing before it is trusted)

- `HoldGesture`, modifier key: down at 0 then interrupted at 0.1 s gives cancel and no start; down at 0 then up at 0.2 s gives cancel; down at 0 held to 0.3 s gives start; up at 2 s gives finish, never locked. Mutation: drop the interruption check; the Control-click test fails naming "expected cancel, got start".
- `HoldGesture`, shortcut key: down at 0, up at 0.2 s gives locked; up at 0.5 s gives finish; a locked capture finishes on the next down; no up for 90 s finishes at exactly 90 s. Mutation: change the 0.3 s comparison from `<` to `>`; the tap test fails naming "expected locked, got finish".
- `SegmentRing`: 40 one-second segments while unfrozen keep exactly the newest 30 plus init; freeze at 40, append 20 more, all 50 are kept; a generation change drops older segments; assemble returns init followed by segments in timestamp order. Mutation: evict while frozen; the freeze test fails with 30 instead of 50.
- `ScreenshotBurner`: on a 200 by 100 white image with one box (normalized 0.1, 0.1, 0.2, 0.3), every pixel inside is exactly (0,0,0,255), every pixel outside equals the source, and the PNG has no EXIF, TIFF or GPS dictionaries. Mutations: fill at alpha 0.5; skip the y-flip (box lands mirrored); both fail naming the pixel.
- `ClipExporter` (integration with a generated 4 s white H.264 file): with trim 1 to 3 s and one box, duration is 2.0 s ±0.1 and sampled frames at 1.2, 2.0 and 2.8 s are black inside the box and white outside. Mutation: apply the box only when `compositionTime == .zero`; the 2.0 s sample fails.
- `AppNamesReader`: from fixture window-info dictionaries (with titles, system owners, our own app, duplicates, a layer-25 window), output is exactly `["Chrome", "SAP GUI", "Slack"]` and contains no title string. Mutation: read `kCGWindowName`; the test fails on the title.
- `ReviewModel`: removing the screenshot row yields "Send 3 items", a submission with no screenshot file and `screenshotKey == nil`. Mutation: remove the row from the view list only; the submission test fails.
- Outbox parity (URLProtocol-backed local stub capturing bodies): after Send, the bytes received by the upload route hash to the manifest's SHA-256, and the `POST /v1/events` body is byte-identical to `manifest.flag`, including a transcript with trailing spaces and an emoji. Mutation: trim the transcript before POST; the byte comparison fails.
- Outbox integrity: altering one byte of `screenshot.png` after the write leaves the entry `quarantined` and the stub receives zero requests for that flag. Mutation: skip verification; the test fails with one received request.
- Outbox retry: stub returns 503, 503, then success; the entry is deleted after `done`, and all three attempts carry `Idempotency-Key` equal to the flag id. Mutation: generate a new UUID per attempt; the header assertion fails.
- API (vitest, workers pool, local R2): PUT with a wrong `x-ft-sha256` returns 422 and `head(key)` is null; PUT twice with the same hash returns 201 then 200 with `reused: true`; a second PUT with a different hash returns 409 and the stored bytes are unchanged; `Idempotency-Key` different from the path id returns 400; a clip body over 60 MB returns 413; `POST /v1/events` with a missing key returns 409 `files_missing`, with another flag's key 400 `foreign_file_key`. Mutations: drop the `sha256` put option (the 422 test fails); skip the `head` compare (the 409 test fails).
- Contracts: the uploads fixture parses in Zod and decodes in Swift. Mutation: rename `byteSize` in Swift.

Manual checks on a signed build before merge: the pill and panels never appear in a screenshot or clip (including over a full-screen app); the purple indicator turns off on pause; the mic indicator is off except while recording; a flag sent with Wi-Fi off arrives after Wi-Fi returns and its downloaded R2 objects hash to the manifest values.

### Rollout

1. Build on branch `iteration-1/04-capture` in its own worktree. The API dev server stays on 8787, restarted from this worktree while testing (`wrangler dev --port 8787`, local R2 simulated).
2. The buffer never starts for anyone until `bufferExplained` is true, which only 03's onboarding (or the Debug menu) sets, so merging 04 before 03 exposes no unexplained buffer.
3. Grants are tied to the signature: build signed (`Developer ID Application`, Team `P62A3QS593`) so screen and mic grants survive rebuilds; `tccutil reset ScreenCapture systems.onc9.friction` to retest first-run.
4. Merge to `main`; the Worker deploys on push. The R2 bucket `friction-telemetry-docs` already exists from 01; no new binding.
5. Rollback: revert the merge. Outbox entries on a Mac survive a revert as files and send once the route returns; the upload route is additive, so reverting it only makes those entries wait.

Shell changes, all additive or stub replacements, to record in Engineering Notes: pill click starts a capture instead of opening the main window; pill hover copy; menu items "Flag something" and "Pause screen context" made active; Settings rows "Capture key" and "Screen context" made real; `AnswerStream` gains an init taking a `Flag` and headers; the upload route and key checks added to the events route file.

### Open decisions

1. **Buffer length and turning it off** (product open question, owner Andrés). Default: 30 s before the press; pause is indefinite and persists across relaunch, which is effectively "off".
2. **Clip span.** Default: from 30 s before the press to release, capped at 120 s, trimmable. Alternative: pre-press seconds only.
3. **Voice audio never leaves the Mac.** `product.md` defines a Flag as "a voice note, its transcript, and the screen context", but the contracts carry no audio and research recommends leaders never get audio. Default: only the transcript is sent; audio is discarded when the review closes. The product definition's wording should be updated to match.
4. **What pause removes.** Default: paused means no screenshot and no clip (matches the shell copy "Flags send voice only."). Research proposed "screenshot at press, no clip" as buffer-off mode.
5. **Pill click.** Default: a click starts a locked capture (product flow step 2, "press the pill"), replacing the shell's click-opens-Home.
6. **Maximum recording length.** Default 90 s, with a 10-second notice.
7. **Initiative chip default** with more than one initiative. Default: "Friction will pick the initiative", with no preselected last-used initiative (preselection would bias the signal).
8. **Deleting a waiting flag.** Default: only failed or quarantined entries can be deleted from the Mac; waiting entries send. Allowing deletion of waiting entries is not "withdraw" (nothing was received) but part of their files may already be in R2.
9. **Where the answer shows after Send.** Default: a compact non-activating panel next to the pill, so sending never activates the app or opens the main window.

---

## Sessions

- 2026-09-24: Initial spec · `claude -r cf097e99-94f3-4cce-9596-642e0c0c18b8`
