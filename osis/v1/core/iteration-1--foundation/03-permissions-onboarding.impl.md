# Permissions and Onboarding

**Iteration:** iteration-1--foundation
**Depends on:** 01-shell
**Status:** not started

## UX

This spec is flow 2 (employee install) after sign-in. The employee has downloaded the app and signed in (phase 02; in this worktree the Debug sample person "Sam Okafor" is always signed in). Setup now walks them through the macOS permissions a flag needs, explains the on-device screen buffer before asking for screen recording, downloads the on-device speech model with visible progress, confirms the capture key, offers to open at login, and ends with a practice flag that never leaves the Mac. After setup, the app keeps permission state live and honest: the pill, the menu bar menu, and Settings always show what Friction can and cannot see.

Reference screens (Part 1 section 9 of the research): Wispr Flow's one-permission-per-step onboarding ending in a practice dictation ([flow](https://mobbin.com/flows/a743edfe-4338-4537-984b-17f173f3212d)), Maze's stepper listing each permission as a row ([screen](https://mobbin.com/screens/8cf9682a-28ba-4659-9c3c-3424ed51af2e)), Rise's "(required)" markers and plain storage line ([screen](https://mobbin.com/screens/a2d978fc-1631-4ae7-abfa-9cf2bcff92e0)), Spotify DJ's "Your microphone will only be on while you're making a request" ([screen](https://mobbin.com/screens/0831a00e-8379-44a1-8992-f3e79dcd3cdb)). Anti-patterns to avoid: asking for every permission at first launch, and blocking the whole app on screen recording.

### When setup appears

- Setup opens once a session exists and setup has not been completed for the current setup version. In this phase that is at launch (sample person); phase 02 calls the same entry point right after sign-in succeeds.
- If the employee closes the window mid-way, setup reopens at the step they left on the next launch, and the menu bar menu gains a first item **Finish setup** until it is done. Nothing else reminds them: no badge, no pulse, no banner.
- After a relaunch that setup itself asked for (screen recording), the window reopens at the Screen context step without a click.
- Setup never appears for a signed-out person (phase 02 shows sign-in first).

### Window

- A regular titled window "Set up Friction", 760 by 560 pt, not resizable, centered on the display the pill is on. While it is open the app is in the Dock and Cmd-Tab (same activation rule as the main window).
- Left column, 220 pt: the step list, Maze style. Each row: a status glyph and the step name. Glyphs: empty circle (not started), filled dot (current), checkmark (done), spinner (speech model downloading), grey dash with the word "Skipped", orange circle with the word "Off" (permission denied). Required steps carry "(required for flags)" under the name in secondary text, Rise style.
- Right pane: one step at a time, Wispr style. Top line "Step 3 of 8" in secondary text. Title, one or two short paragraphs, the step's controls, then a footer with **Back** (left) and the primary button (right). Return triggers the primary button.
- The employee can click any earlier row in the left column to revisit it. Later rows are not clickable until reached.

### Steps and their states

**1. Welcome**
- Title: "Friction helps when a change at work gets in your way."
- Body: "Hold a key, say what went wrong, and get an answer from the documents behind the change. Or ask a question in Ask. Nothing leaves this Mac until you've seen it and pressed Send."
- Second paragraph: "Setup takes about two minutes. You'll choose what Friction can use, and you can change any of it later in Settings."
- Primary: **Get started**.

**2. Microphone (required for flags)**
- Title: "Microphone". Body: "Friction uses the microphone only while you hold the capture key. macOS shows an orange dot in the menu bar whenever the microphone is on."
- Not asked: primary **Allow microphone**. Pressing it shows the macOS prompt; while the prompt is up the pane shows "Waiting for your answer in the macOS dialog."
- Allowed: a green check and "Microphone allowed." Primary becomes **Continue**.
- Denied: "Microphone is off for Friction. Turn it on in System Settings, then come back here." Button **Open System Settings** (opens Privacy and Security, Microphone). The row flips to allowed by itself when the employee returns to the app with it turned on.
- Restricted (managed Mac): "Your organization's settings don't allow Friction to use the microphone on this Mac." No Settings button.
- Secondary link on every non-allowed state: **Continue without voice**. It shows, inline: "Flags need your voice. Without it you can still ask questions in Ask and read Q&A." with **Continue without voice** and **Cancel**. Confirming marks Microphone, Speech, Screen context, Capture key, and Practice as Skipped ("Needs the microphone") and goes to Open at login.

**3. Speech (required for flags)**
- Title: "Speech to text on this Mac". Body: "Friction turns what you say into text here, not on a server, so you can read and edit it before anything is sent."
- Not asked: primary **Allow speech recognition**, then the macOS prompt. Denied and restricted states mirror the microphone step, with the Speech Recognition deep link.
- Once allowed, the speech model download starts at once and the pane shows a progress bar: "Downloading the English (United States) speech model, 34%". The language name is the Mac's current language as the system names it. The percentage updates live; it is never replaced by a vague "Downloading".
- **Continue** is enabled as soon as authorization is granted; the download keeps going in the background and the left-column row shows a spinner until it finishes, then a checkmark.
- Already installed: "The English (United States) speech model is ready." with a check.
- Fallback: when this Mac cannot run the newer speech model, the pane says "This Mac uses the built-in dictation model. Transcripts may be a little less accurate." and installs that model with the same progress bar.
- Unsupported language: "Friction can't turn [language] speech into text on this Mac yet. You can still ask questions in Ask." The step shows Off; flags are unavailable.
- Download failed: "The download stopped. macOS will try again on its own." with **Try again**. Offline: "Waiting for a connection to download the speech model."

**4. Screen context (optional)**

The buffer explanation comes first and fills the pane; the permission control sits below it.
- Title: "Screen context". Body, three short paragraphs:
  - "When you flag something, Friction can include a screenshot and the last 30 seconds of your screen, so the answer and the owner can see what you saw. Those seconds are kept only on this Mac and are overwritten as time passes."
  - "Nothing from your screen leaves this Mac unless you send a flag, and you see every screenshot and clip first. You can remove or black out anything before you send. Friction's own windows are never recorded."
  - "What you'll see from macOS: while screen context is on, a screen recording icon stays in your menu bar. About once a month macOS asks whether Friction may keep accessing your screen. Choose Allow For One Month to keep screen context. You can pause it from the Friction menu at any time, and the icon goes away."
- Primary: **Allow screen recording**. Secondary, always visible: **Skip, use voice only**.
- First press calls the macOS request; macOS shows its alert once and points to System Settings. The pane switches to the waiting state: "Turn on Friction under Screen & System Audio Recording in System Settings." Buttons **Open System Settings** and, below a divider, "Turned it on? macOS needs Friction to reopen before it can see your screen." with **Quit and reopen Friction**.
- Quit and reopen: the pane shows "Reopening Friction" for the moment before the app quits. Friction returns in a second or two with this window open at this step. If macOS offered its own "Quit & Reopen" button and the employee used that, the result is the same.
- Granted (after reopen or at once): a green check and "Screen context is on. The screen recording icon in your menu bar shows it's running." Primary **Continue**.
- Skip: the step shows "Skipped" and the pane, if revisited, reads "Flags will send your voice and transcript only. Turn on screen context any time in Settings."

**5. Capture key**
- Title: "Your capture key". Body: "Your capture key is the key in the bottom-left corner of your keyboard. Hold it anywhere on your Mac, say what went wrong, and let go."
- **Ask first.** Second paragraph: "To notice that one key on its own, macOS asks you to allow Input Monitoring. Friction uses it only to tell when that key is held down. It never reads or keeps what you type." Primary: **Allow Input Monitoring**. Secondary, always visible: **Use a key combination instead**.
- First press calls the macOS request; macOS shows its alert and points to System Settings. Waiting state: "Turn on Friction under Input Monitoring in System Settings." with **Open System Settings**. If the permission reads as granted but the key still cannot be heard, the pane adds "macOS needs Friction to reopen before it can hear the key." with **Quit and reopen Friction** (the same relaunch as step 4, resuming at this step).
- **Learn the key by holding it.** Once allowed: a large rounded card with a keyboard outline, its bottom-left key highlighted, and "Hold the bottom-left key." Holding fn or left Control on its own for 300 ms binds that key: the card shows its key cap and "Got it. Your capture key is fn." (or "Control"). Primary: **Continue**.
- Holding any other key (right Control, Option, Command, Shift, a letter) or a combination shows "That's a different key. Hold the bottom-left key on its own: fn on Apple keyboards, Control on most others." Nothing is bound.
- **Key combination instead** (chosen, or Input Monitoring declined): the step binds ⌃⇧Space and shows "Your capture key is ⌃⇧Space. It needs no special permission. You can switch to the bottom-left key any time in Settings." A shortcut recorder shows the combination; clicking it records a new one, and the recorder warns when a combination is taken by macOS or another menu. A link **Use ⌃⇧Space** restores it. If the employee clears the recorder, **Continue** disables with the reason "Choose a key to continue."
- Every place that names the key (pill hover text, menu bar "Flag something", Home empty state, practice step, Done) reads it from `CaptureKeyDisplay` from then on: "fn", "Control", or the combination.

**6. Open at login**
- Title: "Open Friction when you log in". Body: "The pill is how you flag something. If Friction isn't open, the capture key does nothing." A toggle "Open at login", on by default. The setting is applied when the employee presses **Continue**, never before.
- macOS may show its own notice that Friction was added to Login Items; the body adds: "macOS may show a notice that Friction was added to your login items. That's expected."
- Needs approval: "macOS needs you to allow Friction in Login Items." with **Open Login Items Settings**.
- Failure: "Couldn't add Friction to your login items. You can try again in Settings." Continue stays enabled.

**7. Practice flag (optional)**
- Title: "Try it. Nothing will be sent." Body: "Hold fn, say anything, and let go. This practice stays on this Mac." (the bound key's name)
- Waiting: a large rounded card showing the bound key's cap and "Hold fn".
- Key down: the card shows "Starting microphone" until audio actually arrives, then "Listening · MacBook Pro Microphone" (the real input name), a red dot, a level meter, a timer, and the live transcript growing line by line, wrapping, never truncated.
- Letting go before the capture starts (under 300 ms for fn or Control; a tap for a combination) shows "Keep holding fn while you talk." with the bound key's name.
- Key up: the card becomes a practice review: heading "This is what a flag shows you before it sends", the transcript, a screenshot thumbnail labelled "Screenshot" when screen context is on (taken at key down, Friction's windows excluded), and a line in place of a Send button: "Practice only. Nothing was sent." Buttons **Try again** and **Finish setup**.
- Practice stops itself at 30 seconds with "Practice stops at 30 seconds."
- If the speech model is still downloading: "Waiting for the speech model (72%)." The key does nothing until it is ready.
- Secondary link **Skip practice**. Practice is automatically Skipped when voice is unavailable.

**8. Done**
- Title: "You're set." Body lists what is on, one line each, from live state: "Voice: on", "Screen context: on" or "Screen context: off, flags send voice only", "Capture key: fn" (the bound key), "Open at login: on". Then: "Friction lives in the pill on the right edge of your screen."
- Primary **Done** closes the window; the pill shows (it already exists from the shell) and the app returns to menu bar only.

### After setup: live permission state

- Friction re-checks every permission whenever the app becomes active, when the Mac wakes, when the employee hovers or clicks the pill, and every 60 seconds for screen recording only (a silent check that never prompts). macOS gives no callback, so these are the only signals.
- **Screen context states**, shown the same way in the pill, the menu, and Settings:
  - On: pill idle as in the shell.
  - Off (the employee's choice, from setup, Settings, or the menu): pill enters the shell's "Screen context paused" state, hover text "Screen context is off. Flags send voice only."
  - Stopped (permission lapsed: turned off in System Settings, the monthly approval declined, or capture reported a failure): pill enters the same paused state with hover text "Screen context stopped because macOS permission ended. Flags send voice only." and an inline **Turn back on** button inside the expanded capsule that opens Settings on Screen context.
  - The pill never pulses, bounces, or animates to announce a change. The badge is state, not a request.
- **Menu bar menu:** the shell's disabled "Pause screen context" becomes real: **Pause screen context** when on, **Resume screen context** when off by choice, **Turn On Screen Context** when never granted or stopped (opens Settings on Screen context). **Finish setup** appears at the top only while setup is incomplete.
- **Voice unavailable** (microphone or speech off, or no model): the pill hover text reads "Voice is off. Turn on the microphone and speech in Settings to flag." Pressing the capture key does nothing else.

### Settings (rows from the shell become real)

- **Capture key**: two choices. **Bottom-left key** shows the bound key ("fn" or "Control"), the Input Monitoring status in words (Allowed; Off, with **Open System Settings**), and **Hold to change**, which reruns step 5's hold card. **Key combination** shows the recorder, the **Use ⌃⇧Space** link, and the note "No special permission needed." Clearing the combination shows "No capture key. You can still flag by clicking the pill." in orange text. If Input Monitoring is turned off in System Settings while the bottom-left key is chosen, the row reads "Friction can't hear fn. Allow Input Monitoring, or switch to a key combination." and the pill hover text reads "Friction can't hear fn. Click to flag, or fix it in Settings."
- **Screen context**: status line in words (On; Off, flags send voice only; Stopped, macOS permission ended; Not allowed yet), a toggle "Use screen context" (disabled with the reason when permission is missing), the three buffer paragraphs from step 4 in full, and when not granted **Open System Settings** plus **Quit and reopen Friction**.
- **Permissions** (new section under Screen context): Microphone (Allowed or Off, with Open System Settings), Speech recognition (Allowed or Off), Speech model ("Installed · English (United States)", "Downloading 42%", "Using the built-in dictation model", or "Not available for [language]"), each updating live.
- **Open at login**: toggle, with the needs-approval message and button when relevant.
- **Account**: the signed-in person's name, email, and organization from the session ("Sam Okafor · sam.okafor@acmelogistics.com · Acme Logistics", wrapped, never truncated), and **Run setup again**. Sign out belongs to phase 02 and is not rendered by this phase.

### Honesty rules this spec holds

- Nothing about setup or permissions is sent to the service. No permission status, no setup analytics, no practice audio or text.
- The practice flag never touches the network, the outbox, or disk.
- Input Monitoring is used only to notice the bound key. The tap never forwards which other key was pressed, and nothing it sees is stored or sent.
- Copy never promises what macOS may change: the indicator and monthly prompt are described as macOS behavior, in plain words, before the employee grants screen recording.

### Out of scope

Sign-in and sign-out (02). The real capture pipeline, the rolling buffer itself, the capture review panel, redaction, and the outbox (04): this spec only decides whether screen context is allowed and wanted, and publishes that. Hands-free lock, languages other than the Mac's current language, Accessibility (not needed, never requested), notifications (never requested in this iteration), the MDM profile for managed Macs, Sparkle.

## Technology

### Decisions

| Decision | Rationale | Rejected |
|---|---|---|
| One `PermissionsService` (`@MainActor @Observable`) owns every permission read, request, and derived state; onboarding, Settings, the pill, the menu, and phase 04 read from it | One place decides "can Friction flag, with or without screen"; 04 consumes readiness instead of re-probing TCC | Each view calling AVCaptureDevice or CG functions directly: inconsistent states across pill, menu, and Settings |
| System calls behind a `PermissionProbe` protocol, `SystemPermissionProbe` live and `FakePermissionProbe` in tests and Debug | The state machine and derivations are the parts that decide; they get unit tests without TCC | Testing against real TCC: needs resets and clicks, cannot run in CI |
| Onboarding as a pure reducer `OnboardingMachine.reduce(_:_:)` plus an `OnboardingStore` that writes after every transition | Survives the screen-recording relaunch at any moment; the reducer is the unit under test | SwiftUI `@State` flow: lost on relaunch |
| Checklist window with left step list and one step per pane | Maze and Rise give the overview, Wispr gives focus; revisiting steps is free | Single scrolling checklist (research Part 1 pattern): three permissions plus model progress plus practice is too much on one screen |
| Capture key is fn or left Control held on its own, heard through a listen-only `CGEventTap` (Input Monitoring), learned in onboarding by holding it; fallback ⌃⇧Space through KeyboardShortcuts (no permission) | Andrés, 24 Sep 2026: one key, taught by doing. Input Monitoring only listens and cannot act on the employee's behalf; the fallback keeps flags possible for anyone who declines | ⌃⌥Space (macOS input-source shortcut and the VoiceOver modifier); `NSEvent` global monitor (needs Accessibility, which can control the Mac); a lone modifier with no fallback |
| The tap's callback reads a key code only from `flagsChanged` events; for key-down and click events it forwards only "another key" or "a click", never which key | This is what makes "It never reads or keeps what you type" true, and a unit test on the input mapping holds it | Mask of `flagsChanged` only: cannot tell Control-C or Control-click from a hold, so the mic would start during ordinary shortcuts |
| SpeechTranscriber when `SpeechTranscriber.isAvailable` and the locale is supported, else DictationTranscriber, else unavailable | Best on-device accuracy with a documented fallback | WhisperKit: app-managed 150 MB to 1.5 GB download; only if a customer needs another language |
| Relaunch by spawning a waiter shell (`/bin/sh -c` waits for our PID to exit, then `/usr/bin/open` our bundle URL), then `NSApp.terminate` | Only one instance ever runs, so the pill never appears twice | `NSWorkspace.openApplication` with `createsNewApplicationInstance`: two pills on screen for a moment and two capture-key registrations |
| Screen recording lapse detected by preflight on activation, wake, pill hover, a 60 s timer, and a failure report from 04's stream | macOS has no change callback; a menu bar app rarely becomes active, so activation alone misses lapses | Activation-only re-check (research default): a background app would show "on" for days after a lapse |
| One user preference `screenContextEnabled` covers the setup skip, the Settings toggle, and the menu pause | One concept, "off by choice", avoids a separate paused-versus-off distinction nobody can explain | Separate "paused" and "voice only" states |
| `CaptureKeyRouter` is the single owner of both key sources (the tap and `KeyboardShortcuts.events(for: .capture)`), conforms to 04's `CaptureKeySource`, and routes to practice or to 04's capture handler | 03 and 04 build in parallel; two listeners would both fire on one press | Each phase subscribing on its own |
| Practice uses a minimal `PracticeRecorder` in this spec (AVAudioEngine plus SpeechAnalyzer, optional one screenshot) | 03 and 04 run in parallel; practice also proves mic, speech, and model end to end at setup | Waiting for 04's capture engine: blocks this phase on a sibling |
| Setup state is local only; no route, table, or event | Behavioral rule: nothing leaves the Mac unseen; the service has no use for permission status | Reporting setup completion for admin dashboards: monitoring by another name |

### Architecture (inside the shell's layout; new files only, plus additive edits named below)

```
apps/mac/Friction/
  Permissions/
    PermissionsService.swift        observable state, requests, refresh triggers, readiness
    PermissionSnapshot.swift        MicStatus, SpeechAuthStatus, ScreenCapturePreflight, LoginItemStatus
    PermissionProbe.swift           protocol + SystemPermissionProbe (AVCaptureDevice, SFSpeechRecognizer, CG, SMAppService, AssetInventory)
    ScreenContextState.swift        enum + pure derive(...)
    SpeechModelInstaller.swift      transcriber choice, AssetInventory status, download with Progress
    SystemSettingsLinks.swift       deep links with fallback form
    Relauncher.swift                waiter process + terminate
    PermissionsPreferences.swift    UserDefaults-backed screenContextEnabled, everGrantedScreen, screenRequestIssued
  CaptureKey/
    CaptureKeyBinding.swift         enum .fn | .leftControl | .shortcut, UserDefaults key "captureKey.binding"
    CaptureKeyName.swift            KeyboardShortcuts.Name.capture, initial ⌃⇧Space (the fallback)
    ModifierHoldTap.swift           listen-only CGEventTap, maps raw events to ModifierInput, re-enables on tap timeout
    ModifierHoldClassifier.swift    pure reducer: ModifierInput -> down / up / interrupted / wrongKey
    CaptureKeyDisplay.swift         the one name every string uses ("fn", "Control", "⌃⇧Space")
    CaptureKeyRouter.swift          owns both sources, conforms to CaptureKeySource, modes .inactive | .practice | .capture
  Onboarding/
    OnboardingCoordinator.swift     entry point sessionDidBegin(), window lifecycle, relaunch resume
    OnboardingMachine.swift         pure reducer, steps, outcomes, canContinue, canFinish
    OnboardingStore.swift           Codable state in UserDefaults key "onboarding.state"
    OnboardingWindow.swift          NSWindow host, 760x560, activation-policy hook
    OnboardingView.swift            left step list + right pane
    Steps/                          WelcomeStep, MicrophoneStep, SpeechStep, ScreenContextStep,
                                    CaptureKeyStep, OpenAtLoginStep, PracticeStep, DoneStep
    PracticeRecorder.swift          in-memory recorder, no client, no file I/O
  Main/Settings/                    CaptureKeyRow, ScreenContextRow, PermissionsSection, OpenAtLoginRow, AccountRow
FrictionTests/Permissions/, FrictionTests/Onboarding/, FrictionTests/CaptureKey/
```

Additive edits to shell files: `ActivationPolicy.swift` counts the onboarding window as a window; the pill's idle rendering reads `permissions.screenContext` to enter the existing `.screenContextPaused` state and pick hover text (no change to `PillState` cases); the menu bar menu enables "Pause screen context" and adds "Finish setup"; `DebugMenu.swift` gains items (below); the Settings placeholder view is replaced by the real rows. `project.yml` is untouched: KeyboardShortcuts is already linked, the audio-input entitlement and all three usage strings already exist, and SMAppService, AssetInventory, and CoreGraphics are system frameworks.

### Interfaces (Swift, consumed by phase 04 and by 02)

```swift
@MainActor @Observable final class PermissionsService {
  private(set) var snapshot: PermissionSnapshot          // mic, speechAuth, screenPreflight, loginItem
  private(set) var speechModel: SpeechModelState         // .checking | .notInstalled | .downloading(fraction: Double?) | .installed(TranscriberChoice) | .unavailable(language: String) | .failed(message: String)
  private(set) var screenContext: ScreenContextState     // .on | .off | .stopped | .waitingForGrant | .notAsked
  var captureReadiness: CaptureReadiness { get }         // .ready(screenContext: Bool) | .blocked([BlockReason])
  var transcriber: TranscriberChoice? { get }            // .speech(Locale) | .dictation(Locale)
  func refresh() async
  func requestMicrophone() async
  func requestSpeechRecognition() async
  func installSpeechModel() async
  func requestScreenCapture()                            // CGRequestScreenCaptureAccess on first call, deep link after
  func setScreenContextEnabled(_ on: Bool)
  func reportScreenCaptureFailure(_ error: any Error)     // 04's SCStream delegate
  func reportScreenCaptureRecovered()                    // 04, on a stream that starts cleanly
  func setOpenAtLogin(_ on: Bool) throws
  func open(_ pane: SettingsPane)                        // .microphone | .speechRecognition | .screenCapture | .loginItems
  func relaunch(reason: RelaunchReason)
}
enum BlockReason { case microphone, speechAuthorization, speechModel, noTranscriber, noCaptureKey }

@MainActor final class CaptureKeyRouter {
  enum Mode { case inactive, practice, capture }
  var mode: Mode                                         // onboarding sets .practice while step 7 is on screen
  func setCaptureHandler(down: @escaping () -> Void, up: @escaping () -> Void)   // 04 registers here
}

@MainActor final class OnboardingCoordinator {
  func sessionDidBegin()                                 // 02 calls after sign-in; the shell calls at launch for the sample person
  func showSetup(from: SetupEntry)                       // .menu | .settingsRunAgain | .relaunch
}
```

- `ScreenContextState.derive(preflight:everGranted:enabled:requestIssued:captureFailed:)`: `enabled == false` gives `.off`; preflight true and no reported failure gives `.on`; otherwise `everGranted` gives `.stopped`, `requestIssued` gives `.waitingForGrant`, else `.notAsked`. `everGranted` flips true the first time preflight is observed true and never flips back.
- `captureReadiness` is `.ready` only with mic authorized, speech authorized, model installed, a transcriber chosen, and a capture key set; `screenContext: true` only when `screenContext == .on`. Phase 04 must start the buffer only when readiness says so and must stop it when it changes.
- UserDefaults keys (per macOS user, which matches TCC's scope): `onboarding.state` (JSON: `version`, `currentStep`, `outcomes`, `relaunchPending`, `completedVersion`, `completedAt`), `permissions.screenContextEnabled`, `permissions.everGrantedScreen`, `permissions.screenRequestIssued`, and KeyboardShortcuts' own `KeyboardShortcuts_capture`.
- No routes, no schema changes, no Inngest events, no contract changes in this spec.
- Debug submenu additions: Show setup; Reset setup (clears `onboarding.*` and `permissions.*` keys); Simulate screen permission lapse (the probe reports preflight false until toggled off); Simulate SpeechTranscriber unavailable; Simulate Input Monitoring denied; Copy tccutil reset commands.

### Key flows

- **Microphone.** `AVCaptureDevice.authorizationStatus(for: .audio)`; `.notDetermined` then `requestAccess(for: .audio)`. Failure mode: a signed build without `com.apple.security.device.audio-input` returns denied with no prompt at all; the manual check below confirms the entitlement is in the signed binary.
- **Speech authorization and model.** `SFSpeechRecognizer.authorizationStatus()` then `requestAuthorization`. Then choose the module: if `SpeechTranscriber.isAvailable` and `await SpeechTranscriber.supportedLocale(equivalentTo: .current)` is non-nil, `SpeechTranscriber(locale:, preset: .progressiveTranscription)`; else `DictationTranscriber.supportedLocale(equivalentTo:)` with `.progressiveShortDictation`; else `.unavailable`. Read `AssetInventory.status(forModules:)` (`.unsupported`, `.supported`, `.downloading`, `.installed`). If not installed, `AssetInventory.assetInstallationRequest(supporting:)` (nil means installed) and `downloadAndInstall()`; progress from the request's `progress` (it conforms to `ProgressReporting`), observed as `fractionCompleted` every 250 ms and shown as a floored whole percent. Failure modes: `downloadAndInstall` throws (show failed, "Try again"); the system schedules its own retry after a failed attempt, so on relaunch a `.downloading` status is shown as "Downloading" and a fresh request is taken to regain a fraction (requests are consolidated, so calling again is safe); exceeding `maximumReservedLocales` throws (show failed with the system message). The app quitting mid-download is fine: the system owns the download.
- **Screen recording.** `CGPreflightScreenCaptureAccess()` for state; `CGRequestScreenCaptureAccess()` only when `screenRequestIssued` is false, then set it. macOS shows its alert once; later presses open the deep link instead. A grant usually needs a relaunch before capture works: `Relauncher` writes `relaunchPending = screenRecording` through `OnboardingStore`, launches the waiter, terminates. On launch, `OnboardingCoordinator` sees `relaunchPending`, clears it, refreshes, and opens the window at step 4 showing the new state. If preflight turns true without a relaunch, the step advances without one.
- **Deep links.** Primary `x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone` (and `?Privacy_SpeechRecognition`, `?Privacy_ScreenCapture`); if `NSWorkspace.open` returns false, fall back to `x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Privacy_ScreenCapture` (and siblings). Login items use `SMAppService.openSystemSettingsLoginItems()`.
- **Open at login.** `SMAppService.mainApp.register()` or `unregister()`; `status` is `.notRegistered`, `.enabled`, `.requiresApproval`, or `.notFound`. `kSMErrorAlreadyRegistered` counts as success. `.requiresApproval` shows the approval message.
- **Capture key, bottom-left.** Permission: `CGPreflightListenEventAccess()` for state, `CGRequestListenEventAccess()` to prompt (both macOS 10.15+, confirmed in the 26.2 SDK's `CGEvent.h`). Tap: `CGEvent.tapCreate(tap: .cgSessionEventTap, place: .headInsertEventTap, options: .listenOnly, eventsOfInterest:` flagsChanged, keyDown, leftMouseDown, rightMouseDown, otherMouseDown`)` added to the main run loop. A nil tap after preflight is true means a relaunch is needed (step 5's reopen path). The callback maps each event to `ModifierInput`: `flagsChanged` gives `.flags(keyCode, flags)`; key down gives `.otherKey`; any mouse down gives `.click`; `tapDisabledByTimeout` or `tapDisabledByUserInput` re-enables the tap with `CGEvent.tapEnable`. Key codes (HIToolbox `Events.h`): `kVK_Function` 0x3F with `maskSecondaryFn`, `kVK_Control` 0x3B (left) with `maskControl`; `kVK_RightControl` 0x3E is not the bottom-left key. A hold counts only when no other modifier flag is set. `ModifierHoldClassifier` emits `.down` on the bound key going down alone, `.interrupted` on `.otherKey`, `.click`, or another modifier while it is down, and `.up` on release. During step 5's learning state the classifier accepts fn or left Control and reports which one was held for 300 ms, and `.wrongKey` for anything else.
- **Capture key, fallback.** `extension KeyboardShortcuts.Name { static let capture = Self("capture", initial: .init(.space, modifiers: [.control, .shift])) }`. The recorder is `KeyboardShortcuts.Recorder("Capture key:", name: .capture)`; "Use ⌃⇧Space" calls `KeyboardShortcuts.reset(.capture)`. The fallback listens only while the binding is `.shortcut`; the tap exists only while the binding is `.fn` or `.leftControl`.
- **Routing.** `CaptureKeyRouter` holds the only listener for whichever source is bound and forwards `CaptureKeyEvent`s by `mode`: `.practice` while step 7 is visible, `.inactive` when readiness is blocked, `.capture` otherwise.
- **Verify on the first signed build:** whether a long hold of 🌐 also fires macOS's "Press 🌐 key to" action on release (if it does, step 5 adds "Holding 🌐 also [action] when you let go. To stop that, set Press 🌐 key to Do Nothing in Keyboard settings." with **Open Keyboard Settings**); whether `flagsChanged` still reaches the tap while Secure Keyboard Entry is on (Terminal, password fields); the Input Monitoring deep link (`x-apple.systempreferences:com.apple.preference.security?Privacy_ListenEvent`); whether the grant needs a relaunch. Record results in Engineering Notes.
- **Practice.** On key down: record the input device name, start `AVAudioEngine`, convert with `SpeechAnalyzer.bestAvailableAudioFormat(compatibleWith:)`, feed an `AsyncStream<AnalyzerInput>`, show "Listening" on the first buffer, render volatile results. If `screenContext == .on`, take one screenshot at key down with ScreenCaptureKit excluding our own app via `SCContentFilter(display:excludingApplications:exceptingWindows:)`. On key up: `finalizeAndFinishThroughEndOfInput()`, show the review card. Everything lives in memory in `PracticeRecorder` and is dropped when the step closes. `PracticeRecorder` takes no `FrictionClient` and has no file I/O by construction. Failure modes: engine start fails (show "Couldn't start the microphone. Check that a microphone is connected." and stay on the step); the model is missing (the waiting copy); the screenshot fails (omit the screenshot row, no error text).
- **Lapse.** Every refresh re-derives `screenContext`. A transition from `.on` to `.stopped` updates the pill, menu, and Settings at once. 04 calls `reportScreenCaptureFailure` from `stream(_:didStopWithError:)`; 04 calls `reportScreenCaptureRecovered` on a clean restart.

### Sources for load-bearing API claims

- `AssetInventory.assetInstallationRequest(supporting:)`, `downloadAndInstall()` (with the system's retry after failure and request consolidation), `status(forModules:)` and its four cases, `maximumReservedLocales`: Context7 `/websites/developer_apple_speech`, plus Apple doc JSON for `AssetInventory` and `AssetInventory.Status` (checked 24 Sep 2026). `AssetInstallationRequest` conforms to `ProgressReporting`: Apple doc JSON for `AssetInstallationRequest` "Conforms To".
- `SpeechTranscriber.isAvailable` (static), `supportedLocale(equivalentTo:)` (async), `Preset.progressiveTranscription`; `DictationTranscriber.supportedLocale(equivalentTo:)`, `Preset.progressiveShortDictation`, no `isAvailable`: Apple doc JSON for both classes. The fallback recommendation is from the `SpeechTranscriber` overview via Context7.
- `SMAppService.mainApp`, `register()` errors, `status` cases, `openSystemSettingsLoginItems()`: Context7 `/websites/developer_apple_servicemanagement` plus Apple doc JSON for `SMAppService.Status`.
- `CGPreflightScreenCaptureAccess` and `CGRequestScreenCaptureAccess` exist since macOS 10.15: Apple doc JSON. "Alert shows once, relaunch usually needed": research Part 3 section 8, **unverified on 26.x and 27**.
- `KeyboardShortcuts.Recorder(_:name:)`, `Name(_:initial:)`, `reset(_:)`, `setShortcut(_:for:)`, the recorder's conflict warning: Context7 `/sindresorhus/keyboardshortcuts`. `CGPreflightListenEventAccess`, `CGRequestListenEventAccess`, `kCGEventTapOptionListenOnly`, `kCGEventFlagMaskSecondaryFn`: MacOSX26.2 SDK `CGEvent.h` and `CGEventTypes.h`. `kVK_Function`, `kVK_Control`, `kVK_RightControl`: SDK `HIToolbox/Events.h`. No Info.plist usage string exists for Input Monitoring as far as the research found (**unverified**); the system prompt uses its own text. `events(for:)` giving `.keyDown` and `.keyUp`: research Part 3 section 2 (Context7).
- `AVCaptureDevice.authorizationStatus(for:)` and `requestAccess(for:completionHandler:)`: Apple doc JSON.
- Speech authorization: Apple's "Asking permission to use speech recognition" says the authorization process applies to the server-based recognizer and that the new transcriber modules do not send audio to Apple. Whether SpeechAnalyzer modules still require the grant on macOS 26 is **unverified**; see Open decisions.
- Monthly "bypass the system private window picker" alert with "Allow For One Month", and the always-on screen recording indicator: research Part 3 section 4 (9to5Mac, Apple forums, derflounder), **verify wording on 26.x**. Deep link forms: research Part 3 section 8, **unverified on 26 and 27**. The Login Items notice on `register()`: **unverified**.

### Tests (each seen failing before it is trusted)

Unit tests drive the public APIs (`OnboardingMachine.reduce`, `ScreenContextState.derive`, `PermissionsService` over `FakePermissionProbe`, `CaptureKeyRouter`, `PracticeRecorder`) and assert whole values.

1. Given mic `.denied`, when the machine is on `.microphone`, then `canContinue` is false and `canFinish` is false. Mutation: treat `.denied` as satisfied in `canContinue`; the test fails naming the step.
2. Given the screen step is skipped with mic, speech, model, and key satisfied, then `canFinish` is true and `outcomes[.screenContext] == .skipped`. Mutation: require screen `.on` for finish.
3. Given "Continue without voice" is confirmed, then outcomes are exactly `{speech: .skipped, screenContext: .skipped, captureKey: .skipped, practice: .skipped}` and `currentStep == .openAtLogin`. Mutation: leave practice pending.
4. Relaunch resume: reduce to `.screenContext` with `relaunchPending = .screenRecording`, save through `OnboardingStore` into an isolated `UserDefaults(suiteName:)`, load into a new coordinator with a fake probe reporting preflight true; the loaded state `== (currentStep: .screenContext, outcomes[.screenContext]: .satisfied, relaunchPending: nil)`. Mutation: have the store write only on `finish`; the test fails on `currentStep`.
5. `ScreenContextState.derive` table covering all five results, including `(preflight: false, everGranted: true, enabled: true) == .stopped` and `(preflight: true, captureFailed: true) == .stopped`. Mutation: drop `everGranted` from the derivation; the lapse row fails.
6. Transcriber choice: fake probe with `speechTranscriberAvailable = false` and a supported dictation locale gives `transcriber == .dictation(en_US)`; with both locales nil, `captureReadiness == .blocked([.noTranscriber])`. Mutation: always choose `.speech`.
7. Model progress copy: fraction 0.349 gives exactly "Downloading the English (United States) speech model, 34%". Mutation: round instead of floor (shows 35%).
8. Practice sends nothing: run a full practice with a fake audio source and a recording `URLProtocol` registered for every session; afterwards the recorder's request list is empty and the Outbox directory under a temporary Application Support root has no entries. Mutation: have practice finish call the client's send; the test fails with the recorded URL.
9. Router: in `.practice`, a key down reaches the practice sink and the capture handler's counter stays 0; in `.inactive`, neither receives it. Mutation: forward to the capture handler whenever it is registered.
10. Version bump: a stored `completedVersion` of 1 with current version 2 makes `sessionDidBegin()` open setup at the first unsatisfied step; the same version keeps it closed. Mutation: compare with `<=`.
11. Bottom-left hold: fn down alone, 300 ms pass, gives `.down` for `.fn`; fn down then `.otherKey` at 100 ms gives `.interrupted` (fn plus an arrow); left Control down then `.click` gives `.interrupted` (Control-click); right Control (0x3E) gives `.wrongKey`; left Control with Command flag set gives no `.down`. Mutation: drop the other-modifier check; the Control-Command test fails naming "expected none, got down(leftControl)".
12. Nothing typed is read: `ModifierHoldTap.map` over a key-down event for "a" and one for "b" returns the identical `.otherKey` value. Mutation: carry the key code into `.otherKey`; the equality fails.
13. Declining Input Monitoring binds the fallback: with the fake probe denying listen access, completing step 5 by **Use a key combination instead** gives `binding == .shortcut` and `CaptureKeyDisplay.name == "⌃⇧Space"`. Mutation: default the binding to `.fn`; the test fails on the display name.

Manual verification (signed Developer ID build, because TCC grants are tied to the code signature; ad hoc builds lose grants on every build):
- Reset before each pass: `tccutil reset ListenEvent systems.onc9.friction`, `tccutil reset Microphone systems.onc9.friction`, `tccutil reset SpeechRecognition systems.onc9.friction`, `tccutil reset ScreenCapture systems.onc9.friction` (or `tccutil reset All systems.onc9.friction`), then Debug "Reset setup". Login items: remove Friction in System Settings, Login Items. Never `sfltool resetbtm` on a daily-driver Mac: it resets every app's background items.
- `codesign -d --entitlements - <Friction.app>` lists `com.apple.security.device.audio-input`.
- Walk every step on macOS 26.x: allow, deny, deny then allow in System Settings and return (live flip), screen grant with our relaunch and with macOS's own Quit & Reopen, skip screen, clear the key, login item on and off.
- Revoke screen recording in System Settings while the app runs: the pill shows the stopped state within 60 seconds, or at once on hover.
- Record the exact monthly alert text and the indicator appearance on 26.x in Engineering Notes and correct the step 4 copy if it differs.
- Run once on macOS 27 before first customers (deep links, preflight behavior).

### Rollout

The change is local to the Mac app. Existing shell installs (developers only) see setup at next launch because no `completedVersion` exists. TCC grants and the login item persist across updates while the Team ID and bundle id stay the same. Rollback is reverting the commits; the orphaned `onboarding.*` and `permissions.*` UserDefaults keys are harmless. Coordination: 04 ships `ShortcutKeySource` behind its `CaptureKeySource` protocol so it can build first; this spec's `CaptureKeyRouter` conforms to that protocol and replaces it at merge, recorded in Engineering Notes. 02 calls `OnboardingCoordinator.sessionDidBegin()` after sign-in.

### Open decisions

- **Buffer length in the copy.** product.md leaves the rolling buffer length open. Default: 30 seconds, one constant `ScreenBuffer.lengthSeconds` shared with 04, interpolated into every string that names it.
- **Can the employee turn the buffer off entirely?** Also open in product.md. Default: yes. Setup's skip, the Settings toggle, and the menu pause all turn it fully off (voice only). A middle "screenshot at press, no clip" mode is not built in this phase.
- **Speech recognition prompt.** Apple's docs suggest SpeechAnalyzer modules may not need the grant. Default: request it (the DictationTranscriber fallback and the shell's usage string assume it). If the build proves SpeechTranscriber runs without it, record that in Engineering Notes and drop the prompt for that path.
- **Open at login default.** Default: toggle on, applied only when the employee presses Continue.
- **Setup reopening at next launch when closed mid-way.** Default: yes, once per launch, plus the "Finish setup" menu item; no other reminder.
- **Monthly alert timing.** Whether the first "Allow For One Month" alert lands during setup (practice screenshot) or later when 04 starts the buffer is unverified. Default: do not force it; the copy prepares the employee either way.

---

## Sessions

- 2026-09-24: Initial spec · `claude -r cf097e99-94f3-4cce-9596-642e0c0c18b8`
- 2026-09-24: Capture key decided (hold the bottom-left key through Input Monitoring, fallback ⌃⇧Space); 01 gains the build reference `01-shell.docs.md` and Granola layout from `osis/references/granola/`
