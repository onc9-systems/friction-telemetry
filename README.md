# friction-telemetry

Friction telemetry for organizations in the middle of a change.

An employee presses a button when something breaks, says what happened, reviews the screen context, and sends it. Or they open the chat and ask about the initiative. Both get an answer from the initiative's documents, and both feed one signal pool. Leaders see which of their theses hold and which break. The people who flagged a problem hear when it gets fixed.

The product definition lives in [`osis/v1/core/product.md`](osis/v1/core/product.md).

## Layout

| Path | What |
|---|---|
| `apps/mac` | macOS app (Swift, SwiftUI): worker pill and initiative surface |
| `apps/api` | Service (Cloudflare Worker) |
| `packages/contracts` | Data contracts shared by the app and the service |
