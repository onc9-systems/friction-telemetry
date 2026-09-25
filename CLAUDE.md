# friction-telemetry

Friction telemetry for organizations in the middle of a change. A native macOS app (worker pill + initiative surface) backed by one service. Read `osis/v1/core/product.md` before any product work.

## Layout

- `apps/mac/`: the macOS app, Swift and SwiftUI. Both surfaces live in this one app. The Xcode project is generated from `project.yml` with xcodegen and is not committed.
- `apps/api/`: the service, a Cloudflare Worker. Receives flags and questions, stores evidence, answers, routes.
- `packages/contracts/`: the shared data contracts between the app and the service. One definition per concept, named exactly as in `product.md`.

The analysis layer (triage, clustering, thesis scoring, insight generation) is a single seam behind one interface in `apps/api`. Everything else is built for real. Do not build the analysis until Andrés says so.

## Conventions

- Concept names come from the Core Concepts table in `product.md`. Initiative, Thesis, Flag, Question, Answer, Resolution class, Cluster, Insight, Owner, Fix, Health. Do not introduce synonyms.
- Worker surface UX follows the Granola desktop app. Initiative surface UX follows Linear initiatives and projects. Pull real reference screens (Mobbin) before designing a screen.
- The behavioral rules in `product.md` are invariants. Nothing leaves the Mac without the employee seeing it first.
- Signing: Team `P62A3QS593`, identity `Developer ID Application`. See the global CLAUDE.md for notarization.
- Package manager: bun. Monorepo: turbo.
- Worker surface references: real Granola screens are in `osis/references/granola/`, with notes on what to take from each.

## Build sessions

- **Context7 before every library call you write.** Query Context7 before using any library, SDK, framework, or CLI API (Hono, Inngest, Drizzle, Zod, Wrangler, Neon, better-auth, KeyboardShortcuts, EventSource, Sparkle, AppKit, SwiftUI, Speech, ScreenCaptureKit). Training memory is not a source. Where a spec has a build reference (`{spec}.docs.md`), start there and query Context7 for anything it does not cover. Cite the Context7 library ID in the spec's Engineering Notes for every load-bearing API choice.
- **Surface important decisions to Andrés before making them.** A decision is important when the spec, the brief, and the build reference do not settle it and it would:
  - change a contract, the schema, a route, the window model, or a shell file non-additively;
  - change what the product does or says (behavior, UI copy, permissions, what leaves the Mac);
  - add a dependency or a paid service;
  - depart from the spec because the docs disagree with it.

  Stop and ask with the options and a recommendation, then continue on the answer. Decide smaller implementation choices yourself and list them in the spec's Engineering Notes.
- Infra already exists (Neon, Hyperdrive, R2, Inngest keys). IDs are in the brief's Shared Decisions and secrets in `~/.secrets`. Do not create more.

## Product Knowledge

Product context lives in the `osis/` directory. Consult these before making product decisions or significant changes:

- `osis/twin.md`: agent-readable operational map of the product
- `osis/manifesto.md` (if present): product declaration
- `osis/v1/thesis.md` (if present): current version hypothesis
- `osis/v1/core/product.md`: current version definition
- `osis/v1/core/{iteration}/brief.md` (if present): current iteration bet

Active version: `v1`. Say "osis" to consult the product expert.
