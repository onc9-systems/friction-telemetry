# Granola desktop reference (captured 24 September 2026)

Screens from Andrés's own Granola desktop app on macOS, dark appearance. The worker surface follows Granola (`CLAUDE.md`, `01-shell.impl.md`). This file says what each screen shows and what Friction takes from it. Where Friction deliberately differs, it says so.

## The screens

| File | What it shows |
|---|---|
| `01-home-sidebar.png` | Home with the sidebar open |
| `07-home-sidebar-collapsed.png` | The same Home with the sidebar collapsed |
| `02-new-note-recording.png` | A note while recording: title, property chips, bottom control bar |
| `05-new-note-paused.png` | The same note, recording paused |
| `04-transcript-sheet-paused.png` | The transcript sheet raised over the note |
| `03-floating-pill.png` | The floating pill at the right edge of the desktop |
| `06-draft-modal.png` | An AI-drafted email in a modal over Home |

## Patterns, and what Friction takes

### Window chrome
- Traffic lights, then a sidebar toggle and a search icon in the title bar. No visible title text.
- Top right: outlined pill buttons ("Invite", "+ New note").
- **Friction:** same title bar. Sidebar toggle and search in the title bar. One outlined pill button at top right for the surface's main action ("New initiative" on Initiatives). No button on worker surfaces in this phase.

### Sidebar
- Top: primary navigation with line icons ("Home", "Shared with me", "Chat"). The selected row gets a filled, rounded, slightly lighter background.
- Middle: a section header ("Spaces") over a list of folders, each with its own icon.
- Bottom: a row of three small icon buttons, a hairline, then the workspace switcher (logo, "ONC9", up-down chevron).
- **Friction:** worker items at top (Home, Ask, Q&A). The initiative section is a section header over its items, styled like "Spaces". The organization ("Acme Logistics") and the signed-in person move to the **bottom** switcher row. Settings is one of the small icon buttons above it.

### Home
- A centered content column (about 950 pt wide at a 1300 pt window), the same width with the sidebar open or collapsed.
- A large serif page heading ("Coming up") with small previous and next chevrons on the right.
- Cards: rounded (about 16 pt), one step lighter than the background, rows split by dashed hairlines. Big serif numerals for day numbers, a thin colored bar before each event.
- A list grouped by day ("Today", "Yesterday", "Tue, Sep 22") with small, muted group headers. Each row has a 40 pt rounded-square icon tile, a medium-weight title, a muted second line, and on the right small source icons and the time ("4:30 PM", with the AM/PM in small caps).
- A floating "Ask anything" composer capsule pinned to the bottom of the column. The list scrolls under it.
- **Friction:**
  - Home uses the centered column and a serif heading.
  - The pinned fix notice is a card in this style.
  - Record rows use the 40 pt tile (flag or question glyph), the employee's words as the title (wrapped, never cut), and a muted second line with the initiative, class and "23 others". The outcome and time sit on the right.
  - Home gets the bottom "Ask anything" capsule. Sending from it opens Ask with the question.

### Note while recording (`02`, `05`)
- A serif title placeholder ("New note"), a pill of property chips ("Today", "Me"), and a circular add-to-folder button.
- A bottom control capsule: red animated dots while recording, a chevron that raises the transcript, and a stop square. When paused it shows a level icon, a chevron, and "Resume" in green.
- A notice chip above the controls: "Always get consent when transcribing others ›".
- **Friction:** the notice chip is the model for "Leaders see this without your name." in the capture review panel. The recording control is the model for the pill's Recording state: red dots, not a single red dot.

### Transcript sheet (`04`)
- A large rounded sheet rising from the bottom of the window. Its header has search on the left and thumbs down, copy and minimize on the right. Its state is centered ("Transcript Paused").
- A light strip for the consent notice with an inline "Learn more ›".
- Footer: microphone level with a chevron, "Resume", a settings icon, and a language picker.
- A line under the sheet: "Granola uses AI and can make mistakes."

### Floating pill (`03`)
- A **vertical** capsule, about 44 by 88 pt, dark and slightly translucent, with a hairline border and soft shadow. The Granola glyph sits on top and three green activity dots below.
- It hugs the right edge of the screen.
- **Friction:** idle and listening use this vertical shape: glyph on top, status below (three dots while listening). States that need words (Recording with transcript, Processing, Discarded) grow leftward from the edge into a horizontal card. The pill still never pulses to ask for attention.

### Draft modal (`06`)
- A dimmed scrim over the window and a centered modal with a large corner radius.
- Header: source icon, serif title, then thumbs up and thumbs down, a divider, more, and close.
- A collapsed context row: a bordered field with the quoted source, snippet and date, and a disclosure chevron.
- A recipient row of removable chips (avatar, name, x).
- An editable body. AI-inserted text is tinted, and unresolved placeholders render as chips ("[attach: updated proposal v2]").
- A notice strip with an info icon, the message, and an outlined inline action ("You already emailed this recipient." with "Discard").
- Footer: "Send ⌘↩" as the primary button and "Copy" outlined on the left; "Rewrite", attach and delete on the right. The AI disclaimer line sits under the modal.
- **Friction:** this is the layout for the capture review panel.
  - Serif title "This will be sent" with the initiative chip.
  - Items as rows with remove buttons.
  - The anonymity line as a notice strip.
  - Footer primary "Send 4 items ⌘↩" and outlined "Discard" (Esc).
  - **Send is ⌘↩, not Return**, because the transcript is multi-line and Return must add a new line.

## Deliberate differences

- **No suggested prompts.** Granola's composer carries a "List recent todos" chip. Friction's spec forbids suggested prompts and follow-up chips, so the Ask composer has none.
- **No truncation.** Granola cuts off the context row in the draft modal ("...US..."). Friction never cuts text; rows wrap and grow.
- **No thumbs up or down** on answers. Friction has one action, "This didn't solve it", which records Still stuck.
- **Type.** Granola's serif is its own. Friction uses New York, the macOS system serif (`.fontDesign(.serif)`), for page and panel titles, and SF for everything else.
