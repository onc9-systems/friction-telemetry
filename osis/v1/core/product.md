# friction-telemetry v1 Product

This document defines what friction-telemetry is and how it behaves in v1. It describes intent, not code. For what exists in code today, read `osis/twin.md`.

## Definition

friction-telemetry tells an organization where its change initiatives break, in the moment they break, from the people who hit the break.

Organizations roll out new systems and processes constantly: a new ERP, a new approval chain, a new way to log hours. Leaders learn how the rollout went weeks later, from surveys and retros. By then memory is weak and people have rationalized their workarounds.

friction-telemetry puts a button on every employee's screen. When something breaks, the employee presses it, says what happened, reviews the screen context, and sends it. When they are unsure, they open a chat and ask about the initiative. Both actions get an answer immediately, drawn from the initiative's documents. Both feed one signal pool.

Every flag and every question is signal, whatever its answer. When the documents already covered it, the fact that the employee did not know is itself the finding: the rollout failed to reach them. Across an organization this is signal collection at scale, one press at a time.

Leaders declare each initiative and the theses beneath it. They see which theses hold and which break, with the evidence attached. When a problem gets fixed, the people who reported it hear about it.

The employee is the first customer. The tool must be useful to the person pressing the button, or nobody presses it, and the organization gets no signal.

## The Analogy

Think of the Tesla Autopilot report button, then add Granola's model on top.

The Tesla button captures a problem at the moment it happens, with the machine state attached, at the cost of one press. Granola is a personal tool first: it improves your own meetings, you own your notes, and the organization's value comes later. friction-telemetry combines both. The press costs nothing. The employee gets help right away. The organization-wide map of friction comes from many individual presses.

The analogy breaks at one point, and the break is deliberate. Tesla records the car continuously and silently. friction-telemetry never sends anything the employee has not seen and approved.

## Core Concepts

| Concept | Definition |
|---|---|
| Initiative | A declared change: what is changing, who it affects, why, and the documents that explain it. The spine of the product. Every other object belongs to one. |
| Thesis | A falsifiable statement a leader makes about an initiative. Example: "Buyers can raise a PO without calling finance." Friction is scored against theses. |
| Flag | One friction report from one employee: a voice note, its transcript, and the screen context the employee approved. The verb is "flag". |
| Question | One message an employee sends in the chat about an initiative. Questions are signal too: repeated questions show where rollout communication failed. |
| Answer | The immediate reply to a flag or a question, grounded in the initiative's documents and in what was on screen. |
| Resolution class | Every flag and question receives one of three classes. **Answered**: the documents cover it (a communication gap). **Unanswerable**: the documents do not cover it (a process gap). **Still stuck**: the documents cover it and the employee is still blocked (the documents are wrong). |
| Q&A | An initiative's shared record of questions and answers. Aggregate and anonymous: each entry is a canonical question written from a cluster or by an owner, never an employee's own words, and published only when an owner approves it. Q&A is searched alongside the documents, so an owner's answer reaches the next person instantly. |
| Cluster | A group of flags and questions that describe the same problem. Clusters form automatically. Employees never browse or vote on them. |
| Insight | A finding for leaders, built from one or more clusters, tied to the theses it supports or breaks, with evidence attached. |
| Owner | The person accountable for acting on an insight. |
| Fix | An owner's record that the problem behind an insight is resolved. A fix notifies every employee who flagged or asked about it. |
| Health | An initiative's composite state. Always shown with its components visible, never as a bare number. |

## Structure

One macOS app with two surfaces. The same account opens both. Permissions decide what each person sees.

```
friction-telemetry (macOS app)
  Worker surface          every employee
    Pill                  floating, follows the user across apps
    Capture               hold to talk, review, send
    Home window           my flags, my questions, their outcomes, chat, Q&A
  Initiative surface      leaders (extra permission)
    Initiatives           declare, write theses, attach documents, assign people
    Insights              clusters and insights against theses, with evidence
    Health                per-initiative state with its components

Service                   shared by both surfaces
  Receives flags and questions, stores evidence, answers, routes
  Analysis seam           triage, clustering, thesis scoring, insight generation
```

A leader is also an employee. Leaders have the pill too, and their flags enter the same pool.

The macOS app is the v1 surface for demos and first customers. A Windows client follows once contracts justify it. It uses the same service and the same concepts.

## Flow

The dominant flow is the flag.

1. The employee hits friction inside any app.
2. They press the pill, or hold the capture key, and describe the problem aloud.
3. They release. The app shows exactly what will send: the transcript, a screenshot, a short screen clip, and the active app names.
4. The employee removes or redacts anything they choose, then sends.
5. Within seconds, the app returns an answer and a resolution class. If others hit the same problem, it says how many: "23 others hit this."
6. If the class is unanswerable or still stuck, the flag routes to the initiative's owner.
7. The flag joins a cluster. The cluster feeds an insight, scored against the initiative's theses.
8. A leader sees the insight on the initiative surface and assigns an owner.
9. The owner ships a fix and records it. Where the documents were wrong, the owner corrects them.
10. Every employee who flagged the problem receives a notice that it is fixed.

The question flow is the same loop, started from the chat instead of the pill.

The leader flow starts earlier. A leader creates an initiative, writes its theses, attaches its documents, and names the people it affects. From that point, every flag and question from those people is scored against it.

## Flow Catalogue

Every v1 flow, grouped by who starts it. Numbers are stable references for specs and tickets.

### A. Setup

1. **Workspace setup.** An admin creates the organization, connects sign-in (SSO or invites), imports the people directory, and grants leader permission.
2. **Employee install.** The employee downloads the app, signs in, and grants the macOS permissions it needs (microphone, speech recognition, screen recording). The capture key is the bottom-left key of the keyboard, held on its own; onboarding asks the employee to hold it, then has them try a flag. Hearing that key needs the Input Monitoring permission, and Friction uses it only to notice that key. An employee who declines uses a key combination instead, which needs no permission. Screen recording is optional: without it, flags send voice and transcript only. The on-device screen buffer is explained before it starts.

### B. Leader: initiatives

3. **Create initiative.** The leader states what is changing, who it affects, and why; writes theses; attaches documents; names affected people and owners; publishes. Publishing opens the initiative's search index and an empty Q&A.
   - **3a. Document upload and indexing.** Each uploaded document is stored, its text extracted, split into passages, embedded, and indexed under the initiative. The leader sees each document move through processing to ready or failed. An initiative cannot go live until at least one document is ready.
4. **Edit initiative.** Theses, people, and owners change. Replacing a document reindexes it; removing one removes its passages from search.
5. **Close initiative.** The initiative is archived. Chat and flagging for it stop; its evidence and insights stay readable.

### C. Employee: flagging and asking

6. **Flag.** Press or hold, speak, release, review, redact, send (the dominant flow above). The flag runs through the answer pipeline (flow 8). A flag sent without a connection waits on the Mac and sends when the connection returns, still exactly as the employee approved it.
7. **Question.** A chat message about an initiative the employee belongs to. Same answer pipeline.
   - **7a. Follow-up.** The employee replies to any answer, from a flag or a question. The reply stays in that initiative, is answered with the conversation so far as context, and counts as its own signal.
8. **Answer pipeline.** Shared by flags and questions. Three things start at once:
   - A fast judgment of which initiative the event belongs to, when the employee belongs to more than one.
   - A fast judgment of whether the initiative's documents and Q&A are likely to cover it.
   - Retrieval of the most relevant passages from the documents and Q&A.

   When the fast judgment is confident the answer is not covered, the app says so early, framed as provisional, while retrieval finishes. Retrieved passages are then judged one by one: does this passage answer it? If one does, the app writes a cited answer and the class is **Answered**. If none does, the class is **Unanswerable** and the event routes to the owner. The answer arrives in seconds; everything after it (storing evidence, routing, clustering) happens behind it.

   An Answered event is still signal. It records that the employee did not know what the documents already said.
9. **Still stuck.** From any answer, the employee says it did not solve the problem. The class becomes **Still stuck**, the event routes to the owner, and the cited documents are marked suspect.
10. **Browse Q&A.** The employee reads the Q&A of the initiatives they belong to.
11. **My record.** The home window: my flags and questions, each with its answer, class, count, and outcome.
12. **Local screen buffer.** A rolling buffer on the Mac supplies the clip in a capture. It never leaves the device except inside a flag the employee sends.

### D. Analysis seam

Built last, behind one interface. Runs after the answer, never in its path.

13. **Clustering.** Flags and questions that describe the same problem group into clusters.
14. **Thesis scoring and insight generation.** Clusters become insights tied to the theses they support or break, with evidence and the resolution-class split.
15. **Q&A drafting.** Clusters of questions produce draft canonical questions for the owner to answer and approve.
16. **Health.** Each initiative's health recomputes as evidence arrives, with every component kept.

### E. Leader and owner: acting

17. **Review insight, assign owner.** A leader reads an insight against its thesis and names the owner.
18. **Owner answers.** The owner answers an unanswerable question or a drafted Q&A entry and approves it. The entry publishes to the initiative's Q&A, becomes searchable at once, and everyone who asked it is told.
19. **Owner corrects a document.** The owner uploads a corrected version. It reindexes (3a) and the suspect mark clears.
20. **Record fix.** The owner marks the problem behind an insight resolved.
21. **Fix notice.** Every employee who flagged or asked about the problem receives a notice in their home window.

## Loop

- **Trigger**: the employee is stuck or unsure.
- **Action**: one press and a sentence, or one question.
- **Reward**: an answer now. Later, a notice that the problem got fixed.
- **Investment**: each flag improves the answers for the next person, because owner answers publish to the Q&A and corrections flow back into the documents.
- **Recurrence**: the chat gives employees a reason to open the app on an ordinary day, not only on a bad one.

## UX / Surfaces

The worker surface takes its interaction model from the Granola desktop app. The initiative surface takes its model from Linear's initiatives and projects.

| Surface | Purpose | Key elements |
|---|---|---|
| Pill | One-press entry to a flag from anywhere on the desktop | Small floating control, follows the active screen, shows recording state, never covers work |
| Capture review | The employee decides what leaves the machine | Transcript, screenshot, clip, app list, remove and redact controls, send |
| Home window | The employee's own record | List of my flags and questions, each with its answer, class, cluster count, and outcome |
| Chat | Ask about an initiative | Scoped to the initiatives the employee belongs to, answers cite the documents and Q&A |
| Q&A | Read what others have already asked | Canonical questions and owner answers per initiative, no names, no verbatim employee text |
| Initiatives | Declare and manage change | Initiative list, detail with theses, documents, affected people, owners |
| Insights | See where theses break | Insights grouped by thesis, evidence per insight, resolution-class split, owner and fix state |
| Health | Judge an initiative at a glance | Composite with every component shown beside it |

## Behavioral Rules

**Always:**
- Show the employee everything that will leave the machine, before it leaves.
- Let the employee remove or redact any part of a capture.
- Answer every flag and every question immediately, even when the answer is "this goes to the owner".
- Keep screen history on the device. The rolling screen buffer never leaves the Mac unless the employee sends a flag that includes it.
- Tell employees when a problem they flagged gets fixed.
- Show the components of every health score.
- Attribute flags to the employee privately. Leaders see clusters and evidence without names.
- Count every flag and question as signal, including those the documents already answered.
- Keep Q&A aggregate and anonymous: canonical questions only, published on owner approval.

**Never:**
- Start a conversation, interrupt, or suggest anything the employee did not ask for.
- Capture or send anything silently.
- Act on the employee's behalf in other apps.
- Rank, score, or report on individual employees.
- Show a leader which person sent a flag.

## Boundaries

friction-telemetry is not employee monitoring. It records nothing the employee did not choose to send, and it cannot be configured to.

It is not a survey or engagement tool. It captures problems in the moment, attached to a declared initiative, and does not ask how people feel.

It is not a helpdesk. It routes problems to an owner and records the fix. It does not manage tickets, queues, or service levels.

It is not a proactive assistant. It speaks only when spoken to.

v1 runs on macOS only.

## Open questions

- Anonymity threshold: the minimum cluster size before leaders can see a cluster's evidence. Owner: Andrés.
- Rolling buffer length and whether the employee can turn the buffer off entirely. Owner: Andrés.
- The pull interview, where a leader asks for depth on a hot spot: in v1 or later. Owner: Andrés.
- Whether an employee can choose to attach their name to a flag so the owner can follow up. Owner: Andrés.
- Whether publishing an initiative sends affected employees a one-time notice, or they discover it when they open chat. The notice bends the never-initiate rule. Owner: Andrés.
- Whether an employee can withdraw a flag after sending it. Owner: Andrés.

---

*23 September 2026*

---

## Sessions

- 2026-09-25: Added flow 7a, follow-ups (Devin session)
- 2026-09-23: Added the flow catalogue (21 flows), Q&A concept, signal-regardless-of-class rule · `claude -r cf097e99-94f3-4cce-9596-642e0c0c18b8`
