# Changelog

## 24 September 2026

- Opened iteration 1, Foundation (`core/iteration-1--foundation/brief.md`): shell first, then one worktree session per functionality; analysis seam in phase 09.
- Decided: Inngest TypeScript SDK v4 on Inngest Cloud; Neon with pgvector as the single store; better-auth; SSE for answers; macOS 26 minimum; one main window holding both surfaces.
- Flow 2 corrected: the capture key needs no permission, and screen recording is optional.
- Wrote specs 02 to 08. Reconciled across specs: `qa_entry_event` moves into the shell schema as the single who-asked link; 02's gate names (`requireActor`, `requireRole`) adopted everywhere; 06's read-only Sent to owner list links to 08's owner queue; Mac auth moved from the bearer plugin to better-auth's OAuth provider with PKCE.

## 23 September 2026

- Added the Flow Catalogue to `core/product.md`: 21 flows across setup, initiatives, flagging and asking, the analysis seam, and acting on insights. Document upload and indexing is flow 3a.
- Decided: every flag and question is signal regardless of class. An Answered event records that the employee did not know what the documents said.
- Decided: a fast judgment (Jev, TypeSafe) sorts each event into its initiative and predicts answerability while retrieval runs. An early "not covered" shows only when confident and is framed as provisional; per-passage judgments set the final class.
- Decided: Q&A is a new core concept. Aggregate and anonymous, canonical questions only, published on owner approval, searched alongside the documents.
- Decided: Inngest orchestrates the durable work (indexing, post-answer routing, analysis, notices). The instant answer runs in the Worker and does not wait on a queue.

## 22 September 2026

- Defined v1 in `core/product.md`: two surfaces in one macOS app (worker pill, initiative surface), eleven core concepts with Initiative as the spine, the flag loop, and the trust rules.
- Decided: macOS first for demos and first customers. A Windows client follows once contracts justify it.
- Decided: the tool never initiates and never captures silently. Screen history stays on the device until the employee sends it.
