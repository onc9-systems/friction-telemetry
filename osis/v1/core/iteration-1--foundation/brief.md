# Foundation Brief

**Version:** v1
**Date:** 24 September 2026
**Status:** active

## Signals

- The repo is a scaffold: `apps/mac`, `apps/api`, and `packages/contracts` hold only `.gitkeep`. No git remote exists yet.
- `core/product.md` now carries a Flow Catalogue of 21 numbered flows across two surfaces and one service.
- The research in `osis/inbox/2026-09-23--flows-research.md` resolved the stack for every flow and surfaced the platform constraints (macOS 26 minimum for on-device transcription, permanent screen-recording indicator, monthly screen-recording re-approval, Jev rate limit, PPTX extraction gap).
- Andrés wants one build session per functionality, each in its own git worktree, and the analysis seam (flows 13 to 17) built the following day.
- Parallel worktrees that each edit `project.yml`, the contracts, the database schema, and the Worker router collide on merge.

## Insight

The product is a set of feature slices that all meet at the same few seams: the Mac app's window and panel structure, the data contracts, the database schema, the Worker router, and the Inngest client. If those seams exist before any feature, each feature session only adds files inside its own slice and merges cleanly. If they do not, every session invents its own version of them and the merges become the work.

## Bet

Build the complete shell first: every surface present and navigable with sample data, every contract typed, the full schema migrated, every route stubbed, Inngest synced to Inngest Cloud, and the streaming answer contract working end to end against a stub. Then build each functionality in its own worktree session against those seams.

The bet is right if feature sessions 02 to 08 merge without reworking shell files beyond additive changes. It is wrong if a feature session has to restructure the app's window model, rename a contract, or rewrite the schema.

## What Changes

| Area | Before | After |
|---|---|---|
| Mac app | Empty folder | A signed macOS app: floating pill, capture review panel, main window with the worker and initiative surfaces, all populated with sample data. After the iteration, real capture, answers, initiatives, Q&A, and fix notices. |
| Service | Empty folder | A Cloudflare Worker with every flow's route, the streaming answer, document indexing, and the owner loop, backed by Neon and Inngest Cloud. |
| Contracts | Empty folder | One definition per Core Concept, shared by both sides, with fixtures that both the TypeScript and Swift tests decode. |
| Delivery | No remote | `onc9-systems/friction-telemetry` on GitHub; the Worker deploys on push to `main`. |

## What Doesn't Change

- The analysis seam (flows 13 to 17: clustering, thesis scoring and insight generation, Q&A drafting, health, insight review and owner assignment) is not built in phases 01 to 08. It lands in phase 09 the following day. Until then the seam is one interface with a no-op implementation, and insights exist only as seeded rows.
- No Windows client.
- No system notification banners, ever, in this iteration.
- No proactive behavior of any kind: the app never initiates.
- The behavioral rules and trust rules in `core/product.md` are untouched and binding on every phase.

## Shared Decisions

- Monorepo: bun 1.3 workspaces with turbo. `apps/mac`, `apps/api`, `packages/contracts`.
- Mac app: Swift 6, SwiftUI with AppKit panels, macOS 26.0 minimum, xcodegen (`project.yml` committed, `.xcodeproj` generated and ignored). Not sandboxed. Hardened runtime. Signed `Developer ID Application`, Team `P62A3QS593`.
- Mac app shape: a background (menu bar) app with the floating pill panel, one main window holding both surfaces in a Granola-style sidebar, and the capture review panel. Permissions decide whether the initiative section of the sidebar shows.
- Mac packages, all declared in the shell's `project.yml` so later phases do not edit it for dependencies: KeyboardShortcuts 3.x (the shortcut fallback for the capture key, no permission needed), mattt/EventSource 1.5.x (SSE over POST), Sparkle 2.10.x (updates, gentle reminders only).
- Capture key (decided 24 September 2026): hold the bottom-left key of the keyboard on its own. That is fn/Globe on Apple keyboards and left Control on most others. Onboarding asks the employee to hold that key and binds whichever of the two they pressed, then has them try the flow. Hearing a lone modifier needs the macOS Input Monitoring permission (a listen-only `CGEventTap`, `CGRequestListenEventAccess`), asked for in onboarding right before the key is bound. An employee who declines gets the fallback shortcut ⌃⇧Space through KeyboardShortcuts, which needs no permission. UI copy always names the bound key ("Hold fn to flag", "Hold Control to flag", "Hold ⌃⇧Space to flag"), never a constant. ⌃⌥Space is dropped: it is a macOS input-source shortcut and the VoiceOver modifier.
- Service: Cloudflare Worker, Hono, `nodejs_compat`. Local dev on port 8787, strict; one API dev server, restarted from whichever worktree is active.
- Orchestration: Inngest TypeScript SDK v4 (latest, 4.21.0 at time of writing) on **Inngest Cloud**. Served at `/api/inngest` via `inngest/hono`. Event names `ft/{noun}.{verb}`. The instant answer never waits on Inngest; Inngest takes everything after it.
- Database: Neon Postgres 17, project `friction-telemetry` (id `soft-lake-93513452`, region `aws-eu-central-1` Frankfurt, the Neon region nearest the UAE; branches `main` for production and `dev` for local) in org `org-sparkling-dawn-02665417`, reached through Hyperdrive (config `friction-telemetry-prod`, id `8f08ea1a779445e486cece59c14a3178`, origin the `main` branch direct URL), Drizzle ORM, drizzle-kit migrations against the direct URL. pgvector plus Postgres full-text search hold document passages and Q&A. No Vectorize, no AI Search.
- Storage: R2 bucket `friction-telemetry-docs` (location hint WEUR, next to the database) for documents, screenshots, and clips.
- Cloudflare account: `Andres@onc9.com's Account` (`6feca0ab5e0326426aeebd95259f7613`). Never the `Stephena@mancap.com` account, which is a client's. Created 24 Sep 2026: the R2 bucket and the Hyperdrive config. Still to create in the dashboard: the Worker `friction-telemetry-api` connected to the GitHub repo.
- Auth: better-auth on the Worker (organization, SSO, SCIM plugins). Mac signs in through ASWebAuthenticationSession, refresh token in Keychain.
- Auth, superseding the `bearer` plugin above (2026-09-24, from 02-auth-workspace): the Mac is a public OAuth client of better-auth's OAuth provider (authorization code with PKCE); the Worker verifies JWT access tokens against a cached JWKS in `requireActor`. Refresh token in the legacy login keychain, so no provisioning profile is needed.
- Streaming: Server-Sent Events from `POST /v1/events` (flags and questions). Event types `meta`, `provisional`, `delta`, `citation`, `class`, `count`, `done`, `error`.
- Judgment: Jev via `@typesafe-ai/sdk`, one request per event with packed per-passage Nouls. Pin the model version once thresholds are tuned.
- Answer writing: Claude Haiku 4.5 through `@anthropic-ai/sdk` with `search_result` blocks and citations. The resolution class comes from Jev and code, never from Claude.
- Answer writing, superseding the SDK and key above (2026-09-25, from 06): Claude Haiku 4.5 through Cloudflare AI Gateway (gateway `default`, Unified Billing, no Anthropic key), called with the AI binding's `gateway().run()` and the native Messages API. No `@anthropic-ai/sdk` dependency. Needs AI Gateway credits on the onc9 Cloudflare account.
- Follow-ups (2026-09-25, from 06): any answer can be replied to. A reply is a Question with `inReplyTo`, in the same initiative, answered with its thread as context, and counted as its own signal.
- Embeddings: Workers AI `@cf/qwen/qwen3-embedding-0.6b`, 1024 dimensions.
- Contracts: Zod 4 schemas in `packages/contracts` are the single authority. Swift mirrors them as Codable types; both sides decode the same JSON fixtures in tests, so drift fails a test.
- Names: Core Concept names from `product.md` everywhere (types, tables, routes, UI copy). Flow numbers from the Flow Catalogue in route comments, spec names, and Linear issues.
- Notices (Q&A published, fix recorded) are pulled by the app and shown in the home window. No APNs.
- Worktrees: each spec after 01 builds on branch `iteration-1/{spec-id}` in its own git worktree, merges to `main` when its spec is done. Shell files are changed only additively.
- Secrets: local values from `~/.secrets` (onc9 account only, never `mystory.env`); production values in the Cloudflare dashboard. Inngest and Anthropic need onc9-owned keys; the existing ones in the store belong to the mystory account and must not be used.
- Deploy: push to `main`. Never `wrangler deploy`.
- Writing: no em dashes and no truncated text in any UI copy.

## Phases

| Spec | Name | Depends on | Status |
|---|---|---|---|
| 01-shell | Shell: app surfaces, contracts, schema, routes, Inngest, SSE stub | none | not started |
| 02-auth-workspace | Sign-in, organizations, SSO, people directory (flows 1, 2 sign-in) | 01-shell | not started |
| 03-permissions-onboarding | Permissions checklist, speech model download, buffer explanation (flow 2) | 01-shell | not started |
| 04-capture | Capture key, on-device transcription, screenshot, rolling buffer, review and redaction, outbox (flows 6 client, 12) | 01-shell | not started |
| 05-initiatives-documents | Create, edit, close initiatives; document upload and indexing (flows 3, 3a, 4, 5) | 01-shell, 02-auth-workspace | service built on `iteration-1/06-answer-pipeline`; Mac screens not started |
| 06-answer-pipeline | Jev, retrieval, cited answers over SSE; chat; follow-ups; still stuck (flows 7, 8, 9) | 04-capture, 05-initiatives-documents | service built on `iteration-1/06-answer-pipeline`; Mac client with the frontend engineer |
| 07-record-qa | My record and Q&A browsing (flows 10, 11) | 06-answer-pipeline | not started |
| 08-owner-loop | Owner answers and approves Q&A, corrects documents, records fixes, fix notices (flows 18 to 21) | 06-answer-pipeline | not started |
| 09-analysis | Clustering, thesis scoring, insights, Q&A drafting, health, insight review (flows 13 to 17) | 06-answer-pipeline | not started |

01 runs alone. Then 02, 03, and 04 run in parallel; 05 starts when 02 lands. 06 is the convergence point. 07 and 08 run in parallel after it. 09 is the following day. Phase 08 records fixes against seeded insight rows until 09 produces real ones.

Keys to have in `~/.secrets/master.env` before the phase that needs them: Inngest signing and event keys from an onc9 Inngest Cloud account (01), Cloudflare account access for R2, Hyperdrive, and Workers AI (01, 05), `TYPESAFE_API_KEY` (06, present), an onc9-owned `ANTHROPIC_API_KEY` (06, missing).

## Success Criteria

- [ ] After 01, a person can launch the signed app, see the pill over any app including full-screen ones without it taking focus, open every surface in the product's surface table, and watch a stubbed answer stream into an answer card from the local Worker.
- [x] After 01, the Inngest Cloud dashboard lists the `friction-telemetry` app synced from the deployed Worker, and a test event runs a function to completion there.
- [ ] Phases 02 to 08 each merge to `main` with no non-additive edit to shell files (`project.yml` dependencies, contract names, existing schema columns, the window model). Any exception is recorded in that spec's Engineering Notes.
- [ ] At the end of 08: a flag spoken on the Mac, reviewed and redacted, gets a cited answer and a resolution class within 5 seconds of Send against an initiative whose documents were uploaded through the initiative surface; an owner answer published to Q&A is returned for the same question on the next ask.

---

## Sessions

- 2026-09-24: Initial brief: foundation-first bet, shared stack decisions, nine-phase DAG · `claude -r cf097e99-94f3-4cce-9596-642e0c0c18b8`
- 2026-09-25: Claude through AI Gateway; threaded follow-ups; 05 and 06 service built (Devin session)
- 2026-09-24: Capture key decided (hold the bottom-left key through Input Monitoring, fallback ⌃⇧Space); 01 gains the build reference `01-shell.docs.md` and Granola layout from `osis/references/granola/`
